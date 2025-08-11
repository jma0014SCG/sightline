#!/usr/bin/env python3

"""
Test script to verify enhanced YouTube metadata integration
Tests that SummarizeResponse model accepts enhanced metadata fields
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from api.models.responses import SummarizeResponse, VideoInfo
from datetime import datetime

def test_enhanced_metadata():
    print("🧪 Testing Enhanced YouTube Metadata Integration...\n")
    
    # Test data with enhanced metadata
    test_data = {
        "video_id": "dQw4w9WgXcQ",
        "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "video_title": "Rick Astley - Never Gonna Give You Up",
        "channel_name": "Rick Astley",
        "channel_id": "UC1234567890",
        "duration": 213,
        "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        "summary": "A classic music video that became an internet meme.",
        "key_points": ["Classic 80s song", "Internet meme phenomenon", "Rick rolling culture"],
        "user_id": "test-user",
        
        # Enhanced metadata fields (the ones we just added)
        "description": "The official video for 'Never Gonna Give You Up' by Rick Astley",
        "view_count": 1234567890,
        "like_count": 12345678,
        "comment_count": 567890,
        "upload_date": datetime.now()
    }
    
    try:
        # Test 1: Create SummarizeResponse with enhanced metadata
        print("1️⃣ Testing SummarizeResponse creation with enhanced metadata...")
        response = SummarizeResponse(**test_data)
        print("   ✅ SummarizeResponse created successfully!")
        print(f"   📊 Video: {response.video_title}")
        print(f"   👁️ Views: {response.view_count:,}" if response.view_count else "   👁️ Views: None")
        print(f"   👍 Likes: {response.like_count:,}" if response.like_count else "   👍 Likes: None")
        print(f"   💬 Comments: {response.comment_count:,}" if response.comment_count else "   💬 Comments: None")
        print(f"   📅 Upload Date: {response.upload_date}")
        print("")
        
        # Test 2: Verify fields are accessible
        print("2️⃣ Testing field access...")
        assert response.description == test_data["description"]
        assert response.view_count == test_data["view_count"]
        assert response.like_count == test_data["like_count"]
        assert response.comment_count == test_data["comment_count"]
        assert response.upload_date == test_data["upload_date"]
        print("   ✅ All enhanced metadata fields accessible!")
        print("")
        
        # Test 3: Test with optional fields as None
        print("3️⃣ Testing with None values for enhanced metadata...")
        test_data_minimal = test_data.copy()
        test_data_minimal.update({
            "description": None,
            "view_count": None,
            "like_count": None,
            "comment_count": None,
            "upload_date": None
        })
        
        response_minimal = SummarizeResponse(**test_data_minimal)
        print("   ✅ SummarizeResponse works with None values!")
        print("")
        
        # Test 4: Test JSON serialization
        print("4️⃣ Testing JSON serialization...")
        json_data = response.dict()
        print(f"   ✅ JSON serialization successful! Keys: {len(json_data)} fields")
        print(f"   🔍 Enhanced fields present: {[k for k in json_data.keys() if k in ['description', 'view_count', 'like_count', 'comment_count', 'upload_date']]}")
        print("")
        
        print("🎉 All Enhanced Metadata Tests Passed!")
        print("📋 Summary:")
        print("   ✅ SummarizeResponse model accepts enhanced metadata")
        print("   ✅ All fields are accessible and properly typed")
        print("   ✅ Optional fields work with None values")
        print("   ✅ JSON serialization works correctly")
        print("   🚀 The enhanced metadata integration is working!")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_enhanced_metadata()
    exit(0 if success else 1)