from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import HumanMessage, SystemMessage
from typing import List
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from models.responses import Summary
from config import settings

class LangChainService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.openai_model,
            temperature=0.3,
            max_tokens=settings.openai_max_tokens,
            openai_api_key=settings.openai_api_key
        )
        
        self.summary_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert at converting YouTube transcripts into comprehensive knowledge packs.

Your task is to analyze the video transcript and create TWO outputs:

1. A detailed MARKDOWN summary (500-800 words)
2. A structured JSON data pack with metadata and learning resources

Focus on extracting key insights, timestamps, speaker information, and actionable takeaways.

MARKDOWN Format:
- Video context (title, speakers, duration, synopsis)
- Rapid TL;DR (100 words max)
- Key moments with timestamps
- Key concepts and insights
- Data, tools, and resources mentioned
- Summary and calls-to-action

JSON Format should include:
- metadata (title, channel, speakers, synopsis, tone)
- key_moments with timestamps and insights
- knowledge_cards for learning
- accelerated_learning_pack with flashcards and quiz"""),
            ("human", """Please analyze this YouTube video:

Title: {title}
Channel: {channel}
URL: {video_url}

Transcript:
{raw_transcript}

Generate both the MARKDOWN summary and JSON data pack as described.""")
        ])
    
    async def summarize_transcript(
        self, 
        transcript: str, 
        video_title: str,
        channel_name: str,
        video_url: str = ""
    ) -> Summary:
        """Generate a summary from video transcript"""
        try:
            # Truncate transcript if too long
            max_transcript_length = 12000  # Roughly 3000 tokens
            if len(transcript) > max_transcript_length:
                transcript = transcript[:max_transcript_length] + "..."
            
            # Generate summary
            response = await self.llm.ainvoke(
                self.summary_prompt.format_messages(
                    title=video_title,
                    channel=channel_name,
                    video_url=video_url,
                    raw_transcript=transcript
                )
            )
            
            # Parse response
            raw_content = response.content
            
            # Split MARKDOWN and JSON sections
            markdown_content, json_data = self._parse_ai_response(raw_content)
            
            # Extract key points from markdown
            key_points = self._extract_key_points(markdown_content)
            
            # Extract structured data from JSON
            structured_data = self._extract_structured_data(json_data)
            
            return Summary(
                content=markdown_content,
                key_points=key_points,
                metadata=structured_data.get('metadata'),
                key_moments=structured_data.get('key_moments', []),
                knowledge_cards=structured_data.get('knowledge_cards', []),
                flashcards=structured_data.get('flashcards', []),
                quiz_questions=structured_data.get('quiz_questions', []),
                raw_response=raw_content
            )
            
        except Exception as e:
            raise Exception(f"Failed to generate summary: {str(e)}")
    
    def _parse_ai_response(self, content: str) -> tuple[str, dict]:
        """Parse AI response into MARKDOWN and JSON sections"""
        try:
            # Look for JSON section (starts with { and ends with })
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            
            if json_start != -1 and json_end > json_start:
                markdown_content = content[:json_start].strip()
                json_content = content[json_start:json_end]
                
                # Try to parse JSON
                import json
                try:
                    json_data = json.loads(json_content)
                    return markdown_content, json_data
                except json.JSONDecodeError:
                    # If JSON parsing fails, return markdown only
                    return content, {}
            else:
                # No JSON section found, return all as markdown
                return content, {}
                
        except Exception:
            return content, {}
    
    def _extract_structured_data(self, json_data: dict) -> dict:
        """Extract and structure data from JSON response"""
        if not json_data:
            return {}
            
        try:
            # Extract metadata
            metadata = None
            if 'metadata' in json_data:
                meta = json_data['metadata']
                from models.responses import SummaryMetadata
                metadata = SummaryMetadata(
                    title=meta.get('title', ''),
                    channel=meta.get('channel', ''),
                    duration=meta.get('duration', ''),
                    speakers=meta.get('speakers', []),
                    synopsis=meta.get('synopsis', ''),
                    tone=meta.get('tone', '')
                )
            
            # Extract key moments
            key_moments = []
            if 'key_moments' in json_data:
                from models.responses import KeyMoment
                for moment in json_data['key_moments']:
                    if isinstance(moment, dict) and 'timestamp' in moment and 'insight' in moment:
                        key_moments.append(KeyMoment(
                            timestamp=moment['timestamp'],
                            insight=moment['insight']
                        ))
            
            # Extract knowledge cards
            knowledge_cards = []
            if 'knowledge_cards' in json_data:
                from models.responses import KnowledgeCard
                for card in json_data['knowledge_cards']:
                    if isinstance(card, dict) and 'q' in card and 'a' in card:
                        knowledge_cards.append(KnowledgeCard(
                            q=card['q'],
                            a=card['a']
                        ))
            
            # Extract flashcards from accelerated_learning_pack
            flashcards = []
            if 'accelerated_learning_pack' in json_data and 'flashcards' in json_data['accelerated_learning_pack']:
                from models.responses import Flashcard
                for card in json_data['accelerated_learning_pack']['flashcards']:
                    if isinstance(card, dict) and 'question' in card and 'answer' in card:
                        flashcards.append(Flashcard(
                            question=card['question'],
                            answer=card['answer']
                        ))
            
            # Extract quiz questions
            quiz_questions = []
            if 'accelerated_learning_pack' in json_data and 'quiz' in json_data['accelerated_learning_pack']:
                from models.responses import QuizQuestion
                for q in json_data['accelerated_learning_pack']['quiz']:
                    if isinstance(q, dict) and 'question' in q and 'correct_answer' in q:
                        quiz_questions.append(QuizQuestion(
                            question=q['question'],
                            answer=q['correct_answer']
                        ))
            
            return {
                'metadata': metadata,
                'key_moments': key_moments,
                'knowledge_cards': knowledge_cards,
                'flashcards': flashcards,
                'quiz_questions': quiz_questions
            }
            
        except Exception as e:
            print(f"Error extracting structured data: {e}")
            return {}
    
    def _extract_key_points(self, content: str) -> List[str]:
        """Extract key points from the summary"""
        lines = content.split('\n')
        key_points = []
        
        in_key_section = False
        for line in lines:
            line = line.strip()
            
            # Look for key takeaways section
            if any(keyword in line.lower() for keyword in ['key takeaway', 'key point', 'main point']):
                in_key_section = True
                continue
            
            # Extract bullet points
            if in_key_section and (line.startswith('•') or line.startswith('-') or line.startswith('*')):
                point = line.lstrip('•-* ').strip()
                if point:
                    key_points.append(point)
            
            # Stop if we hit another section
            elif in_key_section and line and not line.startswith(('•', '-', '*')):
                if len(key_points) >= 3:  # We have enough points
                    break
        
        # If no key points found, extract first few sentences
        if not key_points:
            sentences = content.split('. ')[:3]
            key_points = [s.strip() + '.' for s in sentences if s.strip()]
        
        return key_points[:5]  # Maximum 5 key points