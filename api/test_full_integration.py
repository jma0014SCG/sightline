#!/usr/bin/env python3
"""
Test script for full YouTube service integration with Gumloop
"""

import sys
import os
import asyncio
from dotenv import load_dotenv

# Add the api directory to the path
sys.path.append(os.path.dirname(__file__))

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from services.youtube_service import YouTubeService

async def test_youtube_service_with_gumloop():
    """Test the YouTube service with Gumloop integration"""
    
    print("🔧 Testing Full YouTube Service Integration with Gumloop")
    print()
    
    # Initialize the YouTube service (will auto-detect Gumloop config)
    youtube_service = YouTubeService()
    
    # Check if Gumloop is available
    if youtube_service.gumloop_service and youtube_service.gumloop_service.is_available():
        print("✅ Gumloop service is available and configured")
    else:
        print("❌ Gumloop service is not available")
        return
    
    # Extract video ID from the test URL
    video_id = "Xq0xJl-2D_s"  # From the example URL
    
    print(f"🔄 Testing transcript extraction for video ID: {video_id}")
    print()
    
    try:
        transcript = await youtube_service.get_transcript(video_id)
        
        if transcript:
            print(f"✅ SUCCESS! Retrieved transcript ({len(transcript)} characters)")
            print("📝 First 300 characters:")
            print(f"   {transcript[:300]}...")
            print()
            print("📝 Last 200 characters:")
            print(f"   ...{transcript[-200:]}")
        else:
            print("❌ FAILED: No transcript returned")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
    
    # Clean up
    await youtube_service.client.aclose()

if __name__ == "__main__":
    asyncio.run(test_youtube_service_with_gumloop())