import logging
from typing import Optional, Tuple
from gumloop import GumloopClient

logger = logging.getLogger(__name__)

class GumloopService:
    """Service for extracting transcripts using Gumloop API"""
    
    def __init__(self, api_key: Optional[str] = None, user_id: Optional[str] = None, flow_id: Optional[str] = None):
        self.api_key = api_key
        self.user_id = user_id
        self.flow_id = flow_id
        self.client = None
        
        if self.api_key and self.user_id:
            try:
                self.client = GumloopClient(
                    api_key=self.api_key,
                    user_id=self.user_id
                )
                logger.info("✅ Gumloop client initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Gumloop client: {str(e)}")
                self.client = None
        else:
            logger.warning("⚠️ Gumloop credentials not provided")
    
    async def get_transcript(self, video_url: str) -> Optional[str]:
        """
        Extract transcript from YouTube video using Gumloop API
        
        Args:
            video_url: Full YouTube URL (e.g., https://www.youtube.com/watch?v=Xq0xJl-2D_s)
        
        Returns:
            Transcript string if available, None otherwise
        """
        if not self.client:
            logger.error("❌ Gumloop client not initialized")
            return None
        
        if not self.flow_id:
            logger.error("❌ Gumloop flow_id not configured")
            return None
        
        try:
            logger.info(f"🔄 Attempting to get content via Gumloop for URL: {video_url}")
            
            # Run the Gumloop flow with the video URL
            output = self.client.run_flow(
                flow_id=self.flow_id,
                inputs={
                    "link": video_url
                }
            )
            
            # Extract summary, transcript, and category from the output
            summary = None
            transcript = None
            category = None
            
            if isinstance(output, dict):
                # Extract the three top-level keys from your new Gumloop flow
                summary = output.get("summary")
                transcript = output.get("transcript") 
                category = output.get("category")
                
                # Fallback to old format if new keys not found
                if not summary and not transcript:
                    fallback_content = (
                        output.get("text") or 
                        output.get("content") or
                        output.get("result")
                    )
                    if fallback_content:
                        summary = fallback_content
                        
            elif isinstance(output, str):
                # If output is just a string, treat it as summary
                summary = output
            elif isinstance(output, list) and len(output) > 0:
                # If output is a list, try to get the first item
                first_item = output[0]
                if isinstance(first_item, dict):
                    summary = first_item.get("summary")
                    transcript = first_item.get("transcript")
                    category = first_item.get("category")
                elif isinstance(first_item, str):
                    summary = first_item
            
            # Validate and clean the extracted data
            if summary and isinstance(summary, str):
                summary = summary.strip()
            if transcript and isinstance(transcript, str):
                transcript = transcript.strip()
            if category and isinstance(category, str):
                category = category.strip()
            
            # Return transcript if available (with structure for later parsing)
            if summary or transcript:
                # Return the complete structured content for parsing
                full_content = summary if summary else transcript
                if full_content:
                    logger.info(f"✅ Successfully retrieved content via Gumloop: {len(full_content)} characters")
                    return full_content
            
            logger.warning(f"⚠️ Gumloop returned no usable content: {output}")
            return None
                
        except Exception as e:
            logger.error(f"❌ Gumloop content extraction failed: {str(e)}")
            return None
    
    def is_available(self) -> bool:
        """Check if Gumloop service is properly configured and available"""
        return self.client is not None and self.flow_id is not None