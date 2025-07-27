"""
Parser for Gumloop-formatted YouTube summaries
"""
import re
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class GumloopKeyMoment:
    timestamp: str
    insight: str

@dataclass
class GumloopSummary:
    # Video Context
    title: str
    speakers: List[str]
    duration: str
    channel: str
    synopsis: str
    
    # Main content sections
    tldr: str
    key_moments: List[GumloopKeyMoment]
    key_concepts: str
    
    # Resources
    tools: List[str]
    resources: List[str]
    
    # Learning Pack
    flashcards: List[Dict[str, str]]
    glossary: List[Dict[str, str]]
    quiz_questions: List[Dict[str, str]]
    
    # Full formatted content
    full_content: str


def is_gumloop_summary(content: str) -> bool:
    """
    Detect if content is a Gumloop-formatted summary
    
    Args:
        content: Content to check
        
    Returns:
        True if content appears to be Gumloop-formatted
    """
    if not content or len(content) < 100:
        return False
    
    # Check for Gumloop markdown markers
    gumloop_markers = [
        "## Video Context",
        "**Title**",
        "**Speakers**:",
        "**Synopsis**:",
        "## 00:00 Rapid TL;DR",
        "## Key Moments (Timestamp → Insight)",
        "## Key Concepts & Insights",
        "## Data, Tools & Resources",
        "## Accelerated-Learning Pack"
    ]
    
    # Count how many markers are present
    marker_count = sum(1 for marker in gumloop_markers if marker in content)
    
    # If we have at least 4 markers, it's likely Gumloop content
    return marker_count >= 4


def parse_gumloop_summary(content: str) -> Optional[GumloopSummary]:
    """
    Parse a Gumloop-formatted summary into structured data
    
    Args:
        content: Gumloop-formatted markdown content
        
    Returns:
        Parsed GumloopSummary object or None if parsing fails
    """
    try:
        # Extract sections using regex
        sections = _extract_sections(content)
        logger.debug(f"Extracted sections: {list(sections.keys())}")
        
        # Parse Video Context
        video_context = sections.get("video context", "")
        title = _extract_field(video_context, "Title")
        speakers = _extract_speakers(video_context)
        duration = _extract_field(video_context, "Duration")
        channel = _extract_field(video_context, "Channel")
        synopsis = _extract_field(video_context, "Synopsis")
        
        # Parse TL;DR
        tldr = sections.get("00:00 rapid tl;dr", "").strip()
        if not tldr:
            tldr = sections.get("rapid tl;dr", "").strip()
        
        # Parse Key Moments
        key_moments_text = sections.get("key moments", "")
        if not key_moments_text:
            # Try alternative section name
            key_moments_text = sections.get("key moments (timestamp → insight)", "")
        key_moments = _parse_key_moments(key_moments_text)
        
        # Parse Key Concepts
        key_concepts = sections.get("key concepts & insights", "").strip()
        
        # Parse Resources
        resources_section = sections.get("data, tools & resources", "")
        tools, resources = _parse_resources(resources_section)
        
        # Parse Learning Pack
        learning_pack = sections.get("accelerated-learning pack", "")
        if not learning_pack:
            learning_pack = sections.get("summary & calls-to-action", "")
        flashcards = _parse_flashcards(learning_pack)
        glossary = _parse_glossary(learning_pack)
        quiz_questions = _parse_quiz(learning_pack)
        
        return GumloopSummary(
            title=title,
            speakers=speakers,
            duration=duration,
            channel=channel,
            synopsis=synopsis,
            tldr=tldr,
            key_moments=key_moments,
            key_concepts=key_concepts,
            tools=tools,
            resources=resources,
            flashcards=flashcards,
            glossary=glossary,
            quiz_questions=quiz_questions,
            full_content=content
        )
        
    except Exception as e:
        logger.error(f"Error parsing Gumloop summary: {str(e)}")
        return None


def _extract_sections(content: str) -> Dict[str, str]:
    """Extract major sections from the content"""
    sections = {}
    lines = content.split('\n')
    current_section = None
    current_content = []
    
    for line in lines:
        # Check if this is a section header (## Header)
        if line.strip().startswith('## '):
            # Save previous section
            if current_section:
                sections[current_section.lower()] = '\n'.join(current_content).strip()
            
            # Start new section
            current_section = line.strip()[3:]  # Remove "## "
            current_content = []
        elif current_section:
            current_content.append(line)
    
    # Save last section
    if current_section:
        sections[current_section.lower()] = '\n'.join(current_content).strip()
    
    return sections


def _extract_field(text: str, field_name: str) -> str:
    """Extract a field value from text like '**Field**: value'"""
    pattern = rf'\*\*{field_name}\*\*\s*:\s*(.+?)(?=\n|$)'
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1).strip() if match else ""


def _extract_speakers(text: str) -> List[str]:
    """Extract speakers from video context"""
    speakers_text = _extract_field(text, "Speakers")
    if not speakers_text:
        return []
    
    # Handle formats like "{Speaker A}, {Speaker B}" or "Speaker A, Speaker B"
    speakers_text = re.sub(r'[{}]', '', speakers_text)
    speakers = [s.strip() for s in speakers_text.split(',')]
    
    # Filter out placeholder text
    speakers = [s for s in speakers if s and not s.startswith('Speaker ')]
    return speakers


def _parse_key_moments(text: str) -> List[GumloopKeyMoment]:
    """Parse key moments with timestamps"""
    moments = []
    
    # Debug: print the text being parsed
    if text:
        logger.debug(f"Parsing key moments from text: {text[:200]}...")
    
    # Pattern for "– **03:21** Big-picture metric..."
    pattern = r'[–-]\s*\*\*(\d{1,2}:\d{2}(?::\d{2})?)\*\*\s*(.+?)(?=\n|$)'
    
    for match in re.finditer(pattern, text, re.MULTILINE):
        timestamp = match.group(1)
        insight = match.group(2).strip()
        moments.append(GumloopKeyMoment(timestamp=timestamp, insight=insight))
        logger.debug(f"Found key moment: {timestamp} - {insight[:50]}...")
    
    logger.debug(f"Parsed {len(moments)} key moments")
    return moments


def _parse_resources(text: str) -> Tuple[List[str], List[str]]:
    """Parse tools and resources from the resources section"""
    tools = []
    resources = []
    
    lines = text.split('\n')
    current_subsection = None
    
    for line in lines:
        line = line.strip()
        
        # Check for subsection headers
        if 'tools' in line.lower() and ':' in line:
            current_subsection = 'tools'
        elif 'resources' in line.lower() and ':' in line:
            current_subsection = 'resources'
        # Parse bullet points
        elif line.startswith(('•', '-', '*')) and current_subsection:
            item = re.sub(r'^[•\-*]\s*', '', line).strip()
            if item:
                if current_subsection == 'tools':
                    tools.append(item)
                else:
                    resources.append(item)
    
    return tools, resources


def _parse_flashcards(text: str) -> List[Dict[str, str]]:
    """Parse Feynman Flashcards from learning pack"""
    flashcards = []
    
    # Look for flashcards section
    if 'feynman flashcards' in text.lower():
        # Find the flashcards section
        flashcards_start = text.lower().find('feynman flashcards')
        if flashcards_start != -1:
            flashcards_text = text[flashcards_start:]
            # Stop at next major section (glossary, quiz, etc.)
            next_section = re.search(r'\n[–-]\s*\*\*(?:Glossary|Quick Quiz)', flashcards_text)
            if next_section:
                flashcards_text = flashcards_text[:next_section.start()]
            
            # Multiple patterns to handle different formats
            
            # Pattern 1: Numbered Q: question A: answer format (most specific)
            pattern1 = r'^\s*\d+\.\s*Q:\s*(.+?)\s*A:\s*(.+?)(?=\n|$)'
            for match in re.finditer(pattern1, flashcards_text, re.MULTILINE):
                question = match.group(1).strip()
                answer = match.group(2).strip()
                flashcards.append({"question": question, "answer": answer})
            
            # Pattern 1b: Bullet point Q: question / A: answer format
            if len(flashcards) == 0:
                pattern1b = r'^\s*-\s*Q:\s*(.+?)\s*[/|]\s*A:\s*(.+?)(?=\n|$)'
                for match in re.finditer(pattern1b, flashcards_text, re.MULTILINE):
                    question = match.group(1).strip()
                    answer = match.group(2).strip()
                    flashcards.append({"question": question, "answer": answer})
            
            # Pattern 2: Numbered list format (e.g., "1. Define 'authentic stage signaling.'")
            if len(flashcards) == 0:
                pattern2 = r'^\s*\d+\.\s*(.+?)(?=\n\s*\d+\.|$)'
                for match in re.finditer(pattern2, flashcards_text, re.MULTILINE | re.DOTALL):
                    item = match.group(1).strip()
                    if item and len(item) > 10:  # Filter out short items
                        # Create flashcard from statement (use as question with generic answer)
                        flashcards.append({
                            "question": item,
                            "answer": "See video content for detailed explanation"
                        })
            
            # Pattern 3: Simple bullet points (fallback)
            if len(flashcards) == 0:
                pattern3 = r'^\s*-\s*(.+?)(?=\n\s*-|$)'
                for match in re.finditer(pattern3, flashcards_text, re.MULTILINE | re.DOTALL):
                    item = match.group(1).strip()
                    if item and len(item) > 10 and not item.lower().startswith('feynman'):
                        flashcards.append({
                            "question": item,
                            "answer": "See video content for detailed explanation"
                        })
    
    return flashcards


def _parse_glossary(text: str) -> List[Dict[str, str]]:
    """Parse glossary terms from learning pack"""
    glossary = []
    
    # Look for glossary section
    if 'glossary' in text.lower():
        # Find the glossary section
        glossary_start = text.lower().find('glossary')
        if glossary_start != -1:
            glossary_text = text[glossary_start:]
            # Stop at next major section
            next_section = re.search(r'\n[–-]\s*\*\*(?:Quick Quiz|Novel-Idea)', glossary_text)
            if next_section:
                glossary_text = glossary_text[:next_section.start()]
            
            # Multiple patterns to handle different formats
            
            # Pattern 1: "- Term: Definition" format
            pattern1 = r'^\s*-\s*([^:\n]+?):\s*(.+?)(?=\n|$)'
            for match in re.finditer(pattern1, glossary_text, re.MULTILINE):
                term = match.group(1).strip()
                definition = match.group(2).strip()
                # Filter out section headers and empty items
                if term and definition and not term.lower().startswith('glossary'):
                    glossary.append({"term": term, "definition": definition})
            
            # Pattern 2: Simple list format like "GMB, EEAT, Call-Tracking, Rich-People Niche, etc."
            if len(glossary) == 0:
                # Look for enumerated terms - more flexible pattern
                terms_match = re.search(r'glossary.*?(?:\(\d+\))?[:\s]*(.+?)(?=\n[–-]|\Z)', glossary_text, re.IGNORECASE | re.DOTALL)
                if terms_match:
                    terms_text = terms_match.group(1).strip()
                    # Remove common prefixes and cleanup
                    terms_text = re.sub(r'^e\.g\.?,?\s*', '', terms_text, flags=re.IGNORECASE)
                    terms_text = re.sub(r'^\*\*[^:]*:\s*', '', terms_text)  # Remove **label: prefixes
                    terms_text = re.sub(r'^\(\d+\):\s*', '', terms_text)  # Remove (number): prefixes
                    
                    # Split by common separators
                    term_list = re.split(r'[,;]|,\s*etc\.?|;\s*etc\.?', terms_text)
                    for term in term_list:
                        term = term.strip()
                        # Clean up the term
                        term = re.sub(r'^[–-]\s*', '', term)  # Remove bullet points
                        term = re.sub(r'^\*\*|\*\*$', '', term)  # Remove bold markdown
                        if term and len(term) > 1 and not term.lower() in ['etc', 'e.g.', 'eg', '', 'and more']:
                            # Create glossary entry with generic definition
                            glossary.append({
                                "term": term,
                                "definition": "Key term mentioned in the video content"
                            })
    
    return glossary


def _parse_quiz(text: str) -> List[Dict[str, str]]:
    """Parse quiz questions from learning pack"""
    quiz_questions = []
    
    # Look for quiz section
    if 'quick quiz' in text.lower():
        # Find the quiz section
        quiz_start = text.lower().find('quick quiz')
        if quiz_start != -1:
            quiz_text = text[quiz_start:]
            # Stop at next major section
            next_section = re.search(r'\n[–-]\s*\*\*(?:Novel-Idea)', quiz_text)
            if next_section:
                quiz_text = quiz_text[:next_section.start()]
            
            # Multiple patterns to handle different formats
            
            # Pattern 1: "- Q: question / A: answer" format
            pattern1 = r'(?:^\s*\d+\.\s*|^\s*-\s*)Q:\s*(.+?)\s*[/|]\s*A:\s*(.+?)(?=\n|$)'
            for match in re.finditer(pattern1, quiz_text, re.MULTILINE):
                question = match.group(1).strip()
                answer = match.group(2).strip()
                quiz_questions.append({"question": question, "answer": answer})
            
            # Pattern 2: Simple bullet point questions (no explicit answers)
            if len(quiz_questions) == 0:
                pattern2 = r'^\s*-\s*(.+?)(?=\n\s*-|$)'
                for match in re.finditer(pattern2, quiz_text, re.MULTILINE | re.DOTALL):
                    question = match.group(1).strip()
                    # Clean up question format
                    question = re.sub(r'^Q:\s*', '', question)  # Remove Q: prefix
                    if question and len(question) > 10 and not question.lower().startswith('quick quiz'):
                        quiz_questions.append({
                            "question": question,
                            "answer": "Review video content for the answer"
                        })
            
            # Pattern 3: Numbered list format
            if len(quiz_questions) == 0:
                pattern3 = r'^\s*\d+\.\s*(.+?)(?=\n\s*\d+\.|$)'
                for match in re.finditer(pattern3, quiz_text, re.MULTILINE | re.DOTALL):
                    question = match.group(1).strip()
                    if question and len(question) > 10:
                        quiz_questions.append({
                            "question": question,
                            "answer": "Review video content for the answer"
                        })
    
    return quiz_questions


def extract_key_points_from_gumloop(gumloop_summary: GumloopSummary) -> List[str]:
    """Extract key points from Gumloop summary for API response"""
    key_points = []
    
    # Use key moments insights as key points
    for moment in gumloop_summary.key_moments[:5]:  # Limit to 5
        key_points.append(moment.insight)
    
    # If not enough, extract from key concepts
    if len(key_points) < 3:
        # Extract first few sentences from key concepts
        sentences = gumloop_summary.key_concepts.split('.')[:3]
        for sentence in sentences:
            if sentence.strip() and len(sentence.strip()) > 20:
                key_points.append(sentence.strip() + '.')
    
    return key_points[:5]  # Maximum 5 key points