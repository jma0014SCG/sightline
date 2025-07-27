import yt_dlp
import logging
from typing import Optional, Dict, Any
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class YTDLPService:
    """YouTube transcript service using yt-dlp with proxy support"""
    
    def __init__(self, oxylabs_username: str = None, oxylabs_password: str = None):
        self.oxylabs_username = oxylabs_username
        self.oxylabs_password = oxylabs_password
        self.executor = ThreadPoolExecutor(max_workers=1)
        
        # Configure yt-dlp options
        self.ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-GB'],
            'subtitlesformat': 'json3',
            'retries': 3,
            'fragment_retries': 3,
            'retry_sleep_functions': {'http': lambda x: 2 ** x},
        }
        
        # Add proxy if available
        if oxylabs_username and oxylabs_password:
            # Use datacenter proxy endpoint which works better with yt-dlp
            proxy_url = f"http://{oxylabs_username}:{oxylabs_password}@pr.oxylabs.io:7777"
            self.ydl_opts['proxy'] = proxy_url
            logger.info(f"🔧 Configured yt-dlp with Oxylabs datacenter proxy")
    
    async def get_video_info(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Get video information including available subtitles"""
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        def _extract():
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=False)
                    return info
                except Exception as e:
                    logger.error(f"Error extracting video info: {str(e)}")
                    return None
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, _extract)
    
    async def get_transcript(self, video_id: str) -> Optional[str]:
        """Get transcript for a video"""
        try:
            logger.info(f"🔄 Attempting to get transcript via yt-dlp for video {video_id}")
            
            # Get video info
            info = await self.get_video_info(video_id)
            if not info:
                logger.error("Failed to get video info")
                return None
            
            # Check for subtitles
            subtitles = info.get('subtitles', {})
            automatic_captions = info.get('automatic_captions', {})
            
            # Try to find English subtitles
            transcript_data = None
            
            # Check manual subtitles first
            for lang in ['en', 'en-US', 'en-GB']:
                if lang in subtitles:
                    logger.info(f"✅ Found manual subtitles in {lang}")
                    transcript_data = await self._download_subtitle(video_id, lang, False)
                    if transcript_data:
                        break
            
            # Fall back to automatic captions
            if not transcript_data:
                for lang in ['en', 'en-US', 'en-GB']:
                    if lang in automatic_captions:
                        logger.info(f"✅ Found automatic captions in {lang}")
                        transcript_data = await self._download_subtitle(video_id, lang, True)
                        if transcript_data:
                            break
            
            if not transcript_data:
                logger.error("No English subtitles or captions found")
                return None
            
            # Extract text from transcript data
            transcript_text = self._extract_text_from_transcript(transcript_data)
            if transcript_text:
                logger.info(f"✅ Successfully extracted transcript ({len(transcript_text)} characters)")
                return transcript_text
            else:
                logger.error("Failed to extract text from transcript")
                return None
                
        except Exception as e:
            logger.error(f"Error getting transcript: {str(e)}")
            return None
    
    async def _download_subtitle(self, video_id: str, language: str, auto: bool) -> Optional[str]:
        """Download subtitle file"""
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        opts = self.ydl_opts.copy()
        opts['writesubtitles'] = not auto
        opts['writeautomaticsub'] = auto
        opts['subtitleslangs'] = [language]
        opts['skip_download'] = True
        
        # Use proxy if configured
        if self.oxylabs_username and self.oxylabs_password:
            proxy_url = f"http://{self.oxylabs_username}:{self.oxylabs_password}@pr.oxylabs.io:7777"
            opts['proxy'] = proxy_url
        
        def _download():
            with yt_dlp.YoutubeDL(opts) as ydl:
                try:
                    # Extract info and get subtitle URL
                    info = ydl.extract_info(url, download=False)
                    
                    if auto:
                        caps = info.get('automatic_captions', {})
                    else:
                        caps = info.get('subtitles', {})
                    
                    if language in caps:
                        for fmt in caps[language]:
                            if fmt.get('ext') == 'json3':
                                sub_url = fmt.get('url')
                                if sub_url:
                                    # Download the subtitle content
                                    import urllib.request
                                    if 'proxy' in opts:
                                        proxy_handler = urllib.request.ProxyHandler({'http': opts['proxy'], 'https': opts['proxy']})
                                        opener = urllib.request.build_opener(proxy_handler)
                                        urllib.request.install_opener(opener)
                                    
                                    with urllib.request.urlopen(sub_url) as response:
                                        return response.read().decode('utf-8')
                    
                    return None
                except Exception as e:
                    logger.error(f"Error downloading subtitle: {str(e)}")
                    return None
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, _download)
    
    def _extract_text_from_transcript(self, transcript_data: str) -> Optional[str]:
        """Extract text from transcript JSON data"""
        try:
            import json
            data = json.loads(transcript_data)
            
            texts = []
            if 'events' in data:
                for event in data['events']:
                    if 'segs' in event:
                        for seg in event['segs']:
                            if 'utf8' in seg:
                                texts.append(seg['utf8'])
            
            return ' '.join(texts).strip()
        except Exception as e:
            logger.error(f"Error extracting text: {str(e)}")
            return None