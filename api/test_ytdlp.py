import asyncio
import sys
import os
import logging
sys.path.append(os.path.dirname(__file__))

# Enable logging
logging.basicConfig(level=logging.INFO)

from services.ytdlp_service import YTDLPService
from config import settings

async def test_ytdlp():
    print(f"Testing yt-dlp Service")
    print(f"Oxylabs credentials: {settings.oxylabs_username} / {'*' * 10}")
    
    service = YTDLPService(
        settings.oxylabs_username,
        settings.oxylabs_password
    )
    
    video_id = "Xq0xJl-2D_s"
    print(f"\n🔄 Testing with video ID: {video_id}")
    
    try:
        # Test getting video info first
        print("\n1. Getting video info...")
        info = await service.get_video_info(video_id)
        if info:
            print(f"✅ Got video info:")
            print(f"   Title: {info.get('title', 'Unknown')}")
            print(f"   Channel: {info.get('channel', 'Unknown')}")
            print(f"   Duration: {info.get('duration', 0)} seconds")
            
            # Check available subtitles
            subs = info.get('subtitles', {})
            auto_caps = info.get('automatic_captions', {})
            print(f"\n   Manual subtitles: {list(subs.keys())}")
            print(f"   Auto captions: {list(auto_caps.keys())}")
        else:
            print("❌ Failed to get video info")
            return
        
        # Test getting transcript
        print("\n2. Getting transcript...")
        transcript = await service.get_transcript(video_id)
        if transcript:
            print(f"✅ Got transcript!")
            print(f"   Length: {len(transcript)} characters")
            print(f"   Preview: {transcript[:200]}...")
        else:
            print("❌ Failed to get transcript")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_ytdlp())