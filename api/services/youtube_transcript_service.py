import httpx
import re
import json
import logging
from typing import Optional, List, Dict
from xml.etree import ElementTree as ET
import asyncio

logger = logging.getLogger(__name__)

class YouTubeTranscriptService:
    """Alternative transcript fetching using direct API calls"""
    
    def __init__(self, oxylabs_username: str = None, oxylabs_password: str = None):
        self.oxylabs_username = oxylabs_username
        self.oxylabs_password = oxylabs_password
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_transcript_direct(self, video_id: str) -> Optional[str]:
        """Get transcript by directly calling YouTube's timedtext API"""
        try:
            # First, get the video page to extract necessary data
            video_url = f"https://www.youtube.com/watch?v={video_id}"
            
            # Fetch via Oxylabs if available
            if self.oxylabs_username and self.oxylabs_password:
                html = await self._fetch_via_oxylabs(video_url)
            else:
                response = await self.client.get(video_url)
                html = response.text
            
            if not html:
                logger.error("Failed to fetch video page")
                return None
            
            # Extract the timedtext API URL
            timedtext_url = await self._extract_timedtext_url(html, video_id)
            if not timedtext_url:
                logger.error("Could not find timedtext URL")
                return None
            
            logger.info(f"Found timedtext URL: {timedtext_url}")
            
            # Fetch the transcript
            transcript_xml = await self._fetch_transcript_xml(timedtext_url)
            if not transcript_xml:
                logger.error("Failed to fetch transcript XML")
                return None
            
            # Parse the transcript
            transcript_text = self._parse_transcript_xml(transcript_xml)
            return transcript_text
            
        except Exception as e:
            logger.error(f"Error getting transcript: {str(e)}")
            return None
    
    async def _fetch_via_oxylabs(self, url: str) -> Optional[str]:
        """Fetch URL via Oxylabs proxy"""
        payload = {
            "source": "universal",
            "url": url,
            "render": "html"
        }
        
        try:
            response = await self.client.post(
                "https://realtime.oxylabs.io/v1/queries",
                json=payload,
                auth=(self.oxylabs_username, self.oxylabs_password)
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'results' in data and data['results']:
                    return data['results'][0]['content']
            return None
        except Exception as e:
            logger.error(f"Oxylabs error: {str(e)}")
            return None
    
    async def _extract_timedtext_url(self, html: str, video_id: str) -> Optional[str]:
        """Extract timedtext API URL from YouTube page"""
        try:
            # Method 1: Look for direct timedtext URL in page
            patterns = [
                r'"captionTracks":\[{"baseUrl":"([^"]+)"',
                r'"timedtext\.googleapis\.com/v1/[^"]+',
                rf'https://www\.youtube\.com/api/timedtext[^"]*v={video_id}[^"]*'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, html)
                if match:
                    url = match.group(1) if match.lastindex else match.group(0)
                    # Clean up the URL
                    url = url.replace('\\u0026', '&')
                    logger.info(f"Found timedtext URL: {url[:100]}...")
                    return url
            
            # Method 2: Build standard timedtext URL
            # This is a fallback approach
            base_url = f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en&fmt=srv3"
            logger.info(f"Using fallback timedtext URL: {base_url}")
            return base_url
            
        except Exception as e:
            logger.error(f"Error extracting timedtext URL: {str(e)}")
            return None
    
    async def _fetch_transcript_xml(self, url: str) -> Optional[str]:
        """Fetch transcript XML from timedtext URL"""
        try:
            if self.oxylabs_username and self.oxylabs_password:
                # Fetch via Oxylabs
                payload = {
                    "source": "universal",
                    "url": url
                }
                
                response = await self.client.post(
                    "https://realtime.oxylabs.io/v1/queries",
                    json=payload,
                    auth=(self.oxylabs_username, self.oxylabs_password)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'results' in data and data['results']:
                        return data['results'][0]['content']
            else:
                # Direct fetch
                response = await self.client.get(url)
                if response.status_code == 200:
                    return response.text
            
            return None
        except Exception as e:
            logger.error(f"Error fetching transcript XML: {str(e)}")
            return None
    
    def _parse_transcript_xml(self, xml_content: str) -> Optional[str]:
        """Parse transcript from XML format"""
        try:
            # Try parsing as XML
            root = ET.fromstring(xml_content)
            texts = []
            
            # Handle different XML formats
            # Format 1: <text start="0" dur="1.5">Hello world</text>
            for text_elem in root.findall('.//text'):
                text = text_elem.text
                if text:
                    texts.append(text.strip())
            
            # Format 2: JSON format
            if not texts and xml_content.strip().startswith('{'):
                data = json.loads(xml_content)
                if 'events' in data:
                    for event in data['events']:
                        if 'segs' in event:
                            for seg in event['segs']:
                                if 'utf8' in seg:
                                    texts.append(seg['utf8'])
            
            transcript = ' '.join(texts)
            return transcript if transcript else None
            
        except Exception as e:
            logger.error(f"Error parsing transcript: {str(e)}")
            # Return raw content as fallback
            return xml_content if len(xml_content) < 50000 else None
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()