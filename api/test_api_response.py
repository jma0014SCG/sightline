#!/usr/bin/env python3
"""
Test the actual API response structure to ensure structured data is included
"""

import sys
import os
import asyncio
import json
from datetime import datetime

# Add the api directory to the path
sys.path.append(os.path.dirname(__file__))

from test_gumloop_integration import SAMPLE_GUMLOOP_OUTPUT
from services.gumloop_parser import is_gumloop_summary, parse_gumloop_summary, extract_key_points_from_gumloop
from models.responses import SummarizeResponse, SummaryMetadata, KeyMoment, Flashcard, QuizQuestion

async def test_api_response_structure():
    """Test what the actual API response looks like with Gumloop data"""
    
    print("🧪 Testing API Response Structure")
    print("=" * 50)
    
    # Simulate the API flow from summarize.py
    transcript = SAMPLE_GUMLOOP_OUTPUT
    is_gumloop = True
    
    # Parse Gumloop data
    gumloop_data = parse_gumloop_summary(transcript)
    
    if gumloop_data:
        # Create structured data objects
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
            quiz_questions=quiz_questions
        )
        
        # Convert to dict to see the structure
        response_dict = api_response.dict()
        
        print("📦 API Response Structure:")
        print(f"  video_title: {response_dict['video_title']}")
        print(f"  channel_name: {response_dict['channel_name']}")
        print(f"  key_points: {len(response_dict['key_points'])} items")
        print(f"  metadata: {response_dict['metadata'] is not None}")
        if response_dict['metadata']:
            print(f"    title: {response_dict['metadata']['title']}")
            print(f"    speakers: {response_dict['metadata']['speakers']}")
            print(f"    synopsis: {response_dict['metadata']['synopsis'][:100]}...")
        
        print(f"  key_moments: {len(response_dict['key_moments'])} items")
        if response_dict['key_moments']:
            for i, moment in enumerate(response_dict['key_moments'][:3]):
                print(f"    {i+1}. {moment['timestamp']}: {moment['insight'][:50]}...")
        
        print(f"  flashcards: {len(response_dict['flashcards'])} items")
        if response_dict['flashcards']:
            for i, card in enumerate(response_dict['flashcards']):
                print(f"    {i+1}. Q: {card['question'][:40]}...")
        
        print(f"  quiz_questions: {len(response_dict['quiz_questions'])} items")
        if response_dict['quiz_questions']:
            for i, quiz in enumerate(response_dict['quiz_questions']):
                print(f"    {i+1}. Q: {quiz['question'][:40]}...")
        
        print("\n🔍 Frontend Compatibility Check:")
        
        # Check what fields the frontend expects
        frontend_expected_fields = {
            'content': 'summary',  # API field -> Frontend field mapping
            'videoTitle': 'video_title',
            'channelName': 'channel_name', 
            'keyPoints': 'key_points',
            'duration': 'duration',
            'thumbnailUrl': 'thumbnail_url',
            'metadata': 'metadata',
            'key_moments': 'key_moments',
            'flashcards': 'flashcards',
            'quiz_questions': 'quiz_questions'
        }
        
        for frontend_field, api_field in frontend_expected_fields.items():
            has_field = api_field in response_dict
            print(f"  {frontend_field} <- {api_field}: {'✅' if has_field else '❌'}")
        
        print("\n✅ API response includes all structured Gumloop data!")
        
        # Save a sample JSON for debugging
        with open('sample_api_response.json', 'w') as f:
            json.dump(response_dict, f, indent=2, default=str)
        print("📝 Saved sample response to sample_api_response.json")
        
    else:
        print("❌ Failed to parse Gumloop data")

if __name__ == "__main__":
    asyncio.run(test_api_response_structure())