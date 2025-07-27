import logging
from typing import Optional
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
            Transcript text if successful, None otherwise
        """
        if not self.client:
            logger.error("❌ Gumloop client not initialized")
            return None
        
        if not self.flow_id:
            logger.error("❌ Gumloop flow_id not configured")
            return None
        
        try:
            logger.info(f"🔄 Attempting to get transcript via Gumloop for URL: {video_url}")
            
            # Run the Gumloop flow with the video URL
            output = self.client.run_flow(
                flow_id=self.flow_id,
                inputs={
                    "link": video_url
                }
            )
            
            # Extract transcript from the output
            # Based on your pipeline, it returns a summary instead of raw transcript
            # We'll extract the content from the markdown summary
            transcript = None
            if isinstance(output, dict):
                # Try different possible keys where content might be stored
                raw_content = (
                    output.get("transcript") or 
                    output.get("summary") or 
                    output.get("text") or 
                    output.get("content") or
                    output.get("result")
                )
                
                # If we got the summary markdown, extract useful content from it
                if raw_content and isinstance(raw_content, str):
                    # Check if it's a markdown summary and extract meaningful content
                    if "```markdown" in raw_content or "## Video Context" in raw_content:
                        # Extract the main summary content for now
                        # You could parse this more sophisticatedly if needed
                        transcript = raw_content
                    else:
                        transcript = raw_content
                        
            elif isinstance(output, str):
                transcript = output
            elif isinstance(output, list) and len(output) > 0:
                # If output is a list, try to get the first item
                first_item = output[0]
                if isinstance(first_item, dict):
                    transcript = (
                        first_item.get("transcript") or 
                        first_item.get("summary") or
                        first_item.get("text") or 
                        first_item.get("content") or
                        first_item.get("result")
                    )
                elif isinstance(first_item, str):
                    transcript = first_item
            
            if transcript and len(str(transcript).strip()) > 50:  # Ensure we got substantial content
                logger.info(f"✅ Successfully retrieved transcript via Gumloop ({len(transcript)} characters)")
                return str(transcript).strip()
            else:
                logger.warning(f"⚠️ Gumloop returned insufficient transcript content: {output}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Gumloop transcript extraction failed: {str(e)}")
            return None
    
    def is_available(self) -> bool:
        """Check if Gumloop service is properly configured and available"""
        return self.client is not None and self.flow_id is not None