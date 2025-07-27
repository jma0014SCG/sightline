import httpx
import logging
from typing import Optional
import asyncio

logger = logging.getLogger(__name__)

class TranscriptFallbackService:
    """Simple, reliable transcript service using multiple APIs"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def get_transcript(self, video_id: str) -> Optional[str]:
        """Get transcript using reliable external APIs"""
        
        # Method 1: Try rapid API transcript service
        transcript = await self._try_rapid_api(video_id)
        if transcript:
            return transcript
        
        # Method 2: Try a simple direct approach that works
        transcript = await self._try_simple_method(video_id)
        if transcript:
            return transcript
        
        return None
    
    async def _try_rapid_api(self, video_id: str) -> Optional[str]:
        """Try using RapidAPI transcript service"""
        try:
            # This is a placeholder - you'd need to sign up for a transcript API
            # For now, let's skip this
            return None
        except Exception as e:
            logger.error(f"RapidAPI failed: {str(e)}")
            return None
    
    async def _try_simple_method(self, video_id: str) -> Optional[str]:
        """Simple method that often works"""
        try:
            # Use a simple approach that bypasses most blocking
            url = f"https://www.youtube.com/watch?v={video_id}"
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
            }
            
            # First get the page with redirects
            response = await self.client.get(url, headers=headers, follow_redirects=True)
            if response.status_code != 200:
                logger.error(f"Failed to fetch page: {response.status_code}")
                return None
            
            html = response.text
            
            # Look for transcript URLs using multiple patterns
            import re
            
            # Try multiple patterns to find captions
            patterns = [
                r'"baseUrl":"(https://www\.youtube\.com/api/timedtext[^"]+)"',
                r'"timedtext","url":"([^"]+)"',
                r'{"baseUrl":"([^"]*timedtext[^"]*)"',
                r'"captionTracks":\[{"baseUrl":"([^"]+)"',
                r'timedtext\?[^"]*v=' + re.escape(video_id) + r'[^"]*',
            ]
            
            matches = []
            for pattern in patterns:
                found = re.findall(pattern, html)
                matches.extend(found)
                if found:
                    logger.info(f"Found {len(found)} matches with pattern: {pattern[:50]}...")
            
            # Also try to construct direct URLs
            if not matches:
                # Fallback to standard timedtext URLs
                base_urls = [
                    f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en&fmt=json3",
                    f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en-US&fmt=json3",
                    f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en&fmt=srv3",
                ]
                matches.extend(base_urls)
                logger.info(f"Using fallback URLs: {len(base_urls)} URLs")
            
            for match in matches:
                # Clean up the URL
                caption_url = match.replace('\\u0026', '&').replace('\\/', '/')
                
                try:
                    # Fetch the transcript
                    cap_response = await self.client.get(caption_url, headers=headers)
                    if cap_response.status_code == 200:
                        content = cap_response.text
                        
                        # Try to parse as JSON
                        try:
                            import json
                            data = json.loads(content)
                            if 'events' in data:
                                texts = []
                                for event in data['events']:
                                    if 'segs' in event:
                                        for seg in event['segs']:
                                            if 'utf8' in seg:
                                                texts.append(seg['utf8'])
                                transcript = ' '.join(texts).strip()
                                if len(transcript) > 100:  # Ensure we got actual content
                                    logger.info(f"✅ Got transcript from timedtext URL ({len(transcript)} chars)")
                                    return transcript
                        except:
                            # Try XML parsing
                            from xml.etree import ElementTree as ET
                            try:
                                root = ET.fromstring(content)
                                texts = []
                                for text_elem in root.findall('.//text'):
                                    if text_elem.text:
                                        texts.append(text_elem.text.strip())
                                transcript = ' '.join(texts).strip()
                                if len(transcript) > 100:
                                    logger.info(f"✅ Got transcript from XML ({len(transcript)} chars)")
                                    return transcript
                            except:
                                pass
                except:
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Simple method failed: {str(e)}")
            return None
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()