import asyncio
import sys
import os
sys.path.append(os.path.dirname(__file__))

from services.oxylabs_service import OxylabsService
from config import settings

async def test_oxylabs():
    print(f"Oxylabs username: {settings.oxylabs_username}")
    print(f"Oxylabs password: {'*' * len(settings.oxylabs_password) if settings.oxylabs_password else 'None'}")
    
    if not settings.oxylabs_username or not settings.oxylabs_password:
        print("❌ Oxylabs credentials not found in settings")
        return
    
    service = OxylabsService(settings.oxylabs_username, settings.oxylabs_password)
    
    video_id = "Xq0xJl-2D_s"
    print(f"\n🔄 Testing Oxylabs with video ID: {video_id}")
    
    # Test fetching YouTube page
    html = await service.fetch_youtube_page(video_id)
    if html:
        print(f"✅ Successfully fetched YouTube page ({len(html)} characters)")
        
        # Save HTML for debugging
        with open('youtube_page.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print("   Saved HTML to youtube_page.html for debugging")
        
        # Check if we can find ytInitialPlayerResponse
        if 'ytInitialPlayerResponse' in html:
            print("✅ Found ytInitialPlayerResponse in HTML")
        else:
            print("❌ ytInitialPlayerResponse NOT found in HTML")
        
        # Test extracting captions data
        captions_data = service.extract_captions_data(html)
        if captions_data:
            print(f"✅ Found captions data")
            caption_tracks = captions_data.get('captionTracks', [])
            print(f"   Found {len(caption_tracks)} caption tracks")
            for track in caption_tracks[:3]:  # Show first 3
                print(f"   - {track.get('name', {}).get('simpleText', 'Unknown')} ({track.get('languageCode', 'unknown')})")
        else:
            print("❌ No captions data found")
    else:
        print("❌ Failed to fetch YouTube page")

if __name__ == "__main__":
    asyncio.run(test_oxylabs())