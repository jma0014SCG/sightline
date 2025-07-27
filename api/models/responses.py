from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class VideoInfo(BaseModel):
    video_id: str
    title: str
    channel_name: str
    channel_id: str
    duration: int  # in seconds
    thumbnail_url: Optional[str] = None
    published_at: Optional[datetime] = None

class KeyMoment(BaseModel):
    timestamp: str
    insight: str

class KnowledgeCard(BaseModel):
    q: str
    a: str

class Flashcard(BaseModel):
    question: str
    answer: str

class QuizQuestion(BaseModel):
    question: str
    answer: str

class GlossaryTerm(BaseModel):
    term: str
    definition: str

class SummaryMetadata(BaseModel):
    title: str
    channel: str
    duration: Optional[str] = None
    speakers: List[str] = []
    synopsis: str
    tone: str

class Summary(BaseModel):
    content: str  # MARKDOWN content
    key_points: List[str]
    
    # Rich structured data from JSON output
    metadata: Optional[SummaryMetadata] = None
    key_moments: List[KeyMoment] = []
    knowledge_cards: List[KnowledgeCard] = []
    flashcards: List[Flashcard] = []
    quiz_questions: List[QuizQuestion] = []
    
    # Raw AI response for debugging
    raw_response: Optional[str] = None

class SummarizeResponse(BaseModel):
    video_id: str
    video_url: str
    video_title: str
    channel_name: str
    channel_id: str
    duration: int
    thumbnail_url: Optional[str]
    summary: str
    key_points: List[str]
    user_id: str
    created_at: datetime = datetime.utcnow()
    
    # Structured data from Gumloop parsing
    metadata: Optional[SummaryMetadata] = None
    key_moments: List[KeyMoment] = []
    flashcards: List[Flashcard] = []
    quiz_questions: List[QuizQuestion] = []
    glossary: List[GlossaryTerm] = []
    tools: List[str] = []
    resources: List[str] = []

class TranscriptResponse(BaseModel):
    video_id: str
    transcript: str
    segments: Optional[List[dict]] = None