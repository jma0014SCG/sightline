from pydantic import BaseModel, HttpUrl
from typing import Optional

class SummarizeRequest(BaseModel):
    youtube_url: str
    task_id: str
    anonymous: bool
    summary_id: str
    user_id: Optional[str] = None
    options: Optional[dict] = None

class TranscriptRequest(BaseModel):
    video_id: str
    language: Optional[str] = "en"