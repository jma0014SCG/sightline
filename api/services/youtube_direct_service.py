import httpx
import re
import json
import logging
from typing import Optional
import asyncio

logger = logging.getLogger(__name__)

class YouTubeDirectService:
    """Direct YouTube transcript extraction using page scraping"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def get_transcript_from_page(self, video_id: str) -> Optional[str]:
        """Extract transcript directly from YouTube page"""
        try:
            url = f"https://www.youtube.com/watch?v={video_id}"
            
            # Fetch the page
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
            
            response = await self.client.get(url, headers=headers)
            if response.status_code != 200:
                logger.error(f"Failed to fetch YouTube page: {response.status_code}")
                return None
            
            html = response.text
            
            # Method 1: Extract from ytInitialData
            transcript = await self._extract_from_initial_data(html, video_id)
            if transcript:
                return transcript
            
            # Method 2: Extract from player response
            transcript = await self._extract_from_player_response(html, video_id)
            if transcript:
                return transcript
            
            # Method 3: Try to get captions URL and fetch directly
            transcript = await self._extract_from_captions_url(html, video_id)
            if transcript:
                return transcript
            
            logger.error("No transcript extraction method succeeded")
            return None
            
        except Exception as e:
            logger.error(f"Error extracting transcript: {str(e)}")
            return None
    
    async def _extract_from_initial_data(self, html: str, video_id: str) -> Optional[str]:
        """Extract transcript from ytInitialData"""
        try:
            # Find ytInitialData
            match = re.search(r'var ytInitialData = ({.+?});', html, re.DOTALL)
            if not match:
                return None
            
            data = json.loads(match.group(1))
            
            # Navigate through the data structure to find captions
            # This is complex as YouTube's structure changes
            # Try multiple paths
            paths = [
                ["contents", "twoColumnWatchNextResults", "results", "results", "contents"],
                ["engagementPanels"],
            ]
            
            for path in paths:
                current = data
                for key in path:
                    if isinstance(current, dict) and key in current:
                        current = current[key]
                    elif isinstance(current, list):
                        break
                
                # Look for transcript in engagement panels
                if isinstance(current, list):
                    for panel in current:
                        if isinstance(panel, dict):
                            # Check if this is a transcript panel
                            if "transcriptSearchPanelRenderer" in panel.get("engagementPanelSectionListRenderer", {}).get("content", {}):
                                # Found transcript panel
                                logger.info("Found transcript panel in ytInitialData")
                                # This would require additional parsing
                                return None
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting from initial data: {str(e)}")
            return None
    
    async def _extract_from_player_response(self, html: str, video_id: str) -> Optional[str]:
        """Extract transcript from player response"""
        try:
            # Find ytInitialPlayerResponse
            match = re.search(r'var ytInitialPlayerResponse = ({.+?});', html, re.DOTALL)
            if not match:
                return None
            
            player_response = json.loads(match.group(1))
            
            # Check for captions
            captions = player_response.get('captions', {})
            caption_tracks = captions.get('playerCaptionsTracklistRenderer', {}).get('captionTracks', [])
            
            if not caption_tracks:
                logger.warning("No caption tracks found in player response")
                return None
            
            # Find English caption track
            english_track = None
            for track in caption_tracks:
                if track.get('languageCode', '').startswith('en'):
                    english_track = track
                    break
            
            if not english_track and caption_tracks:
                english_track = caption_tracks[0]
            
            if not english_track:
                return None
            
            # Get caption URL
            caption_url = english_track.get('baseUrl')
            if not caption_url:
                return None
            
            # Fetch the captions
            caption_response = await self.client.get(caption_url)
            if caption_response.status_code != 200:
                return None
            
            # Parse the captions (usually in XML format)
            caption_text = caption_response.text
            transcript = self._parse_caption_xml(caption_text)
            
            return transcript
            
        except Exception as e:
            logger.error(f"Error extracting from player response: {str(e)}")
            return None
    
    async def _extract_from_captions_url(self, html: str, video_id: str) -> Optional[str]:
        """Try to construct and fetch captions URL directly"""
        try:
            # This is a fallback method that tries common caption URL patterns
            caption_urls = [
                f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en&fmt=json3",
                f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en-US&fmt=json3",
                f"https://www.youtube.com/api/timedtext?v={video_id}&lang=en&fmt=srv1",
            ]
            
            for url in caption_urls:
                try:
                    response = await self.client.get(url)
                    if response.status_code == 200:
                        content = response.text
                        if content and len(content) > 100:
                            # Try to parse as JSON
                            try:
                                data = json.loads(content)
                                if 'events' in data:
                                    texts = []
                                    for event in data['events']:
                                        if 'segs' in event:
                                            for seg in event['segs']:
                                                if 'utf8' in seg:
                                                    texts.append(seg['utf8'])
                                    transcript = ' '.join(texts)
                                    if transcript:
                                        logger.info(f"Successfully got transcript from {url}")
                                        return transcript
                            except:
                                # Try XML parsing
                                transcript = self._parse_caption_xml(content)
                                if transcript:
                                    return transcript
                except:
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error extracting from captions URL: {str(e)}")
            return None
    
    def _parse_caption_xml(self, xml_content: str) -> Optional[str]:
        """Parse caption XML content"""
        try:
            from xml.etree import ElementTree as ET
            root = ET.fromstring(xml_content)
            texts = []
            
            for text_elem in root.findall('.//text'):
                text = text_elem.text
                if text:
                    texts.append(text.strip())
            
            return ' '.join(texts) if texts else None
            
        except Exception as e:
            logger.error(f"Error parsing caption XML: {str(e)}")
            return None
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()