import asyncio
import sys
import os
import logging
sys.path.append(os.path.dirname(__file__))

# Enable logging
logging.basicConfig(level=logging.INFO)

from services.reliable_transcript_service import ReliableTranscriptService
from config import settings

async def test_reliable():
    print("Testing Reliable Transcript Service")
    
    service = ReliableTranscriptService(
        settings.oxylabs_username,
        settings.oxylabs_password
    )
    
    video_id = "6FSih5a5aIA"
    print(f"\n🔄 Testing with video ID: {video_id}")
    
    try:
        transcript = await service.get_transcript(video_id)
        if transcript:
            print(f"✅ Success!")
            print(f"   Length: {len(transcript)} characters")
            print(f"   Preview: {transcript[:200]}...")
        else:
            print("❌ Failed to get transcript")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_reliable())