import httpx
import re
import json
import logging
from typing import Optional
import asyncio

logger = logging.getLogger(__name__)

class ReliableTranscriptService:
    """Reliable transcript service using Oxylabs when needed"""
    
    def __init__(self, oxylabs_username: str = None, oxylabs_password: str = None):
        self.oxylabs_username = oxylabs_username
        self.oxylabs_password = oxylabs_password
        
    async def get_transcript(self, video_id: str) -> Optional[str]:
        """Get transcript using the most reliable method available"""
        
        # Method 1: Try direct access first (fastest)
        transcript = await self._try_direct_access(video_id)
        if transcript:
            return transcript
        
        # Method 2: Use Oxylabs if available
        if self.oxylabs_username and self.oxylabs_password:
            transcript = await self._try_with_oxylabs(video_id)
            if transcript:
                return transcript
        
        logger.error(f"All transcript methods failed for video {video_id}")
        return None
    
    async def _try_direct_access(self, video_id: str) -> Optional[str]:
        """Try direct access without proxy"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Try the direct timedtext API
                urls = [
                    f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en&fmt=json3",
                    f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en-US&fmt=json3",
                    f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en&fmt=srv3&kind=asr",
                ]
                
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9',
                }
                
                for url in urls:
                    try:
                        response = await client.get(url, headers=headers)
                        if response.status_code == 200:
                            content = response.text
                            transcript = self._parse_transcript_content(content)
                            if transcript and len(transcript) > 100:
                                logger.info(f"✅ Direct access successful: {len(transcript)} chars")
                                return transcript
                    except Exception as e:
                        logger.debug(f"Direct URL failed: {url} - {str(e)}")
                        continue
                
                return None
                
        except Exception as e:
            logger.error(f"Direct access failed: {str(e)}")
            return None
    
    async def _try_with_oxylabs(self, video_id: str) -> Optional[str]:
        """Try using Oxylabs proxy"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Use Oxylabs to fetch the YouTube page
                video_url = f"https://www.youtube.com/watch?v={video_id}"
                
                payload = {
                    "source": "universal",
                    "url": video_url,
                    "render": "html"
                }
                
                response = await client.post(
                    "https://realtime.oxylabs.io/v1/queries",
                    json=payload,
                    auth=(self.oxylabs_username, self.oxylabs_password)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'results' in data and data['results']:
                        html = data['results'][0]['content']
                        
                        # Extract caption URLs from the HTML
                        caption_urls = self._extract_caption_urls(html, video_id)
                        
                        # Try each caption URL through Oxylabs
                        for caption_url in caption_urls:
                            transcript = await self._fetch_caption_via_oxylabs(caption_url, client)
                            if transcript:
                                return transcript
                
                return None
                
        except Exception as e:
            logger.error(f"Oxylabs method failed: {str(e)}")
            return None
    
    def _extract_caption_urls(self, html: str, video_id: str) -> list:
        """Extract caption URLs from YouTube page HTML"""
        urls = []
        
        try:
            # Pattern to find caption track URLs
            patterns = [
                r'"baseUrl":"(https://www\.youtube\.com/api/timedtext[^"]+)"',
                r'{"baseUrl":"([^"]*api/timedtext[^"]*)"',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, html)
                for match in matches:
                    # Clean up the URL
                    url = match.replace('\\u0026', '&').replace('\\/', '/')
                    if 'lang=en' in url or 'lang=en-' in url:
                        urls.append(url)
            
            # Add fallback URLs
            fallback_urls = [
                f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en&fmt=json3",
                f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en-US&fmt=json3",
            ]
            
            urls.extend(fallback_urls)
            
            # Remove duplicates while preserving order
            seen = set()
            unique_urls = []
            for url in urls:
                if url not in seen:
                    seen.add(url)
                    unique_urls.append(url)
            
            logger.info(f"Found {len(unique_urls)} caption URLs to try")
            return unique_urls
            
        except Exception as e:
            logger.error(f"Error extracting caption URLs: {str(e)}")
            return []
    
    async def _fetch_caption_via_oxylabs(self, caption_url: str, client: httpx.AsyncClient) -> Optional[str]:
        """Fetch caption content via Oxylabs"""
        try:
            payload = {
                "source": "universal",
                "url": caption_url
            }
            
            response = await client.post(
                "https://realtime.oxylabs.io/v1/queries",
                json=payload,
                auth=(self.oxylabs_username, self.oxylabs_password)
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'results' in data and data['results']:
                    content = data['results'][0]['content']
                    transcript = self._parse_transcript_content(content)
                    if transcript and len(transcript) > 100:
                        logger.info(f"✅ Oxylabs caption fetch successful: {len(transcript)} chars")
                        return transcript
            
            return None
            
        except Exception as e:
            logger.debug(f"Oxylabs caption fetch failed for {caption_url}: {str(e)}")
            return None
    
    def _parse_transcript_content(self, content: str) -> Optional[str]:
        """Parse transcript content from various formats"""
        try:
            # Try JSON format first
            try:
                data = json.loads(content)
                if 'events' in data:
                    texts = []
                    for event in data['events']:
                        if 'segs' in event:
                            for seg in event['segs']:
                                if 'utf8' in seg:
                                    texts.append(seg['utf8'])
                    transcript = ' '.join(texts).strip()
                    if transcript:
                        return transcript
            except json.JSONDecodeError:
                pass
            
            # Try XML format
            try:
                from xml.etree import ElementTree as ET
                root = ET.fromstring(content)
                texts = []
                for text_elem in root.findall('.//text'):
                    if text_elem.text:
                        texts.append(text_elem.text.strip())
                transcript = ' '.join(texts).strip()
                if transcript:
                    return transcript
            except ET.ParseError:
                pass
            
            # If it's already plain text and looks like a transcript
            if len(content) > 100 and not content.startswith('<'):
                return content.strip()
            
            return None
            
        except Exception as e:
            logger.error(f"Error parsing transcript content: {str(e)}")
            return None