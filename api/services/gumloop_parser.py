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
class GumloopFramework:
    name: str
    description: str

@dataclass
class GumloopPlaybook:
    trigger: str
    action: str

@dataclass
class GumloopNovelIdea:
    insight: str
    score: int

@dataclass
class GumloopInsightEnrichment:
    stats_tools_links: List[str]
    sentiment: str
    risks_blockers_questions: List[str]

@dataclass
class GumloopAcceleratedLearningPack:
    tldr100: str
    feynman_flashcards: List[Dict[str, str]]
    glossary: List[Dict[str, str]]
    quick_quiz: List[Dict[str, str]]
    novel_idea_meter: List[GumloopNovelIdea]

@dataclass
class GumloopSummary:
    # Video Context
    title: str
    speakers: List[str]
    duration: str
    channel: str
    synopsis: str
    video_url: Optional[str]
    language: str
    generated_on: str
    version: str
    
    # Main content sections
    tldr: str
    key_moments: List[GumloopKeyMoment]
    frameworks: List[GumloopFramework]
    debunked_assumptions: List[str]
    in_practice: List[str]
    playbooks: List[GumloopPlaybook]
    
    # Enrichment
    insight_enrichment: Optional[GumloopInsightEnrichment]
    
    # Learning Pack
    accelerated_learning_pack: Optional[GumloopAcceleratedLearningPack]
    
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
        "## TL;DR",
        "## TL;DR (≤100 words)",
        "## Key Moments",
        "## Strategic Frameworks",
        "## Debunked Assumptions", 
        "## In Practice",
        "## Playbooks & Heuristics",
        "## Insight Enrichment",
        "## Accelerated Learning Pack",
        "### Feynman Flashcards",
        "### Glossary",
        "### Quick Quiz", 
        "### Novel-Idea Meter",
        "## How to Think Like"
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
        logger.info(f"Extracted sections: {list(sections.keys())}")
        for section_name, section_content in sections.items():
            logger.info(f"Section '{section_name}' length: {len(section_content)} chars")
            if section_content:
                logger.info(f"Section '{section_name}' preview: {section_content[:100]}...")
        
        # Parse Video Context
        video_context = sections.get("video context", "")
        title = _extract_field(video_context, "Title")
        speakers = _extract_speakers(video_context)
        duration = _extract_field(video_context, "Duration")
        channel = _extract_field(video_context, "Channel")
        synopsis = _extract_field(video_context, "Synopsis")
        video_url = _extract_field(video_context, "Video URL") or ""
        language = _extract_field(video_context, "Language") or "en"
        generated_on = _extract_field(video_context, "Generated On") or ""
        version = _extract_field(video_context, "Version") or "v1.0"
        
        # Parse TL;DR - exact header name
        tldr = sections.get("tl;dr (≤100 words)", "").strip()
        
        # Parse Key Moments
        key_moments_text = sections.get("key moments", "")
        key_moments = _parse_key_moments(key_moments_text)
        
        # Parse Strategic Frameworks
        frameworks_text = sections.get("strategic frameworks", "")
        frameworks = _parse_frameworks(frameworks_text)
        
        # Parse Debunked Assumptions
        debunked_text = sections.get("debunked assumptions", "")
        debunked_assumptions = _parse_list_items(debunked_text)
        
        # Parse In Practice
        in_practice_text = sections.get("in practice", "")
        in_practice = _parse_list_items(in_practice_text)
        
        # Parse Playbooks & Heuristics
        playbooks_text = sections.get("playbooks & heuristics", "")
        playbooks = _parse_playbooks(playbooks_text)
        
        # Parse Insight Enrichment
        enrichment_text = sections.get("insight enrichment", "")
        insight_enrichment = _parse_insight_enrichment(enrichment_text)
        
        # Parse Accelerated Learning Pack from individual sections
        accelerated_learning_pack = _parse_accelerated_learning_pack_from_sections(sections)
        
        return GumloopSummary(
            title=title,
            speakers=speakers,
            duration=duration,
            channel=channel,
            synopsis=synopsis,
            video_url=video_url,
            language=language,
            generated_on=generated_on,
            version=version,
            tldr=tldr,
            key_moments=key_moments,
            frameworks=frameworks,
            debunked_assumptions=debunked_assumptions,
            in_practice=in_practice,
            playbooks=playbooks,
            insight_enrichment=insight_enrichment,
            accelerated_learning_pack=accelerated_learning_pack,
            full_content=content
        )
        
    except Exception as e:
        logger.error(f"Error parsing Gumloop summary: {str(e)}")
        return None


def _extract_sections(content: str) -> Dict[str, str]:
    """Extract major sections from the markdown content within ```markdown blocks"""
    sections = {}
    
    # First, extract the markdown section
    markdown_start = content.find('```markdown')
    if markdown_start == -1:
        # Fallback: treat entire content as markdown
        markdown_content = content
    else:
        markdown_start += len('```markdown')
        markdown_end = content.find('```', markdown_start)
        if markdown_end == -1:
            markdown_content = content[markdown_start:]
        else:
            markdown_content = content[markdown_start:markdown_end]
    
    # Define the exact section headers to look for
    section_headers = [
        "## Video Context",
        "## TL;DR (≤100 words)",
        "## Key Moments", 
        "## Strategic Frameworks",
        "## Debunked Assumptions",
        "## In Practice",
        "## Playbooks & Heuristics",
        "## Insight Enrichment",
        "### Feynman Flashcards",
        "### Glossary", 
        "### Quick Quiz",
        "### Novel-Idea Meter",
        "## How to Think Like"
    ]
    
    # Split content by sections
    for i, header in enumerate(section_headers):
        if header in markdown_content:
            start_idx = markdown_content.find(header)
            if start_idx != -1:
                # Find the end of this section
                content_start = start_idx + len(header)
                
                # Look for the next section header or ---
                next_section_start = len(markdown_content)
                for next_header in section_headers[i+1:]:
                    next_idx = markdown_content.find(next_header, content_start)
                    if next_idx != -1:
                        next_section_start = min(next_section_start, next_idx)
                
                # Also look for --- delimiter
                delimiter_idx = markdown_content.find('\n---', content_start)
                if delimiter_idx != -1:
                    next_section_start = min(next_section_start, delimiter_idx)
                
                # Extract section content
                section_content = markdown_content[content_start:next_section_start].strip()
                
                # Clean up the header name for storage
                clean_header = header.replace('### ', '').replace('## ', '').lower()
                sections[clean_header] = section_content
    
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
    
    # Pattern for "– **\*00:05** → Early sponsors..." or "– **03:20*** → Chapman's mantra..."
    pattern = r'[–-]\s*\*\*\\?\*?(\d{1,2}:\d{2}(?::\d{2})?)\*+\s*(?:→|->|→)\s*(.+?)(?=\n[–-]|\n\n|$)'
    
    for match in re.finditer(pattern, text, re.MULTILINE | re.DOTALL):
        timestamp = match.group(1)
        insight = match.group(2).strip()
        # Clean up any extra formatting
        insight = re.sub(r'\s+', ' ', insight)
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


def _parse_list_items(text: str) -> List[str]:
    """Parse bullet point list items from text"""
    items = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        # Match bullet points: -, *, •, or numbered lists
        if re.match(r'^[-*•]\s+', line) or re.match(r'^\d+\.\s+', line):
            # Remove the bullet/number
            item = re.sub(r'^[-*•]\s+|^\d+\.\s+', '', line).strip()
            
            # Handle "assumption → reality" format for debunked assumptions
            if '→' in item:
                # For debunked assumptions, we want the complete statement
                items.append(item)
            elif item:
                items.append(item)
    
    return items

def _parse_frameworks(text: str) -> List[GumloopFramework]:
    """Parse strategic frameworks from text (multiple formats)"""
    frameworks = []
    lines = text.split('\n')
    
    # First try table format
    in_table = False
    for line in lines:
        line = line.strip()
        
        # Skip table headers and separators
        if line.startswith('| Framework') or line.startswith('|-'):
            in_table = True
            continue
        
        # Parse table rows
        if in_table and line.startswith('|') and line.count('|') >= 3:
            parts = [part.strip() for part in line.split('|')[1:-1]]  # Remove empty first/last
            if len(parts) >= 2:
                name = parts[0].strip()
                description = parts[1].strip()
                if len(parts) >= 3:
                    # Combine essence and application
                    application = parts[2].strip()
                    description = f"{description} - {application}"
                
                if name and description:
                    frameworks.append(GumloopFramework(name=name, description=description))
    
    # If no table format, try numbered list format
    if not frameworks:
        for line in lines:
            line = line.strip()
            
            # Match numbered format: "1. Movement Loop: description"
            numbered_match = re.match(r'^\d+\.\s*(.+?):\s*(.+)$', line)
            if numbered_match:
                name = numbered_match.group(1).strip()
                description = numbered_match.group(2).strip()
                frameworks.append(GumloopFramework(name=name, description=description))
    
    # Fallback: look for bold framework names with descriptions
    if not frameworks:
        current_name = None
        current_description = []
        
        for line in lines:
            line = line.strip()
            
            # Check for framework name (bold text)
            if line.startswith('**') and line.endswith('**'):
                # Save previous framework if exists
                if current_name and current_description:
                    frameworks.append(GumloopFramework(
                        name=current_name,
                        description=' '.join(current_description).strip()
                    ))
                
                # Start new framework
                current_name = line.strip('*').strip()
                current_description = []
            elif current_name and line:
                # Add to current framework description
                current_description.append(line)
        
        # Save last framework
        if current_name and current_description:
            frameworks.append(GumloopFramework(
                name=current_name,
                description=' '.join(current_description).strip()
            ))
    
    return frameworks

def _parse_playbooks(text: str) -> List[GumloopPlaybook]:
    """Parse playbooks & heuristics from text"""
    playbooks = []
    lines = text.split('\n')
    
    # First try table format parsing
    in_table = False
    for line in lines:
        line = line.strip()
        
        # Skip table headers and separators
        if 'trigger' in line.lower() and '|' in line:
            in_table = True
            continue
        elif line.startswith('|-') or line.startswith('|--'):
            continue
        
        # Parse table rows: | trigger | condition | action |
        if in_table and line.startswith('|') and line.count('|') >= 3:
            parts = [part.strip() for part in line.split('|')[1:-1]]  # Remove empty first/last
            if len(parts) >= 2:
                trigger = parts[0].strip()
                # Combine remaining parts as action
                action = ' '.join(parts[1:]).strip()
                
                if trigger and action:
                    playbooks.append(GumloopPlaybook(trigger=trigger, action=action))
    
    # If no table format found, try other formats
    if not playbooks:
        for line in lines:
            line = line.strip()
            
            # Match IF/THEN format: "IF the rulebook is silent, THEN assume it's legal until banned."
            if_then_match = re.match(r'^[•\-*]?\s*IF\s+(.+?),?\s+THEN\s+(.+)\.?$', line, re.IGNORECASE)
            if if_then_match:
                trigger = if_then_match.group(1).strip()
                action = if_then_match.group(2).strip()
                playbooks.append(GumloopPlaybook(trigger=trigger, action=action))
                continue
            
            # Fallback: Match arrow format: "When X → Do Y" or "If X → Then Y"
            arrow_match = re.match(r'^[•\-*]?\s*(.+?)\s*[→➔]\s*(.+)$', line)
            if arrow_match:
                trigger = arrow_match.group(1).strip()
                action = arrow_match.group(2).strip()
                
                # Clean up common prefixes
                trigger = re.sub(r'^(When|If)\s+', '', trigger, flags=re.IGNORECASE)
                action = re.sub(r'^(Do|Then)\s+', '', action, flags=re.IGNORECASE)
                
                playbooks.append(GumloopPlaybook(trigger=trigger, action=action))
    
    return playbooks

def _parse_insight_enrichment(text: str) -> Optional[GumloopInsightEnrichment]:
    """Parse insight enrichment section"""
    if not text:
        return None
    
    stats_tools_links = []
    sentiment = "neutral"
    risks_blockers_questions = []
    
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        
        # Parse bullet format: "- Stats: content", "- Tools: content", etc.
        if line.startswith(('-', '*', '•')):
            # Remove bullet and split on colon
            content = re.sub(r'^[-*•]\s+', '', line).strip()
            if ':' in content:
                label, value = content.split(':', 1)
                label = label.strip().lower()
                value = value.strip()
                
                if 'stats' in label or 'tools' in label or 'links' in label:
                    # Split on semicolons or commas for multiple items
                    items = re.split(r'[;,]', value)
                    for item in items:
                        item = item.strip()
                        if item:
                            stats_tools_links.append(item)
                elif 'sentiment' in label:
                    # Extract sentiment from description
                    if 'positive' in value.lower() or 'admiring' in value.lower():
                        sentiment = 'positive'
                    elif 'negative' in value.lower() or 'critical' in value.lower():
                        sentiment = 'negative'
                    else:
                        sentiment = 'neutral'
                elif 'risks' in label or 'blockers' in label or 'questions' in label:
                    # Split on semicolons or commas for multiple items
                    items = re.split(r'[;,]', value)
                    for item in items:
                        item = item.strip()
                        if item:
                            risks_blockers_questions.append(item)
    
    return GumloopInsightEnrichment(
        stats_tools_links=stats_tools_links,
        sentiment=sentiment,
        risks_blockers_questions=risks_blockers_questions
    )

def _parse_accelerated_learning_pack_from_sections(sections: Dict[str, str]) -> Optional[GumloopAcceleratedLearningPack]:
    """Parse the accelerated learning pack from individual sections"""
    try:
        # Get the TL;DR
        tldr100 = sections.get("tl;dr (≤100 words)", "").strip()
        
        # Parse Feynman Flashcards
        flashcards_text = sections.get("feynman flashcards", "")
        flashcards = _parse_flashcards(flashcards_text)
        
        # Parse Glossary
        glossary_text = sections.get("glossary", "")
        glossary = _parse_glossary(glossary_text)
        
        # Parse Quick Quiz
        quiz_text = sections.get("quick quiz", "")
        quiz_questions = _parse_quiz(quiz_text)
        
        # Parse Novel-Idea Meter
        novel_text = sections.get("novel-idea meter", "")
        novel_ideas = _parse_novel_ideas(novel_text)
        
        return GumloopAcceleratedLearningPack(
            tldr100=tldr100,
            feynman_flashcards=flashcards,
            glossary=glossary,
            quick_quiz=quiz_questions,
            novel_idea_meter=novel_ideas
        )
    except Exception as e:
        logger.error(f"Error parsing accelerated learning pack: {e}")
        return None

def _parse_accelerated_learning_pack(text: str) -> Optional[GumloopAcceleratedLearningPack]:
    """Parse the full accelerated learning pack section (legacy)"""
    if not text:
        return None
    
    # Use existing parsers for subsections
    flashcards = _parse_flashcards(text)
    glossary = _parse_glossary(text)
    quiz_questions = _parse_quiz(text)
    novel_ideas = _parse_novel_ideas(text)
    
    # Extract TL;DR-100
    tldr100 = ""
    tldr_match = re.search(r'###?\s*(?:TL;DR|TLDR)[-\s]*100.*?\n(.+?)(?=\n###?|\n\*\*|$)', text, re.DOTALL)
    if tldr_match:
        tldr100 = tldr_match.group(1).strip()
    
    return GumloopAcceleratedLearningPack(
        tldr100=tldr100,
        feynman_flashcards=[{"q": q, "a": a} for q, a in zip(flashcards[::2], flashcards[1::2])] if flashcards else [],
        glossary=[{"term": term, "definition": "Key term from video"} for term in glossary] if isinstance(glossary, list) else glossary,
        quick_quiz=[{"q": q["question"], "a": q["answer"]} for q in quiz_questions],
        novel_idea_meter=novel_ideas
    )

def _parse_novel_ideas(text: str) -> List[GumloopNovelIdea]:
    """Parse novel-idea meter from text"""
    novel_ideas = []
    
    # Find novel-idea meter section
    if 'novel-idea meter' in text.lower() or 'novel idea meter' in text.lower():
        lines = text.split('\n')
        in_novel_section = False
        
        for line in lines:
            if 'novel' in line.lower() and 'idea' in line.lower():
                in_novel_section = True
                continue
            
            if in_novel_section:
                # Match format: "• Idea Name – 5" or "- Idea: 4/5"
                score_match = re.match(r'^[•\-*]\s*(.+?)\s*[–\-:]\s*(\d+)(?:/5)?', line.strip())
                if score_match:
                    insight = score_match.group(1).strip()
                    score = int(score_match.group(2))
                    novel_ideas.append(GumloopNovelIdea(insight=insight, score=score))
    
    return novel_ideas

def extract_key_points_from_gumloop(gumloop_summary: GumloopSummary) -> List[str]:
    """Extract key points from Gumloop summary for API response"""
    key_points = []
    
    # Use key moments insights as key points
    for moment in gumloop_summary.key_moments[:5]:  # Limit to 5
        key_points.append(moment.insight)
    
    # If not enough, extract from frameworks
    if len(key_points) < 3:
        for framework in gumloop_summary.frameworks[:2]:
            key_points.append(f"{framework.name}: {framework.description[:100]}...")
    
    return key_points[:5]  # Maximum 5 key points