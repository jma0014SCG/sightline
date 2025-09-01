#!/usr/bin/env python3
"""Test YouTube API directly to diagnose metadata fetching issues"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Add API directory to path
sys.path.insert(0, 'api')

def test_youtube_api_key():
    """Test if YouTube API key is valid and has quota"""
    api_key = os.getenv('YOUTUBE_API_KEY')
    
    if not api_key:
        print("❌ YOUTUBE_API_KEY not found in environment")
        return False
    
    print(f"✅ YouTube API key found: {api_key[:10]}...")
    
    try:
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError
        
        # Build YouTube client
        youtube = build('youtube', 'v3', developerKey=api_key)
        
        # Test with a known video ID (Rick Astley - Never Gonna Give You Up)
        test_video_id = 'dQw4w9WgXcQ'
        
        print(f"\n📺 Testing API with video ID: {test_video_id}")
        
        # Test OLD way (7 units)
        print("\n📊 Testing OLD API call (7 quota units)...")
        response_old = youtube.videos().list(
            part='snippet,statistics,contentDetails',  # 7 units total
            id=test_video_id
        ).execute()
        
        # Test NEW optimized way (3 units)
        print("\n📊 Testing NEW API call (3 quota units)...")
        response = youtube.videos().list(
            part='snippet',  # Only 3 units total
            id=test_video_id
        ).execute()
        
        if response.get('items'):
            video = response['items'][0]
            snippet = video.get('snippet', {})
            stats = video.get('statistics', {})
            
            print(f"\n✅ API call successful!")
            print(f"   Title: {snippet.get('title', 'N/A')}")
            print(f"   Channel: {snippet.get('channelTitle', 'N/A')}")
            print(f"   Views: {stats.get('viewCount', 'N/A')}")
            return True
        else:
            print("❌ No video data returned")
            return False
            
    except HttpError as e:
        if e.resp.status == 403:
            error_details = e.error_details[0] if e.error_details else {}
            reason = error_details.get('reason', 'unknown')
            
            if 'quotaExceeded' in str(e):
                print(f"\n❌ YouTube API quota exceeded!")
                print("   Your daily quota has been exhausted.")
                print("   Solution: Wait until quota resets (Pacific Time midnight)")
            elif 'usageLimits' in str(e):
                print(f"\n❌ YouTube API usage limits error!")
                print("   Check if API is enabled in Google Cloud Console")
            else:
                print(f"\n❌ YouTube API access forbidden (403)")
                print(f"   Reason: {reason}")
                print(f"   Error: {e}")
                print("\n   Possible issues:")
                print("   1. Invalid API key")
                print("   2. API key restrictions don't allow this server")
                print("   3. YouTube Data API v3 not enabled in Google Cloud Console")
        else:
            print(f"\n❌ YouTube API error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

def test_ytdlp_fallback():
    """Test yt-dlp as fallback option"""
    print("\n" + "="*50)
    print("Testing yt-dlp fallback...")
    
    try:
        import yt_dlp
        
        test_video_id = 'dQw4w9WgXcQ'
        url = f"https://www.youtube.com/watch?v={test_video_id}"
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'skip_download': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            print(f"\n✅ yt-dlp extraction successful!")
            print(f"   Title: {info.get('title', 'N/A')}")
            print(f"   Channel: {info.get('uploader', 'N/A')}")
            print(f"   Views: {info.get('view_count', 'N/A')}")
            print(f"   Duration: {info.get('duration', 'N/A')} seconds")
            return True
            
    except Exception as e:
        print(f"\n❌ yt-dlp failed: {e}")
        return False

def check_backend_environment():
    """Check if backend has access to YouTube API key"""
    print("\n" + "="*50)
    print("Checking backend environment...")
    
    # Check if running locally or in production
    is_production = os.getenv('RAILWAY_ENVIRONMENT') or os.getenv('PRODUCTION')
    
    if is_production:
        print("⚠️ Running in production environment")
        print("   Make sure YOUTUBE_API_KEY is set in Railway/Vercel environment variables")
    else:
        print("✅ Running in development environment")
    
    # Check all YouTube-related env vars
    env_vars = {
        'YOUTUBE_API_KEY': os.getenv('YOUTUBE_API_KEY'),
        'GUMLOOP_API_KEY': os.getenv('GUMLOOP_API_KEY'),
        'GUMLOOP_USER_ID': os.getenv('GUMLOOP_USER_ID'),
        'GUMLOOP_FLOW_ID': os.getenv('GUMLOOP_FLOW_ID'),
    }
    
    for key, value in env_vars.items():
        if value:
            print(f"✅ {key}: {'*' * 10} (configured)")
        else:
            print(f"❌ {key}: Not configured")

if __name__ == "__main__":
    print("🔍 YouTube Metadata Fetching Diagnostic Tool")
    print("=" * 50)
    
    # Run tests
    api_works = test_youtube_api_key()
    ytdlp_works = test_ytdlp_fallback()
    check_backend_environment()
    
    # Summary
    print("\n" + "="*50)
    print("📊 SUMMARY")
    print("-" * 50)
    
    if api_works:
        print("✅ YouTube Data API v3 is working correctly")
    else:
        print("❌ YouTube Data API v3 is NOT working")
        print("   The metadata fetching will fail unless yt-dlp works")
    
    if ytdlp_works:
        print("✅ yt-dlp fallback is working")
        if not api_works:
            print("   Metadata should still be fetched via yt-dlp")
    else:
        print("❌ yt-dlp fallback is NOT working")
    
    if not api_works and not ytdlp_works:
        print("\n🚨 CRITICAL: Both YouTube API and yt-dlp are failing!")
        print("   Videos will have 'Unknown Title' and 'Unknown Channel'")
    elif not api_works:
        print("\n⚠️ WARNING: YouTube API is not working, relying on yt-dlp fallback")
        print("   This may be slower and less reliable")
    
    print("\n💡 RECOMMENDED ACTIONS:")
    if not api_works:
        print("1. Check if YouTube Data API v3 is enabled in Google Cloud Console")
        print("2. Verify API key is valid and has quota remaining")
        print("3. Check API key restrictions (IP, referrer, etc.)")
        print("4. Make sure YOUTUBE_API_KEY is set in production environment")
    
    print("\n📊 QUOTA OPTIMIZATION SUMMARY:")
    print("-" * 50)
    print("OLD Implementation: 7 units per video")
    print("  → 10,000 quota ÷ 7 = ~1,428 videos/day")
    print("\nNEW Implementation: 3 units per video") 
    print("  → 10,000 quota ÷ 3 = ~3,333 videos/day")
    print("\n✅ IMPROVEMENT: 133% more videos per day!")
    print("\nWith yt-dlp as primary: 0 units per video")
    print("  → UNLIMITED videos (no quota usage)")