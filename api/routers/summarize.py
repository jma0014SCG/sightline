from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Request
from pydantic import BaseModel, HttpUrl
from typing import Optional
import re
import sys
import os
import uuid
# Add parent directory to path to find other modules
current_dir = os.path.dirname(__file__)
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from dependencies import get_current_user, User
from services.youtube_service import YouTubeService
from services.langchain_service import LangChainService
from services.gumloop_parser import is_gumloop_summary, parse_gumloop_summary, extract_key_points_from_gumloop
from services.progress_storage import progress_storage
from models.requests import SummarizeRequest
from models.responses import SummarizeResponse

router = APIRouter()
youtube_service = YouTubeService()
langchain_service = LangChainService()

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_video(
    request: SummarizeRequest,
    background_tasks: BackgroundTasks,
    http_request: Request,
    # current_user: User = Depends(get_current_user)  # Temporarily disabled for testing
):
    """Summarize a YouTube video"""
    # Generate task ID for progress tracking
    task_id = str(uuid.uuid4())
    
    # Get correlation ID from request if available
    cid = http_request.headers.get('x-correlation-id', task_id)
    
    try:
        # Initialize progress tracking
        await progress_storage.set_progress(task_id, {
            "progress": 5,
            "stage": "Initializing...",
            "status": "processing",
            "task_id": task_id,
            "cid": cid
        })
        
        # Extract video ID from URL
        video_id = extract_video_id(request.url)
        if not video_id:
            await progress_storage.set_progress(task_id, {
                "progress": 0,
                "stage": "Error: Invalid YouTube URL",
                "status": "error",
                "task_id": task_id,
                "cid": cid
            })
            raise HTTPException(status_code=400, detail="Invalid YouTube URL")
        
        # Update progress: Fetching video data
        await progress_storage.set_progress(task_id, {
            "progress": 25,
            "stage": "Fetching video data and transcript...",
            "status": "processing",
            "task_id": task_id,
            "cid": cid
        })
        
        # Get video metadata and transcript in parallel
        video_info, (transcript, is_gumloop) = await youtube_service.get_video_data_parallel(video_id)
        
        # Check video duration
        if video_info.duration > 7200:  # 2 hours
            raise HTTPException(
                status_code=400, 
                detail="Video is too long. Maximum duration is 2 hours."
            )
        
        if not transcript:
            raise HTTPException(
                status_code=400,
                detail="Could not retrieve transcript for this video"
            )
        
        # Initialize default values
        metadata = None
        key_moments = []
        frameworks = []
        debunked_assumptions = []
        in_practice = []
        playbooks = []
        insight_enrichment = None
        accelerated_learning_pack = None
        flashcards = []
        quiz_questions = []
        glossary = []
        tools = []
        resources = []
        
        # Update progress: Analyzing content
        await progress_storage.set_progress(task_id, {
            "progress": 60,
            "stage": "Analyzing content with AI...",
            "status": "processing",
            "task_id": task_id,
            "cid": cid
        })
        
        # Check if transcript is in Gumloop format
        if is_gumloop and is_gumloop_summary(transcript):
            # Parse Gumloop format
            gumloop_data = parse_gumloop_summary(transcript)
            
            if gumloop_data:
                # Use Gumloop data directly
                summary_content = gumloop_data.full_content
                key_points = extract_key_points_from_gumloop(gumloop_data)
                
                # Keep original YouTube API metadata for title and channel (accurate and clean)
                # Don't override with Gumloop data to avoid asterisks and incorrect channel names
                # if gumloop_data.title:
                #     video_info.title = gumloop_data.title
                # if gumloop_data.channel:
                #     video_info.channel_name = gumloop_data.channel
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
                from models.responses import SummaryMetadata, KeyMoment, Flashcard, QuizQuestion, GlossaryTerm, Framework, Playbook, InsightEnrichment, AcceleratedLearningPack, NovelIdeaMeter
                
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
                
                # Use simple markdown content for frameworks instead of complex parsing
                # The frontend will display the raw markdown content from sections
                frameworks = []
                
                debunked_assumptions = gumloop_data.debunked_assumptions
                in_practice = gumloop_data.in_practice
                
                # Use simple markdown content for playbooks instead of complex parsing
                # The frontend will display the raw markdown content from sections
                playbooks = []
                
                insight_enrichment = None
                if gumloop_data.insight_enrichment:
                    insight_enrichment = InsightEnrichment(
                        stats_tools_links=gumloop_data.insight_enrichment.stats_tools_links,
                        sentiment=gumloop_data.insight_enrichment.sentiment,
                        risks_blockers_questions=gumloop_data.insight_enrichment.risks_blockers_questions
                    )
                
                accelerated_learning_pack = None
                if gumloop_data.accelerated_learning_pack:
                    try:
                        # Safely handle glossary field which might be malformed
                        safe_glossary = []
                        if gumloop_data.accelerated_learning_pack.glossary:
                            for item in gumloop_data.accelerated_learning_pack.glossary:
                                if isinstance(item, dict) and "term" in item and "definition" in item:
                                    # Ensure both term and definition are strings
                                    term = str(item["term"]) if item["term"] is not None else ""
                                    definition = str(item["definition"]) if item["definition"] is not None else ""
                                    safe_glossary.append({"term": term, "definition": definition})
                        
                        # Safely handle flashcards
                        safe_flashcards = []
                        if gumloop_data.accelerated_learning_pack.feynman_flashcards:
                            for item in gumloop_data.accelerated_learning_pack.feynman_flashcards:
                                if isinstance(item, dict):
                                    # Handle different key formats
                                    question = item.get("q", item.get("question", ""))
                                    answer = item.get("a", item.get("answer", ""))
                                    if question and answer:
                                        safe_flashcards.append({"q": str(question), "a": str(answer)})
                        
                        # Safely handle quiz questions  
                        safe_quiz = []
                        if gumloop_data.accelerated_learning_pack.quick_quiz:
                            for item in gumloop_data.accelerated_learning_pack.quick_quiz:
                                if isinstance(item, dict):
                                    question = item.get("q", item.get("question", ""))
                                    answer = item.get("a", item.get("answer", ""))
                                    if question and answer:
                                        safe_quiz.append({"q": str(question), "a": str(answer)})
                        
                        accelerated_learning_pack = AcceleratedLearningPack(
                            tldr100=str(gumloop_data.accelerated_learning_pack.tldr100) if gumloop_data.accelerated_learning_pack.tldr100 else "",
                            feynman_flashcards=safe_flashcards,
                            glossary=safe_glossary,
                            quick_quiz=safe_quiz,
                            novel_idea_meter=[
                                NovelIdeaMeter(insight=idea.insight, score=idea.score)
                                for idea in gumloop_data.accelerated_learning_pack.novel_idea_meter
                            ]
                        )
                    except Exception as e:
                        # If accelerated learning pack creation fails, continue without it
                        print(f"Warning: Failed to create accelerated learning pack: {e}")
                        accelerated_learning_pack = None
                
                flashcards = []
                quiz_questions = []
                glossary = []
                if gumloop_data.accelerated_learning_pack:
                    flashcards = [
                        Flashcard(question=card["question"], answer=card["answer"])
                        for card in gumloop_data.accelerated_learning_pack.feynman_flashcards
                        if isinstance(card, dict) and "question" in card and "answer" in card
                    ]
                    
                    quiz_questions = [
                        QuizQuestion(question=q["question"], answer=q["answer"])
                        for q in gumloop_data.accelerated_learning_pack.quick_quiz
                        if isinstance(q, dict) and "question" in q and "answer" in q
                    ]
                    
                    glossary = []
                    if gumloop_data.accelerated_learning_pack.glossary:
                        for term in gumloop_data.accelerated_learning_pack.glossary:
                            if isinstance(term, dict) and "term" in term and "definition" in term:
                                # Ensure both term and definition are strings
                                term_str = str(term["term"]) if term["term"] is not None else ""
                                definition_str = str(term["definition"]) if term["definition"] is not None else ""
                                if term_str and definition_str:
                                    glossary.append(GlossaryTerm(term=term_str, definition=definition_str))
                
                # Extract legacy tools and resources for backward compatibility
                tools = []
                resources = []
                if gumloop_data.insight_enrichment:
                    tools = gumloop_data.insight_enrichment.stats_tools_links
            else:
                # Fallback to LangChain if Gumloop parsing fails
                summary = await langchain_service.summarize_transcript(
                    transcript=transcript,
                    video_title=video_info.title,
                    channel_name=video_info.channel_name
                )
                summary_content = summary.content
                key_points = summary.key_points
        else:
            # Use LangChain for regular transcripts
            summary = await langchain_service.summarize_transcript(
                transcript=transcript,
                video_title=video_info.title,
                channel_name=video_info.channel_name
            )
            summary_content = summary.content
            key_points = summary.key_points
        
        # Update progress: Complete
        await progress_storage.set_progress(task_id, {
            "progress": 100,
            "stage": "Summary ready!",
            "status": "completed",
            "task_id": task_id,
            "cid": cid
        })
        
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
            task_id=task_id,  # Include task ID for progress tracking
            # Enhanced YouTube metadata from YouTubeMetadataService
            description=video_info.description,
            view_count=video_info.view_count,
            like_count=video_info.like_count,
            comment_count=video_info.comment_count,
            upload_date=video_info.upload_date,
            metadata=metadata,
            key_moments=key_moments,
            frameworks=frameworks,
            debunked_assumptions=debunked_assumptions,
            in_practice=in_practice,
            playbooks=playbooks,
            insight_enrichment=insight_enrichment,
            accelerated_learning_pack=accelerated_learning_pack,
            flashcards=flashcards,
            quiz_questions=quiz_questions,
            tools=tools,
            resources=resources,
            glossary=glossary
        )
        
    except HTTPException as he:
        # Update progress with error state
        await progress_storage.set_progress(task_id, {
            "progress": 0,
            "stage": f"Error: {he.detail}",
            "status": "error",
            "task_id": task_id,
            "cid": cid
        })
        raise
    except Exception as e:
        # Update progress with error state
        await progress_storage.set_progress(task_id, {
            "progress": 0,
            "stage": f"Error: {str(e)}",
            "status": "error",
            "task_id": task_id,
            "cid": cid
        })
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/refresh-metadata")
async def refresh_metadata(
    request: dict,
    http_request: Request
):
    """Refresh YouTube metadata for an existing summary"""
    from datetime import datetime
    from services.youtube_metadata_service import YouTubeMetadataService
    
    video_id = request.get("video_id")
    
    if not video_id:
        raise HTTPException(status_code=400, detail="video_id is required")
    
    # Get correlation ID from request
    cid = http_request.headers.get('x-correlation-id', str(uuid.uuid4()))
    
    try:
        # Initialize metadata service
        metadata_service = YouTubeMetadataService()
        
        # Fetch fresh metadata
        metadata = await metadata_service.get_metadata(video_id)
        
        # Format response
        result = {
            "video_id": video_id,
            "title": metadata.get('title'),
            "description": metadata.get('description'),
            "channel_name": metadata.get('channel_name'),
            "view_count": metadata.get('view_count'),
            "like_count": metadata.get('like_count'),
            "comment_count": metadata.get('comment_count'),
            "upload_date": metadata.get('upload_date').isoformat() if metadata.get('upload_date') else None,
            "duration": metadata.get('duration'),
            "thumbnail_url": metadata.get('thumbnail_url'),
            "refreshed_at": datetime.now().isoformat(),
            "cid": cid
        }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to refresh metadata: {str(e)}")

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