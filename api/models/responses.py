from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class VideoInfo(BaseModel):
    video_id: str
    title: str
    channel_name: str
    channel_id: str
    duration: int  # in seconds
    thumbnail_url: Optional[str] = None
    published_at: Optional[datetime] = None
    # Enhanced metadata fields
    description: Optional[str] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    comment_count: Optional[int] = None
    upload_date: Optional[datetime] = None

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

class Framework(BaseModel):
    name: str
    description: str

class Playbook(BaseModel):
    trigger: str
    action: str

class NovelIdeaMeter(BaseModel):
    insight: str
    score: int

class InsightEnrichment(BaseModel):
    stats_tools_links: List[str] = []
    sentiment: str = "neutral"
    risks_blockers_questions: List[str] = []

class AcceleratedLearningPack(BaseModel):
    tldr100: str
    feynman_flashcards: List[Dict[str, str]] = []
    glossary: List[Dict[str, str]] = []
    quick_quiz: List[Dict[str, str]] = []
    novel_idea_meter: List[NovelIdeaMeter] = []

class SummaryMetadata(BaseModel):
    title: str
    channel: str
    duration: Optional[str] = None
    speakers: List[str] = []
    video_url: Optional[str] = None
    language: str = "en"
    generated_on: Optional[str] = None
    version: str = "v1.0"
    synopsis: str
    tone: Optional[str] = None

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
    task_id: Optional[str] = None  # Add task_id for progress tracking
    created_at: datetime = datetime.utcnow()
    
    # Enhanced YouTube metadata fields
    description: Optional[str] = None
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    comment_count: Optional[int] = None
    upload_date: Optional[datetime] = None
    
    # Structured data from Gumloop parsing
    metadata: Optional[SummaryMetadata] = None
    key_moments: List[KeyMoment] = []
    frameworks: List[Framework] = []
    debunked_assumptions: List[str] = []
    in_practice: List[str] = []
    playbooks: List[Playbook] = []
    insight_enrichment: Optional[InsightEnrichment] = None
    accelerated_learning_pack: Optional[AcceleratedLearningPack] = None
    
    # Legacy fields for backward compatibility
    flashcards: List[Flashcard] = []
    quiz_questions: List[QuizQuestion] = []
    glossary: List[GlossaryTerm] = []
    tools: List[str] = []
    resources: List[str] = []

class TranscriptResponse(BaseModel):
    video_id: str
    transcript: str
    segments: Optional[List[dict]] = None