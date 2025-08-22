# Fallback service for when Gumloop is not available
# Since Gumloop handles all OpenAI summarization, this is just a simple fallback
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models.responses import Summary
from typing import List

class LangChainService:
    """
    Fallback service for video summarization.
    Since Gumloop handles all AI summarization, this just provides a basic fallback.
    """
    
    async def summarize_transcript(
        self, 
        transcript: str, 
        video_title: str,
        channel_name: str,
        video_url: str = ""
    ) -> Summary:
        """Generate a basic fallback summary when Gumloop is not available"""
        
        # Create a basic summary from the transcript
        lines = transcript.split('\n')[:10]  # Get first 10 lines
        preview = '\n'.join(lines)
        
        # Create basic content
        content = f"""# {video_title}
        
**Channel**: {channel_name}

## Video Content Preview

{preview}...

## Summary
This is a fallback summary. The primary summarization service (Gumloop) is not available.
The full transcript has been captured but requires the AI service to generate a complete summary.

## Key Points
- Video title: {video_title}
- Channel: {channel_name}
- Transcript available but not processed
"""
        
        # Extract basic key points
        key_points = [
            f"Video from {channel_name}",
            f"Title: {video_title}",
            "Full AI summarization service temporarily unavailable",
            "Transcript has been captured successfully"
        ]
        
        return Summary(
            content=content,
            key_points=key_points
        )