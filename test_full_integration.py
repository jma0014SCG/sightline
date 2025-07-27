#!/usr/bin/env python3
"""
Test the full integration: API response → tRPC → Frontend format
"""

import sys
import os
import asyncio
import json

# Add the api directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'api'))

from test_gumloop_integration import SAMPLE_GUMLOOP_OUTPUT
from services.gumloop_parser import parse_gumloop_summary, extract_key_points_from_gumloop
from models.responses import SummarizeResponse, SummaryMetadata, KeyMoment, Flashcard, QuizQuestion

async def test_full_integration():
    """Test the complete data flow"""
    
    print("🧪 Testing Full Integration: API → tRPC → Frontend")
    print("=" * 60)
    
    # Step 1: Simulate backend API response
    print("\n1️⃣ Backend API Response Generation")
    gumloop_data = parse_gumloop_summary(SAMPLE_GUMLOOP_OUTPUT)
    
    if not gumloop_data:
        print("❌ Failed to parse Gumloop data")
        return
    
    # Create structured response objects (as done in summarize.py)
    metadata = SummaryMetadata(
        title=gumloop_data.title,
        channel=gumloop_data.channel,
        duration=gumloop_data.duration,
        speakers=gumloop_data.speakers,
        synopsis=gumloop_data.synopsis,
        tone="informative"
    )
    
    key_moments = [
        KeyMoment(timestamp=moment.timestamp, insight=moment.insight)
        for moment in gumloop_data.key_moments
    ]
    
    flashcards = [
        Flashcard(question=card["question"], answer=card["answer"])
        for card in gumloop_data.flashcards
    ]
    
    quiz_questions = [
        QuizQuestion(question=q["question"], answer=q["answer"])
        for q in gumloop_data.quiz_questions
    ]
    
    # Add glossary
    from models.responses import GlossaryTerm
    glossary = [
        GlossaryTerm(term=term["term"], definition=term["definition"])
        for term in gumloop_data.glossary
    ]
    
    # Create the API response
    api_response = SummarizeResponse(
        video_id="test123",
        video_url="https://youtube.com/watch?v=test123",
        video_title=gumloop_data.title,
        channel_name=gumloop_data.channel,
        channel_id="test_channel",
        duration=2730,  # 45:30 in seconds
        thumbnail_url="https://img.youtube.com/vi/test123/maxresdefault.jpg",
        summary=gumloop_data.full_content,
        key_points=extract_key_points_from_gumloop(gumloop_data),
        user_id="test-user",
        metadata=metadata,
        key_moments=key_moments,
        flashcards=flashcards,
        quiz_questions=quiz_questions,
        glossary=glossary,
        tools=gumloop_data.tools,
        resources=gumloop_data.resources
    )
    
    print(f"   ✅ API Response created with:")
    print(f"      📄 Summary: {len(api_response.summary)} chars")
    print(f"      📍 Key Points: {len(api_response.key_points)}")
    print(f"      🎯 Key Moments: {len(api_response.key_moments)}")
    print(f"      🗂️ Flashcards: {len(api_response.flashcards)}")
    print(f"      ❓ Quiz Questions: {len(api_response.quiz_questions)}")
    print(f"      📖 Glossary Terms: {len(api_response.glossary)}")
    print(f"      🛠️ Tools: {len(api_response.tools)}")
    print(f"      📚 Resources: {len(api_response.resources)}")
    
    # Step 2: Simulate tRPC processing (as done in summary.ts)
    print("\n2️⃣ tRPC Router Processing")
    
    # Convert to dict (simulating the JSON received by tRPC)
    data = api_response.dict()
    
    # Simulate the metadata preparation from tRPC router
    tRPC_metadata = {
        **(data.get("metadata", {}) or {}),
        "key_moments": data.get("key_moments", []),
        "flashcards": data.get("flashcards", []),
        "quiz_questions": data.get("quiz_questions", []),
        "glossary": data.get("glossary", []),
        "tools": data.get("tools", []),
        "resources": data.get("resources", [])
    }
    
    # Simulate what gets saved to database
    database_record = {
        "id": "clu123456789",
        "userId": "test-user-id",
        "videoId": data["video_id"],
        "videoUrl": data["video_url"],
        "videoTitle": data["video_title"],
        "channelName": data["channel_name"],
        "channelId": data["channel_id"],
        "duration": data["duration"],
        "thumbnailUrl": data["thumbnail_url"],
        "content": data["summary"],
        "keyPoints": data["key_points"],
        "metadata": tRPC_metadata,  # This is where our structured data goes
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
    }
    
    print(f"   ✅ Database record prepared:")
    print(f"      📄 Content: {len(database_record['content'])} chars")
    print(f"      📍 Key Points: {len(database_record['keyPoints'])}")
    print(f"      📦 Metadata keys: {list(tRPC_metadata.keys())}")
    print(f"         🎯 Key Moments in metadata: {len(tRPC_metadata.get('key_moments', []))}")
    print(f"         🗂️ Flashcards in metadata: {len(tRPC_metadata.get('flashcards', []))}")
    print(f"         ❓ Quiz Questions in metadata: {len(tRPC_metadata.get('quiz_questions', []))}")
    print(f"         📖 Glossary in metadata: {len(tRPC_metadata.get('glossary', []))}")
    print(f"         🛠️ Tools in metadata: {len(tRPC_metadata.get('tools', []))}")
    print(f"         📚 Resources in metadata: {len(tRPC_metadata.get('resources', []))}")
    
    # Step 3: Simulate Frontend component processing
    print("\n3️⃣ Frontend Component Processing")
    
    # This simulates what the SummaryViewer component receives
    summary_props = {
        "content": database_record["content"],
        "videoTitle": database_record["videoTitle"],
        "channelName": database_record["channelName"],
        "keyPoints": database_record["keyPoints"],
        "duration": database_record["duration"],
        "thumbnailUrl": database_record["thumbnailUrl"],
        "metadata": database_record["metadata"],
        # These would be None for Gumloop data since it's in metadata
        "key_moments": None,
        "flashcards": None,
        "quiz_questions": None
    }
    
    # Simulate the helper functions from SummaryViewer
    def getFlashcards():
        if summary_props.get("flashcards"):
            return summary_props["flashcards"]
        if summary_props.get("metadata") and isinstance(summary_props["metadata"], dict):
            return summary_props["metadata"].get("flashcards", [])
        return []
    
    def getQuizQuestions():
        if summary_props.get("quiz_questions"):
            return summary_props["quiz_questions"]
        if summary_props.get("metadata") and isinstance(summary_props["metadata"], dict):
            return summary_props["metadata"].get("quiz_questions", [])
        return []
    
    def getKeyMoments():
        if summary_props.get("key_moments"):
            return summary_props["key_moments"]
        if summary_props.get("metadata") and isinstance(summary_props["metadata"], dict):
            return summary_props["metadata"].get("key_moments", [])
        return []
    
    def getGlossary():
        if summary_props.get("metadata") and isinstance(summary_props["metadata"], dict):
            return summary_props["metadata"].get("glossary", [])
        return []
    
    def getTools():
        if summary_props.get("metadata") and isinstance(summary_props["metadata"], dict):
            return summary_props["metadata"].get("tools", [])
        return []
    
    def getResources():
        if summary_props.get("metadata") and isinstance(summary_props["metadata"], dict):
            return summary_props["metadata"].get("resources", [])
        return []
    
    # Test the extraction
    frontend_flashcards = getFlashcards()
    frontend_quiz = getQuizQuestions()
    frontend_moments = getKeyMoments()
    frontend_glossary = getGlossary()
    frontend_tools = getTools()
    frontend_resources = getResources()
    
    print(f"   ✅ Frontend component extracts:")
    print(f"      🎯 Key Moments: {len(frontend_moments)}")
    if frontend_moments:
        print(f"         Example: {frontend_moments[0]['timestamp']} - {frontend_moments[0]['insight'][:50]}...")
    
    print(f"      🗂️ Flashcards: {len(frontend_flashcards)}")
    if frontend_flashcards:
        print(f"         Example: Q: {frontend_flashcards[0]['question'][:40]}...")
        print(f"                  A: {frontend_flashcards[0]['answer'][:40]}...")
    
    print(f"      ❓ Quiz Questions: {len(frontend_quiz)}")
    if frontend_quiz:
        print(f"         Example: Q: {frontend_quiz[0]['question'][:40]}...")
        print(f"                  A: {frontend_quiz[0]['answer'][:40]}...")
    
    print(f"      📖 Glossary Terms: {len(frontend_glossary)}")
    if frontend_glossary:
        print(f"         Example: {frontend_glossary[0]['term']}: {frontend_glossary[0]['definition'][:40]}...")
    
    print(f"      🛠️ Tools: {len(frontend_tools)}")
    if frontend_tools:
        print(f"         Examples: {', '.join(frontend_tools[:2])}...")
    
    print(f"      📚 Resources: {len(frontend_resources)}")
    if frontend_resources:
        print(f"         Examples: {', '.join(frontend_resources[:2])}...")
    
    # Step 4: Verify data integrity
    print("\n4️⃣ Data Integrity Check")
    
    original_moments = len(gumloop_data.key_moments)
    original_flashcards = len(gumloop_data.flashcards)
    original_quiz = len(gumloop_data.quiz_questions)
    original_glossary = len(gumloop_data.glossary)
    original_tools = len(gumloop_data.tools)
    original_resources = len(gumloop_data.resources)
    
    integrity_check = {
        "key_moments": len(frontend_moments) == original_moments,
        "flashcards": len(frontend_flashcards) == original_flashcards,
        "quiz_questions": len(frontend_quiz) == original_quiz,
        "glossary": len(frontend_glossary) == original_glossary,
        "tools": len(frontend_tools) == original_tools,
        "resources": len(frontend_resources) == original_resources
    }
    
    print(f"   🔍 Data preserved through pipeline:")
    for data_type, preserved in integrity_check.items():
        status = "✅" if preserved else "❌"
        print(f"      {status} {data_type}: {preserved}")
    
    all_preserved = all(integrity_check.values())
    if all_preserved:
        print(f"\n🎉 SUCCESS! All structured Gumloop data flows correctly through the pipeline!")
        print(f"   Backend → tRPC → Frontend integration working perfectly!")
    else:
        print(f"\n⚠️ WARNING: Some data was lost in the pipeline")
    
    # Step 5: Generate test summary for frontend
    print("\n5️⃣ Frontend Test Summary")
    print(f"   📊 Summary Card will show:")
    print(f"      🏷️ Title: {summary_props['videoTitle']}")
    print(f"      📺 Channel: {summary_props['channelName']}")
    print(f"      ⏱️ Duration: {summary_props['duration']}s")
    print(f"      📝 Content: {len(summary_props['content'])} characters")
    print(f"      📍 Key Points: {len(summary_props['keyPoints'])} items")
    print(f"      🎯 Key Moments: {len(frontend_moments)} timestamped insights")
    print(f"      🗂️ Learning Cards: {len(frontend_flashcards)} flashcards")
    print(f"      ❓ Quiz Ready: {len(frontend_quiz)} questions")
    print(f"      📖 Glossary: {len(frontend_glossary)} key terms")
    print(f"      🛠️ Tools: {len(frontend_tools)} mentioned")
    print(f"      📚 Resources: {len(frontend_resources)} referenced")
    
    return all_preserved

if __name__ == "__main__":
    result = asyncio.run(test_full_integration())
    sys.exit(0 if result else 1)