from pydantic import BaseModel, HttpUrl
from typing import Optional

class SummarizeRequest(BaseModel):
    url: str
    options: Optional[dict] = None

class TranscriptRequest(BaseModel):
    video_id: str
    language: Optional[str] = "en"