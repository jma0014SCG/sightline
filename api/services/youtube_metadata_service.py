import logging
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio
from concurrent.futures import ThreadPoolExecutor

# YouTube Data API v3
try:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
    YOUTUBE_API_AVAILABLE = True
except ImportError:
    YOUTUBE_API_AVAILABLE = False

# yt-dlp for fallback
try:
    import yt_dlp
    YTDLP_AVAILABLE = True
except ImportError:
    YTDLP_AVAILABLE = False

# Cache support
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from config import settings

logger = logging.getLogger(__name__)

class YouTubeMetadataService:
    """Service for fetching comprehensive YouTube video metadata"""
    
    def __init__(self):
        self.youtube_api_key = settings.youtube_api_key
        self.youtube_client = None
        self.cache = {}  # In-memory cache fallback
        self.cache_ttl = settings.summary_cache_ttl if hasattr(settings, 'summary_cache_ttl') else 86400  # 24 hours
        self.executor = ThreadPoolExecutor(max_workers=1)
        
        # Initialize YouTube Data API client if available
        if YOUTUBE_API_AVAILABLE and self.youtube_api_key:
            try:
                self.youtube_client = build('youtube', 'v3', developerKey=self.youtube_api_key)
                logger.info("✅ YouTube Data API v3 client initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize YouTube Data API client: {str(e)}")
                self.youtube_client = None
        else:
            if not YOUTUBE_API_AVAILABLE:
                logger.warning("⚠️ google-api-python-client not installed")
            if not self.youtube_api_key:
                logger.warning("⚠️ YouTube API key not configured")
        
        # Initialize Redis cache if available
        self.redis_client = None
        if REDIS_AVAILABLE and settings.upstash_redis_rest_url:
            try:
                self.redis_client = redis.from_url(settings.upstash_redis_rest_url)
                logger.info("✅ Redis cache initialized for metadata")
            except Exception as e:
                logger.warning(f"⚠️ Redis initialization failed, using in-memory cache: {str(e)}")
        
        # Configure yt-dlp options with better error handling
        self.ydl_opts = {
            'quiet': True,
            'no_warnings': False,  # Enable warnings to see issues
            'extract_flat': False,
            'skip_download': True,
            'retries': 5,  # Increase retries
            'fragment_retries': 5,
            'ignoreerrors': False,
            'no_check_certificate': True,  # Skip certificate verification for reliability
            'prefer_insecure': True,  # Use HTTP if HTTPS fails
            'geo_bypass': True,  # Bypass geographic restrictions
            'nocheckcertificate': True,
        }
    
    async def get_metadata(self, video_id: str) -> Dict[str, Any]:
        """
        Get comprehensive video metadata with caching
        
        Returns normalized metadata dictionary with fields:
        - title
        - description
        - channel_name
        - view_count
        - like_count
        - comment_count
        - upload_date
        - duration
        - thumbnail_url
        """
        # Check cache first
        cached_data = await self._get_from_cache(video_id)
        if cached_data:
            logger.info(f"✅ Metadata cache hit for video {video_id}")
            return cached_data
        
        metadata = None
        
        # TEMPORARY FIX: Try yt-dlp first since YouTube API key is invalid
        # yt-dlp doesn't require an API key and is more reliable
        if YTDLP_AVAILABLE:
            try:
                logger.info(f"🔄 Fetching metadata via yt-dlp for {video_id}")
                metadata = await self._fetch_via_ytdlp(video_id)
                if metadata:
                    logger.info(f"✅ Successfully fetched metadata via yt-dlp")
            except Exception as e:
                logger.warning(f"⚠️ yt-dlp failed: {str(e)}")
        
        # Fallback to YouTube Data API (currently broken due to invalid API key)
        if not metadata and self.youtube_client:
            try:
                logger.info(f"🔄 Attempting YouTube Data API for {video_id} (may fail due to invalid key)")
                metadata = await self._fetch_via_youtube_api(video_id)
                if metadata:
                    logger.info(f"✅ Successfully fetched metadata via YouTube Data API")
            except Exception as e:
                logger.warning(f"⚠️ YouTube Data API failed (expected): {str(e)}")
        
        # If we got metadata, cache it
        if metadata:
            await self._set_cache(video_id, metadata)
            return metadata
        
        # Return minimal metadata if all methods fail
        logger.error(f"❌ All metadata fetch methods failed for {video_id}")
        return {
            'title': 'Unknown Title',
            'description': '',
            'channel_name': 'Unknown Channel',
            'view_count': 0,
            'like_count': 0,
            'comment_count': 0,
            'upload_date': None,
            'duration': 0,
            'thumbnail_url': f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
        }
    
    async def _fetch_via_youtube_api(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Fetch metadata using YouTube Data API v3"""
        if not self.youtube_client:
            return None
        
        def _api_call():
            try:
                response = self.youtube_client.videos().list(
                    part='snippet,statistics,contentDetails',
                    id=video_id,
                    fields='items(id,snippet(title,description,channelTitle,publishedAt,thumbnails),statistics(viewCount,likeCount,commentCount),contentDetails(duration))'
                ).execute()
                
                if not response.get('items'):
                    return None
                
                item = response['items'][0]
                snippet = item.get('snippet', {})
                statistics = item.get('statistics', {})
                content_details = item.get('contentDetails', {})
                
                # Parse duration from ISO 8601 format (PT15M33S)
                duration = self._parse_iso8601_duration(content_details.get('duration', 'PT0S'))
                
                # Parse upload date
                upload_date = None
                if snippet.get('publishedAt'):
                    try:
                        upload_date = datetime.fromisoformat(snippet['publishedAt'].replace('Z', '+00:00'))
                    except:
                        pass
                
                # Get best thumbnail
                thumbnails = snippet.get('thumbnails', {})
                thumbnail_url = (
                    thumbnails.get('maxres', {}).get('url') or
                    thumbnails.get('high', {}).get('url') or
                    thumbnails.get('medium', {}).get('url') or
                    thumbnails.get('default', {}).get('url') or
                    f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
                )
                
                return {
                    'title': snippet.get('title', 'Unknown Title'),
                    'description': snippet.get('description', ''),
                    'channel_name': snippet.get('channelTitle', 'Unknown Channel'),
                    'view_count': int(statistics.get('viewCount', 0)),
                    'like_count': int(statistics.get('likeCount', 0)),
                    'comment_count': int(statistics.get('commentCount', 0)),
                    'upload_date': upload_date,
                    'duration': duration,
                    'thumbnail_url': thumbnail_url
                }
            except HttpError as e:
                if e.resp.status == 403:
                    logger.error(f"❌ YouTube API quota exceeded or API key invalid")
                    logger.error(f"   Details: {e.error_details if hasattr(e, 'error_details') else 'No details'}")
                elif e.resp.status == 400:
                    logger.error(f"❌ YouTube API key is invalid or not configured properly")
                    logger.error(f"   Error: {str(e)}")
                    logger.error(f"   Solution: Get a new API key from Google Cloud Console")
                else:
                    logger.error(f"❌ YouTube API error: {str(e)}")
                return None
            except Exception as e:
                logger.error(f"❌ Unexpected error in YouTube API: {str(e)}")
                return None
        
        # Run API call in executor to avoid blocking
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, _api_call)
    
    async def _fetch_via_ytdlp(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Fetch metadata using yt-dlp as fallback"""
        if not YTDLP_AVAILABLE:
            return None
        
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        def _extract():
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                try:
                    info = ydl.extract_info(url, download=False)
                    
                    # Parse upload date
                    upload_date = None
                    if info.get('upload_date'):
                        try:
                            # yt-dlp returns date as YYYYMMDD string
                            date_str = info['upload_date']
                            upload_date = datetime.strptime(date_str, '%Y%m%d')
                        except:
                            pass
                    elif info.get('timestamp'):
                        try:
                            upload_date = datetime.fromtimestamp(info['timestamp'])
                        except:
                            pass
                    
                    # Get best thumbnail
                    thumbnail_url = info.get('thumbnail')
                    if not thumbnail_url and info.get('thumbnails'):
                        # Sort thumbnails by preference (height)
                        thumbnails = sorted(
                            info['thumbnails'],
                            key=lambda x: x.get('height', 0) or 0,
                            reverse=True
                        )
                        if thumbnails:
                            thumbnail_url = thumbnails[0].get('url')
                    
                    if not thumbnail_url:
                        thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
                    
                    return {
                        'title': info.get('title', 'Unknown Title'),
                        'description': info.get('description', ''),
                        'channel_name': info.get('uploader', info.get('channel', 'Unknown Channel')),
                        'view_count': info.get('view_count', 0) or 0,
                        'like_count': info.get('like_count', 0) or 0,
                        'comment_count': info.get('comment_count', 0) or 0,
                        'upload_date': upload_date,
                        'duration': info.get('duration', 0) or 0,
                        'thumbnail_url': thumbnail_url
                    }
                except Exception as e:
                    logger.error(f"❌ yt-dlp extraction failed: {str(e)}")
                    return None
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, _extract)
    
    def _parse_iso8601_duration(self, duration_str: str) -> int:
        """Parse ISO 8601 duration (PT15M33S) to seconds"""
        import re
        
        if not duration_str:
            return 0
        
        # Match pattern like PT1H23M45S
        pattern = re.compile(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?')
        match = pattern.match(duration_str)
        
        if not match:
            return 0
        
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        
        return hours * 3600 + minutes * 60 + seconds
    
    async def _get_from_cache(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Get metadata from cache"""
        cache_key = f"youtube:metadata:{video_id}"
        
        # Try Redis first
        if self.redis_client:
            try:
                data = self.redis_client.get(cache_key)
                if data:
                    return json.loads(data)
            except Exception as e:
                logger.warning(f"⚠️ Redis cache read failed: {str(e)}")
        
        # Fallback to in-memory cache
        if cache_key in self.cache:
            cached_item = self.cache[cache_key]
            if cached_item['expires'] > datetime.now():
                return cached_item['data']
            else:
                # Remove expired item
                del self.cache[cache_key]
        
        return None
    
    async def _set_cache(self, video_id: str, data: Dict[str, Any]):
        """Set metadata in cache"""
        cache_key = f"youtube:metadata:{video_id}"
        
        # Serialize datetime objects for JSON
        cache_data = data.copy()
        if cache_data.get('upload_date') and isinstance(cache_data['upload_date'], datetime):
            cache_data['upload_date'] = cache_data['upload_date'].isoformat()
        
        # Try Redis first
        if self.redis_client:
            try:
                self.redis_client.setex(
                    cache_key,
                    self.cache_ttl,
                    json.dumps(cache_data)
                )
                logger.debug(f"✅ Cached metadata in Redis for {video_id}")
            except Exception as e:
                logger.warning(f"⚠️ Redis cache write failed: {str(e)}")
        
        # Always set in-memory cache as backup
        self.cache[cache_key] = {
            'data': data,
            'expires': datetime.now() + timedelta(seconds=self.cache_ttl)
        }
        logger.debug(f"✅ Cached metadata in memory for {video_id}")