from fastapi import APIRouter, HTTPException, Depends
import sys
import os
# Add parent directory to path to find other modules
current_dir = os.path.dirname(__file__)
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

from dependencies import get_current_user, User
from services.youtube_service import YouTubeService
from models.requests import TranscriptRequest
from models.responses import TranscriptResponse

router = APIRouter()
youtube_service = YouTubeService()

@router.post("/transcript", response_model=TranscriptResponse)
async def get_transcript(
    request: TranscriptRequest,
    current_user: User = Depends(get_current_user)
):
    """Get transcript for a YouTube video"""
    try:
        transcript = await youtube_service.get_transcript(
            request.video_id,
            language=request.language
        )
        
        if not transcript:
            raise HTTPException(
                status_code=404,
                detail="Transcript not available for this video"
            )
        
        return TranscriptResponse(
            video_id=request.video_id,
            transcript=transcript
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))