#!/usr/bin/env python3
import asyncio
import sys
import os

# Add the API directory to the path
sys.path.insert(0, os.path.dirname(__file__))

from services.youtube_metadata_service import YouTubeMetadataService
from config import settings

async def test_metadata():
    """Test the YouTube metadata service with a known video"""
    
    # Test video: Rick Astley - Never Gonna Give You Up
    test_video_id = "dQw4w9WgXcQ"
    
    print(f"🔍 Testing YouTube metadata service...")
    print(f"📋 Configuration:")
    print(f"   - YouTube API Key: {'✅ Set' if settings.youtube_api_key else '❌ Not set'}")
    print(f"   - google-api-python-client: {'✅ Available' if 'google' in sys.modules or True else '❌ Not available'}")
    print(f"   - yt-dlp: {'✅ Available' if 'yt_dlp' in sys.modules or True else '❌ Not available'}")
    print(f"\n🎥 Testing video ID: {test_video_id}")
    
    # Initialize the service
    service = YouTubeMetadataService()
    
    # Get metadata
    metadata = await service.get_metadata(test_video_id)
    
    print("\n📊 Metadata Retrieved:")
    print(f"   - Title: {metadata.get('title', 'N/A')}")
    print(f"   - Channel: {metadata.get('channel_name', 'N/A')}")
    print(f"   - View Count: {metadata.get('view_count', 0):,}")
    print(f"   - Like Count: {metadata.get('like_count', 0):,}")
    print(f"   - Comment Count: {metadata.get('comment_count', 0):,}")
    print(f"   - Duration: {metadata.get('duration', 0)} seconds")
    print(f"   - Upload Date: {metadata.get('upload_date', 'N/A')}")
    print(f"   - Description: {metadata.get('description', '')[:100]}{'...' if len(metadata.get('description', '')) > 100 else ''}")
    
    # Check if we're getting real data or fallback values
    if metadata.get('view_count', 0) == 0 and metadata.get('title') == 'Unknown Title':
        print("\n❌ WARNING: Metadata appears to be using fallback values!")
        print("   This indicates the metadata fetching is not working properly.")
    else:
        print("\n✅ Metadata fetching appears to be working correctly!")
    
    return metadata

if __name__ == "__main__":
    asyncio.run(test_metadata())