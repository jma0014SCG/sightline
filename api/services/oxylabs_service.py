import httpx
import asyncio
import re
from typing import Optional, Dict, Any
import logging
from bs4 import BeautifulSoup
import json

logger = logging.getLogger(__name__)

class OxylabsService:
    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self.base_url = "https://realtime.oxylabs.io/v1/queries"
        
    async def fetch_youtube_page(self, video_id: str) -> Optional[str]:
        """Fetch YouTube page HTML using Oxylabs proxy"""
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        payload = {
            "source": "universal",
            "url": url,
            "render": "html",
            "parse": False,
            "context": [
                {
                    "key": "follow_redirects",
                    "value": True
                }
            ]
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                logger.info(f"🔄 Fetching YouTube page via Oxylabs for video {video_id}")
                response = await client.post(
                    self.base_url,
                    json=payload,
                    auth=(self.username, self.password)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'results' in data and len(data['results']) > 0:
                        html_content = data['results'][0]['content']
                        logger.info(f"✅ Successfully fetched YouTube page via Oxylabs")
                        return html_content
                    else:
                        logger.error(f"❌ No content in Oxylabs response")
                        return None
                else:
                    logger.error(f"❌ Oxylabs request failed with status {response.status_code}")
                    logger.error(f"Response: {response.text}")
                    return None
                    
            except Exception as e:
                logger.error(f"❌ Error fetching via Oxylabs: {str(e)}")
                return None
    
    def extract_captions_data(self, html_content: str) -> Optional[Dict[str, Any]]:
        """Extract captions data from YouTube page HTML"""
        try:
            # Try multiple patterns to find player response
            patterns = [
                r'var ytInitialPlayerResponse = ({.+?});',
                r'ytInitialPlayerResponse\s*=\s*({.+?})\s*;',
                r'window\["ytInitialPlayerResponse"\]\s*=\s*({.+?})\s*;'
            ]
            
            player_response = None
            for pattern in patterns:
                match = re.search(pattern, html_content, re.DOTALL)
                if match:
                    try:
                        player_response = json.loads(match.group(1))
                        logger.info(f"✅ Found player response with pattern: {pattern[:30]}...")
                        break
                    except json.JSONDecodeError:
                        continue
            
            if not player_response:
                logger.error("❌ Could not find ytInitialPlayerResponse in HTML")
                return None
            
            # Extract captions data
            captions = player_response.get('captions', {})
            caption_tracks = captions.get('playerCaptionsTracklistRenderer', {}).get('captionTracks', [])
            
            if caption_tracks:
                logger.info(f"✅ Found {len(caption_tracks)} caption tracks")
                return {
                    'captionTracks': caption_tracks,
                    'playerResponse': player_response
                }
            else:
                logger.warning("⚠️ No caption tracks found in player response")
                # Log what we did find for debugging
                if 'captions' in player_response:
                    logger.warning(f"Captions object: {json.dumps(player_response['captions'], indent=2)[:200]}...")
                return None
                
        except Exception as e:
            logger.error(f"❌ Error extracting captions data: {str(e)}")
            return None
    
    async def fetch_transcript_from_url(self, caption_url: str) -> Optional[str]:
        """Fetch transcript from caption URL via Oxylabs"""
        payload = {
            "source": "universal",
            "url": caption_url,
            "parse": False
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                logger.info(f"🔄 Fetching transcript from caption URL via Oxylabs")
                response = await client.post(
                    self.base_url,
                    json=payload,
                    auth=(self.username, self.password)
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'results' in data and len(data['results']) > 0:
                        content = data['results'][0]['content']
                        
                        # Parse the XML/JSON content to extract transcript
                        transcript_text = self._parse_transcript_content(content)
                        if transcript_text:
                            logger.info(f"✅ Successfully extracted transcript")
                            return transcript_text
                        else:
                            logger.error("❌ Could not parse transcript content")
                            return None
                    else:
                        logger.error("❌ No content in Oxylabs response")
                        return None
                else:
                    logger.error(f"❌ Oxylabs request failed with status {response.status_code}")
                    return None
                    
            except Exception as e:
                logger.error(f"❌ Error fetching transcript: {str(e)}")
                return None
    
    def _parse_transcript_content(self, content: str) -> Optional[str]:
        """Parse transcript content from various formats"""
        try:
            # Try parsing as JSON first (YouTube sometimes returns JSON)
            try:
                data = json.loads(content)
                if 'events' in data:
                    # Extract text from events
                    texts = []
                    for event in data.get('events', []):
                        if 'segs' in event:
                            for seg in event['segs']:
                                if 'utf8' in seg:
                                    texts.append(seg['utf8'])
                    return ' '.join(texts)
            except json.JSONDecodeError:
                pass
            
            # Try parsing as XML
            from xml.etree import ElementTree as ET
            try:
                root = ET.fromstring(content)
                texts = []
                for text_elem in root.findall('.//text'):
                    text = text_elem.text
                    if text:
                        texts.append(text.strip())
                return ' '.join(texts)
            except ET.ParseError:
                pass
            
            # If all else fails, return the raw content
            return content
            
        except Exception as e:
            logger.error(f"❌ Error parsing transcript content: {str(e)}")
            return None