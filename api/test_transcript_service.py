import asyncio
import sys
import os
import logging
sys.path.append(os.path.dirname(__file__))

# Enable logging
logging.basicConfig(level=logging.INFO)

from services.youtube_transcript_service import YouTubeTranscriptService
from config import settings

async def test_transcript_service():
    print(f"Testing YouTube Transcript Service")
    print(f"Oxylabs credentials: {settings.oxylabs_username} / {'*' * 10}")
    
    service = YouTubeTranscriptService(
        settings.oxylabs_username,
        settings.oxylabs_password
    )
    
    video_id = "Xq0xJl-2D_s"
    print(f"\n🔄 Testing with video ID: {video_id}")
    
    try:
        transcript = await service.get_transcript_direct(video_id)
        if transcript:
            print(f"✅ Successfully got transcript!")
            print(f"   Length: {len(transcript)} characters")
            print(f"   Preview: {transcript[:200]}...")
        else:
            print("❌ Failed to get transcript")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    finally:
        await service.close()

if __name__ == "__main__":
    asyncio.run(test_transcript_service())