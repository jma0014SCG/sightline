from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
from typing import Optional
import httpx
import re
import sys
import os
import asyncio
import logging

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models.responses import VideoInfo
from config import settings
from .gumloop_service import GumloopService
from .youtube_metadata_service import YouTubeMetadataService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YouTubeService:
    def __init__(self):
        self.client = httpx.AsyncClient()
        
        # Initialize Gumloop service if credentials are available (PRIMARY)
        self.gumloop_service = None
        if settings.gumloop_api_key and settings.gumloop_user_id and settings.gumloop_flow_id:
            logger.info("🔧 Gumloop credentials found, initializing service")
            self.gumloop_service = GumloopService(
                api_key=settings.gumloop_api_key,
                user_id=settings.gumloop_user_id,
                flow_id=settings.gumloop_flow_id
            )
        else:
            logger.warning("⚠️ Gumloop not configured - summarization may fail")
        
        # Initialize YouTube Metadata service
        self.metadata_service = YouTubeMetadataService()
        logger.info("🔧 YouTube Metadata service initialized")
    
    
    async def get_video_info(self, video_id: str) -> VideoInfo:
        """Get comprehensive video metadata using YouTubeMetadataService"""
        try:
            logger.info(f"🔄 Fetching video metadata for {video_id}")
            
            # Get comprehensive metadata using the new service
            metadata = await self.metadata_service.get_metadata(video_id)
            
            # Create VideoInfo object with comprehensive data
            return VideoInfo(
                video_id=video_id,
                title=metadata.get('title', 'Unknown Title'),
                channel_name=metadata.get('channel_name', 'Unknown Channel'),
                channel_id="",  # Not provided by current implementation
                duration=metadata.get('duration', 0),
                thumbnail_url=metadata.get('thumbnail_url'),
                published_at=metadata.get('upload_date'),  # Use upload_date as published_at
                description=metadata.get('description'),
                view_count=metadata.get('view_count'),
                like_count=metadata.get('like_count'),
                comment_count=metadata.get('comment_count'),
                upload_date=metadata.get('upload_date')
            )
            
        except Exception as e:
            logger.error(f"❌ Failed to get video metadata: {str(e)}")
            # Return minimal VideoInfo on error
            return VideoInfo(
                video_id=video_id,
                title="Unknown Title",
                channel_name="Unknown Channel", 
                channel_id="",
                duration=0,
                thumbnail_url=f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
            )
    
    async def get_transcript(self, video_id: str, language: str = "en") -> tuple[Optional[str], bool]:
        """Get transcript for a YouTube video using Gumloop
        
        Returns:
            Tuple of (transcript, is_gumloop) where is_gumloop indicates if content is from Gumloop
        """
        # Primary: Gumloop service (handles both transcript + summarization)
        if self.gumloop_service and self.gumloop_service.is_available():
            logger.info(f"🔄 Processing video {video_id} with Gumloop")
            try:
                video_url = f"https://www.youtube.com/watch?v={video_id}"
                transcript = await self.gumloop_service.get_transcript(video_url)
                if transcript:
                    logger.info(f"✅ Successfully retrieved content via Gumloop ({len(transcript)} characters)")
                    return transcript, True  # Return with Gumloop flag
            except Exception as e:
                logger.error(f"❌ Gumloop service failed: {str(e)}")
                # Fall through to simple fallback
        
        # Simple fallback: Basic YouTube transcript API (no complex retry chains)
        logger.info(f"🔄 Attempting simple YouTube transcript API for video {video_id}")
        try:
            # Single attempt with YouTube transcript API
            transcript_list = YouTubeTranscriptApi.get_transcript(
                video_id,
                languages=[language, "en", "en-US"]  # Simple language fallback
            )
            
            if transcript_list:
                # Combine all text
                full_transcript = " ".join([item["text"] for item in transcript_list])
                
                # Clean up the transcript
                full_transcript = self._clean_transcript(full_transcript)
                
                logger.info(f"✅ Retrieved transcript via YouTube API ({len(full_transcript)} characters)")
                return full_transcript, False  # Regular transcript, not from Gumloop
        except Exception as e:
            logger.error(f"❌ YouTube transcript API failed: {str(e)}")
        
        # No transcript available
        logger.error(f"❌ Unable to retrieve transcript for video {video_id}")
        return None, False
    
    async def get_video_data_parallel(self, video_id: str, language: str = "en") -> tuple[VideoInfo, tuple[Optional[str], bool]]:
        """
        Get video metadata and transcript in parallel for better performance
        
        Returns:
            Tuple of (VideoInfo, (transcript, is_gumloop))
        """
        logger.info(f"🔄 Starting parallel video data fetch for {video_id}")
        
        # Create tasks for parallel execution
        metadata_task = self.get_video_info(video_id)
        transcript_task = self.get_transcript(video_id, language)
        
        # Execute both tasks in parallel
        try:
            video_info, transcript_result = await asyncio.gather(
                metadata_task,
                transcript_task,
                return_exceptions=True
            )
            
            # Handle exceptions from either task
            if isinstance(video_info, Exception):
                logger.error(f"❌ Metadata fetch failed: {str(video_info)}")
                # Create minimal VideoInfo
                video_info = VideoInfo(
                    video_id=video_id,
                    title="Unknown Title",
                    channel_name="Unknown Channel",
                    channel_id="",
                    duration=0,
                    thumbnail_url=f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
                )
            
            if isinstance(transcript_result, Exception):
                logger.error(f"❌ Transcript fetch failed: {str(transcript_result)}")
                transcript_result = (None, False)
            
            logger.info(f"✅ Parallel video data fetch completed for {video_id}")
            return video_info, transcript_result
            
        except Exception as e:
            logger.error(f"❌ Parallel execution failed for {video_id}: {str(e)}")
            # Return fallback data
            video_info = VideoInfo(
                video_id=video_id,
                title="Unknown Title",
                channel_name="Unknown Channel",
                channel_id="",
                duration=0,
                thumbnail_url=f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
            )
            return video_info, (None, False)
    
    
    def _clean_transcript(self, text: str) -> str:
        """Clean up transcript text"""
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        # Remove music notations
        text = re.sub(r'\[Music\]', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\[Applause\]', '', text, flags=re.IGNORECASE)
        # Remove speaker labels if present
        text = re.sub(r'^[A-Z\s]+:', '', text, flags=re.MULTILINE)
        
        return text.strip()
    
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()