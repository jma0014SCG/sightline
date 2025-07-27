from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import Optional
import re
import sys
import os
# Add parent directory to path to find other modules
current_dir = os.path.dirname(__file__)
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from dependencies import get_current_user, User
from services.youtube_service import YouTubeService
from services.langchain_service import LangChainService
from services.gumloop_parser import is_gumloop_summary, parse_gumloop_summary, extract_key_points_from_gumloop
from models.requests import SummarizeRequest
from models.responses import SummarizeResponse

router = APIRouter()
youtube_service = YouTubeService()
langchain_service = LangChainService()

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_video(
    request: SummarizeRequest,
    background_tasks: BackgroundTasks,
    # current_user: User = Depends(get_current_user)  # Temporarily disabled for testing
):
    """Summarize a YouTube video"""
    try:
        # Extract video ID from URL
        video_id = extract_video_id(request.url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        
        # Get video metadata
        video_info = await youtube_service.get_video_info(video_id)
        
        # Check video duration
        if video_info.duration > 7200:  # 2 hours
            raise HTTPException(
                status_code=400, 
                detail="Video is too long. Maximum duration is 2 hours."
            )
        
        # Get transcript
        transcript, is_gumloop = await youtube_service.get_transcript(video_id)
        if not transcript:
            raise HTTPException(
                status_code=400,
                detail="Could not retrieve transcript for this video"
            )
        
        # Initialize default values
        metadata = None
        key_moments = []
        flashcards = []
        quiz_questions = []
        glossary = []
        tools = []
        resources = []
        
        # Check if this is a Gumloop-formatted summary
        if is_gumloop or is_gumloop_summary(transcript):
            # Parse Gumloop format directly
            gumloop_data = parse_gumloop_summary(transcript)
            
            if gumloop_data:
                # Use Gumloop data directly
                summary_content = gumloop_data.full_content
                key_points = extract_key_points_from_gumloop(gumloop_data)
                
                # Update video info with Gumloop metadata if available
                if gumloop_data.title:
                    video_info.title = gumloop_data.title
                if gumloop_data.channel:
                    video_info.channel_name = gumloop_data.channel
                if gumloop_data.duration:
                    # Parse duration from format like "HH:MM:SS" to seconds
                    try:
                        parts = gumloop_data.duration.split(':')
                        if len(parts) == 3:
                            hours, minutes, seconds = map(int, parts)
                            video_info.duration = hours * 3600 + minutes * 60 + seconds
                        elif len(parts) == 2:
                            minutes, seconds = map(int, parts)
                            video_info.duration = minutes * 60 + seconds
                    except:
                        pass  # Keep original duration if parsing fails
                
                # Prepare structured data for frontend
                from models.responses import SummaryMetadata, KeyMoment, Flashcard, QuizQuestion, GlossaryTerm
                
                metadata = SummaryMetadata(
                    title=gumloop_data.title,
                    channel=gumloop_data.channel,
                    duration=gumloop_data.duration,
                    speakers=gumloop_data.speakers,
                    synopsis=gumloop_data.synopsis,
                    tone="informative"  # Default tone
                )
                
                key_moments = [
                    KeyMoment(timestamp=moment.timestamp, insight=moment.insight)
                    for moment in gumloop_data.key_moments
                ]
                
                flashcards = [
                    Flashcard(question=card["question"], answer=card["answer"])
                    for card in gumloop_data.flashcards
                ]
                
                quiz_questions = [
                    QuizQuestion(question=q["question"], answer=q["answer"])
                    for q in gumloop_data.quiz_questions
                ]
                
                glossary = [
                    GlossaryTerm(term=term["term"], definition=term["definition"])
                    for term in gumloop_data.glossary
                ]
                
                tools = gumloop_data.tools
                resources = gumloop_data.resources
            else:
                # Fallback: use LangChain if Gumloop parsing fails
                summary = await langchain_service.summarize_transcript(
                    transcript=transcript,
                    video_title=video_info.title,
                    channel_name=video_info.channel_name
                )
                summary_content = summary.content
                key_points = summary.key_points
        else:
            # Use LangChain for raw transcripts
            summary = await langchain_service.summarize_transcript(
                transcript=transcript,
                video_title=video_info.title,
                channel_name=video_info.channel_name
            )
            summary_content = summary.content
            key_points = summary.key_points
        
        # TODO: Save to database in background
        # background_tasks.add_task(save_summary_to_db, ...)
        
        return SummarizeResponse(
            video_id=video_id,
            video_url=request.url,
            video_title=video_info.title,
            channel_name=video_info.channel_name,
            channel_id=video_info.channel_id,
            duration=video_info.duration,
            thumbnail_url=video_info.thumbnail_url,
            summary=summary_content,
            key_points=key_points,
            user_id="test-user",  # Temporarily using test user ID
            metadata=metadata,
            key_moments=key_moments,
            flashcards=flashcards,
            quiz_questions=quiz_questions,
            tools=tools,
            resources=resources,
            glossary=glossary
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def extract_video_id(url: str) -> Optional[str]:
    """Extract video ID from YouTube URL"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None