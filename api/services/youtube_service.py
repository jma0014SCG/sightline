from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable
from typing import Optional, List, Dict
import httpx
import re
import sys
import os
import asyncio
import time
import logging
import random
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models.responses import VideoInfo
from config import settings
from .oxylabs_service import OxylabsService
from .youtube_transcript_service import YouTubeTranscriptService
from .ytdlp_service import YTDLPService
from .youtube_direct_service import YouTubeDirectService
from .transcript_fallback_service import TranscriptFallbackService
from .reliable_transcript_service import ReliableTranscriptService
from .gumloop_service import GumloopService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YouTubeService:
    def __init__(self):
        self.client = httpx.AsyncClient()
        self._setup_proxy_config()
        
        # Initialize Oxylabs service if credentials are available
        self.oxylabs_service = None
        self.transcript_service = None
        self.ytdlp_service = None
        if settings.oxylabs_username and settings.oxylabs_password:
            logger.info("🔧 Oxylabs credentials found, initializing services")
            self.oxylabs_service = OxylabsService(
                settings.oxylabs_username,
                settings.oxylabs_password
            )
            self.transcript_service = YouTubeTranscriptService(
                settings.oxylabs_username,
                settings.oxylabs_password
            )
            self.ytdlp_service = YTDLPService(
                settings.oxylabs_username,
                settings.oxylabs_password
            )
        
        # Always initialize fallback services
        self.direct_service = YouTubeDirectService()
        self.fallback_service = TranscriptFallbackService()
        self.reliable_service = ReliableTranscriptService(
            settings.oxylabs_username,
            settings.oxylabs_password
        )
        
        # Initialize Gumloop service if credentials are available
        self.gumloop_service = None
        if settings.gumloop_api_key and settings.gumloop_user_id and settings.gumloop_flow_id:
            logger.info("🔧 Gumloop credentials found, initializing service")
            self.gumloop_service = GumloopService(
                api_key=settings.gumloop_api_key,
                user_id=settings.gumloop_user_id,
                flow_id=settings.gumloop_flow_id
            )
        
        # Free proxy list for testing (these may not work consistently)
        self.free_proxies = [
            "socks5://127.0.0.1:9050",  # Tor proxy if available
            # Add more free proxies here as needed
        ]
        self.current_proxy_index = 0
    
    def _setup_proxy_config(self):
        """Set up proxy configuration for transcript API"""
        self.proxy_config = None
        
        if settings.proxy_enabled:
            if settings.proxy_type == "webshare" and settings.webshare_proxy_username and settings.webshare_proxy_password:
                logger.info("🔧 Configuring Webshare proxy")
                self.proxy_config = WebshareProxyConfig(
                    proxy_username=settings.webshare_proxy_username,
                    proxy_password=settings.webshare_proxy_password
                )
            elif settings.proxy_url:
                logger.info(f"🔧 Configuring custom proxy: {settings.proxy_type}")
                # For custom proxies, we'll use requests-style proxy dict
                self.proxy_dict = {
                    'http': settings.proxy_url,
                    'https': settings.proxy_url
                }
            else:
                logger.warning("⚠️ Proxy enabled but no valid configuration found")
        
        if not settings.proxy_enabled and settings.free_proxy_enabled:
            logger.info("🔧 Free proxy rotation enabled")
    
    async def get_video_info(self, video_id: str) -> VideoInfo:
        """Get video metadata from YouTube"""
        try:
            # Get basic info from oembed endpoint
            url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
            response = await self.client.get(url)
            
            if response.status_code != 200:
                raise Exception(f"Video not found or unavailable (status: {response.status_code})")
            
            data = response.json()
            
            # Extract channel info from author_name
            channel_name = data.get("author_name", "Unknown")
            
            # Get thumbnail - try different resolutions
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
            
            # We'll estimate duration from transcript timing
            duration = await self._estimate_duration_from_transcript(video_id)
            
            return VideoInfo(
                video_id=video_id,
                title=data.get("title", "Unknown Title"),
                channel_name=channel_name,
                channel_id="",  # Would need YouTube Data API for channel ID
                duration=duration,
                thumbnail_url=thumbnail_url
            )
            
        except Exception as e:
            raise Exception(f"Failed to get video info: {str(e)}")
    
    async def _estimate_duration_from_transcript(self, video_id: str) -> int:
        """Estimate video duration from transcript timestamps"""
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(
                video_id,
                languages=["en"]
            )
            
            if transcript_list:
                # Get the last timestamp + duration
                last_segment = transcript_list[-1]
                duration = int(last_segment.get('start', 0) + last_segment.get('duration', 0))
                return duration
            
            return 0
        except:
            # If we can't get transcript timing, return 0
            return 0
    
    async def get_transcript(self, video_id: str, language: str = "en") -> tuple[Optional[str], bool]:
        """Get transcript for a YouTube video with retry logic
        
        Returns:
            Tuple of (transcript, is_gumloop) where is_gumloop indicates if content is from Gumloop
        """
        # Try Gumloop service first as it's designed for this specific task
        if self.gumloop_service and self.gumloop_service.is_available():
            logger.info(f"🔄 Attempting Gumloop transcript extraction for video {video_id}")
            try:
                video_url = f"https://www.youtube.com/watch?v={video_id}"
                transcript = await self.gumloop_service.get_transcript(video_url)
                if transcript:
                    logger.info(f"✅ Successfully retrieved transcript via Gumloop ({len(transcript)} characters)")
                    return transcript, True  # Return with Gumloop flag
            except Exception as e:
                logger.warning(f"⚠️ Gumloop service failed: {str(e)}")
        
        # Use the reliable service second (handles direct + Oxylabs fallback)
        logger.info(f"🔄 Attempting reliable transcript extraction for video {video_id}")
        try:
            transcript = await self.reliable_service.get_transcript(video_id)
            if transcript:
                logger.info(f"✅ Successfully retrieved transcript via reliable service ({len(transcript)} characters)")
                return transcript, False
        except Exception as e:
            logger.warning(f"⚠️ Reliable service failed: {str(e)}")
        
        # Try yt-dlp if available (with proxy)
        if self.ytdlp_service:
            logger.info(f"🔄 Attempting to get transcript via yt-dlp for video {video_id}")
            try:
                transcript = await self.ytdlp_service.get_transcript(video_id)
                if transcript:
                    logger.info(f"✅ Successfully retrieved transcript via yt-dlp ({len(transcript)} characters)")
                    return transcript, False
            except Exception as e:
                logger.warning(f"⚠️ yt-dlp failed: {str(e)}")
        
        # Try direct transcript API if available
        if self.transcript_service:
            logger.info(f"🔄 Attempting to get transcript via direct API for video {video_id}")
            try:
                transcript = await self.transcript_service.get_transcript_direct(video_id)
                if transcript:
                    logger.info(f"✅ Successfully retrieved transcript via direct API ({len(transcript)} characters)")
                    return transcript, False
            except Exception as e:
                logger.warning(f"⚠️ Direct API failed: {str(e)}")
        
        # Try Oxylabs method if available
        if self.oxylabs_service:
            logger.info(f"🔄 Attempting to get transcript via Oxylabs for video {video_id}")
            oxylabs_transcript = await self._get_transcript_via_oxylabs(video_id)
            if oxylabs_transcript:
                return oxylabs_transcript, False
            logger.warning(f"⚠️ Oxylabs failed, falling back to regular methods")
        
        max_retries = 3
        retry_delays = [1, 3, 7]  # Exponential backoff
        
        for attempt in range(max_retries):
            try:
                logger.info(f"🔄 Attempting to get transcript for video {video_id} (attempt {attempt + 1}/{max_retries})")
                
                # Get transcript with multiple language fallbacks
                transcript_list = await self._fetch_transcript_with_fallbacks(video_id, language)
                
                if transcript_list:
                    # Combine all text
                    full_transcript = " ".join([item["text"] for item in transcript_list])
                    
                    # Clean up the transcript
                    full_transcript = self._clean_transcript(full_transcript)
                    
                    logger.info(f"✅ Successfully retrieved transcript for {video_id} ({len(full_transcript)} characters)")
                    return full_transcript, False
                
            except (TranscriptsDisabled, NoTranscriptFound) as e:
                logger.warning(f"⚠️ No transcript available for {video_id}: {type(e).__name__}")
                # Try Whisper fallback for videos without captions
                logger.info(f"🔄 Attempting Whisper fallback for {video_id}...")
                whisper_transcript = await self._get_whisper_transcript(video_id)
                return whisper_transcript, False
                
            except VideoUnavailable as e:
                logger.error(f"❌ Video {video_id} is unavailable: {str(e)}")
                return None, False
                
            except Exception as e:
                error_msg = str(e)
                logger.error(f"❌ Error getting transcript for {video_id} (attempt {attempt + 1}): {error_msg}")
                
                # Handle rate limiting
                if "too many requests" in error_msg.lower() or "429" in error_msg:
                    logger.warning(f"⚠️ Rate limited for video {video_id}, attempt {attempt + 1}/{max_retries}")
                    if attempt < max_retries - 1:
                        delay = retry_delays[attempt] * (1.5 ** attempt)
                        logger.info(f"⏳ Waiting {delay:.1f}s before retry...")
                        await asyncio.sleep(delay)
                        continue
                    else:
                        logger.error(f"❌ Rate limit exceeded for {video_id} after {max_retries} attempts")
                        return None, False
                
                # Check for other specific error patterns
                if "no element found" in error_msg.lower():
                    logger.info(f"🔍 Detected XML parsing error, likely IP blocking or rate limiting")
                    if attempt < max_retries - 1:
                        delay = retry_delays[attempt] * 2  # Longer delay for IP issues
                        logger.info(f"⏳ Waiting {delay}s before retry...")
                        await asyncio.sleep(delay)
                        continue
                
                if attempt == max_retries - 1:
                    logger.error(f"❌ Failed to get transcript for {video_id} after {max_retries} attempts")
                    # Try Oxylabs as final fallback
                    if self.oxylabs_service:
                        logger.info(f"🔄 Attempting Oxylabs fallback for {video_id}...")
                        oxylabs_transcript = await self._get_transcript_via_oxylabs(video_id)
                        if oxylabs_transcript:
                            return oxylabs_transcript, False
                    raise Exception(f"Failed to get transcript after {max_retries} attempts: {error_msg}")
        
        return None, False
    
    async def _get_transcript_via_oxylabs(self, video_id: str) -> Optional[str]:
        """Get transcript using Oxylabs proxy service"""
        try:
            # Fetch YouTube page via Oxylabs
            html_content = await self.oxylabs_service.fetch_youtube_page(video_id)
            if not html_content:
                logger.error(f"❌ Failed to fetch YouTube page via Oxylabs")
                return None
            
            # Extract captions data from page
            captions_data = self.oxylabs_service.extract_captions_data(html_content)
            if not captions_data:
                logger.error(f"❌ No captions data found in YouTube page")
                return None
            
            # Find English caption track
            caption_tracks = captions_data.get('captionTracks', [])
            english_track = None
            
            for track in caption_tracks:
                if track.get('languageCode', '').startswith('en'):
                    english_track = track
                    break
            
            # Fallback to first available track
            if not english_track and caption_tracks:
                english_track = caption_tracks[0]
                logger.warning(f"⚠️ No English track found, using {english_track.get('languageCode', 'unknown')} instead")
            
            if not english_track:
                logger.error(f"❌ No caption tracks available")
                return None
            
            # Get the caption URL
            caption_url = english_track.get('baseUrl')
            if not caption_url:
                logger.error(f"❌ No caption URL found")
                return None
            
            # Fetch transcript from caption URL
            transcript = await self.oxylabs_service.fetch_transcript_from_url(caption_url)
            if transcript:
                logger.info(f"✅ Successfully retrieved transcript via Oxylabs ({len(transcript)} characters)")
                return transcript
            else:
                logger.error(f"❌ Failed to fetch transcript from caption URL")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error in Oxylabs transcript fetch: {str(e)}")
            return None

    async def _fetch_transcript_with_fallbacks(self, video_id: str, preferred_language: str = "en"):
        """Fetch transcript with multiple language fallbacks and proxy rotation"""
        # Language priority order
        languages_to_try = [
            [preferred_language],  # User's preferred language
            ["en"],  # English fallback
            ["en-US", "en-GB"],  # English variants
            None  # Let API choose any available language
        ]
        
        # Try different proxy configurations
        proxy_attempts = [
            ("no_proxy", None),  # Try without proxy first
            ("oxylabs", "oxylabs"),  # Try Oxylabs early if available
            ("webshare", self.proxy_config),  # Try with Webshare if configured
            ("custom", getattr(self, 'proxy_dict', None)),  # Try with custom proxy
        ]
        
        last_error = None
        
        for proxy_name, proxy_config in proxy_attempts:
            if proxy_name == "webshare" and not proxy_config:
                continue
            if proxy_name == "custom" and not proxy_config:
                continue
            if proxy_name == "oxylabs" and self.oxylabs_service:
                # Try Oxylabs directly
                logger.info(f"🔄 Trying Oxylabs proxy for video {video_id}")
                oxylabs_transcript = await self._get_transcript_via_oxylabs(video_id)
                if oxylabs_transcript:
                    return oxylabs_transcript
                else:
                    continue
            elif proxy_name == "oxylabs":
                continue
                
            logger.info(f"🔄 Trying transcript fetch with {proxy_name} proxy for video {video_id}")
            
            for languages in languages_to_try:
                try:
                    if languages:
                        logger.info(f"🌐 Trying languages: {languages}")
                        if proxy_name == "webshare" and proxy_config:
                            # Use Webshare proxy
                            api = YouTubeTranscriptApi(proxy_config=proxy_config)
                            return api.get_transcript(video_id, languages=languages)
                        elif proxy_name == "custom" and proxy_config:
                            # Use custom proxy - note: youtube-transcript-api doesn't directly support custom proxies
                            # We'll need to implement this differently
                            logger.warning(f"⚠️ Custom proxy support not fully implemented in youtube-transcript-api")
                            return YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
                        else:
                            # No proxy
                            return YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
                    else:
                        logger.info(f"🌐 Trying any available language")
                        if proxy_name == "webshare" and proxy_config:
                            api = YouTubeTranscriptApi(proxy_config=proxy_config)
                            transcript_list = api.list_transcripts(video_id)
                        else:
                            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                        # Get the first available transcript
                        for transcript in transcript_list:
                            return transcript.fetch()
                            
                except (TranscriptsDisabled, NoTranscriptFound) as e:
                    last_error = e
                    continue
                except Exception as e:
                    last_error = e
                    error_msg = str(e)
                    if "no element found" in error_msg.lower():
                        logger.warning(f"⚠️ IP blocking detected with {proxy_name} proxy")
                        # Try next proxy configuration
                        break
                    continue
        
        # If we get here, no transcript was found with any configuration
        if last_error:
            raise last_error
        else:
            raise NoTranscriptFound(video_id)
    
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
    
    async def _get_whisper_transcript(self, video_id: str) -> Optional[str]:
        """Get transcript using Whisper API as fallback"""
        try:
            import openai
            from config import settings
            
            # Note: This is a simplified implementation
            # In production, you'd need to:
            # 1. Download the YouTube audio (using yt-dlp or similar)
            # 2. Convert to appropriate format
            # 3. Send to Whisper API
            # 4. Handle file size limits and chunking
            
            # For now, we'll return None to indicate Whisper isn't implemented
            # This prevents errors while keeping the structure for future implementation
            print(f"🔄 Whisper fallback not yet implemented for video {video_id}")
            print("📝 Note: To implement Whisper fallback, add yt-dlp and audio processing")
            
            return None
            
        except Exception as e:
            print(f"❌ Whisper fallback failed: {str(e)}")
            return None
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()