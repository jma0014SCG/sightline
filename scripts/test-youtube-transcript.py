#!/usr/bin/env python3
"""
Test script for YouTube transcript API with various video types
This helps identify which types of videos work and which fail
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'api'))

from services.youtube_service import YouTubeService

# Test video collection with different characteristics
TEST_VIDEOS = [
    {
        "id": "jNQXAC9IVRw", 
        "name": "Me at the zoo (First YouTube video)",
        "expected": "Should have captions",
        "reason": "Historic, likely manually captioned"
    },
    {
        "id": "kJQP7kiw5Fk", 
        "name": "Luis Fonsi - Despacito",
        "expected": "Should have captions", 
        "reason": "Popular music video, multiple languages"
    },
    {
        "id": "dQw4w9WgXcQ", 
        "name": "Rick Astley - Never Gonna Give You Up",
        "expected": "Should have captions",
        "reason": "Popular meme video, old but popular"
    },
    {
        "id": "ScM9lqTdSTs", 
        "name": "Python programming tutorial",
        "expected": "Should have auto-captions",
        "reason": "Educational content, likely auto-generated"
    },
    {
        "id": "9bZkp7q19f0", 
        "name": "PSY - Gangnam Style", 
        "expected": "Should have captions",
        "reason": "Most viewed video, multiple languages"
    }
]

async def test_video(youtube_service: YouTubeService, video_info: dict):
    """Test a single video"""
    video_id = video_info["id"]
    print(f"\n{'='*60}")
    print(f"🧪 Testing: {video_info['name']}")
    print(f"🔗 Video ID: {video_id}")
    print(f"📋 Expected: {video_info['expected']}")
    print(f"💡 Reason: {video_info['reason']}")
    print(f"{'='*60}")
    
    try:
        # Test video info retrieval
        print("1️⃣ Getting video info...")
        video_data = await youtube_service.get_video_info(video_id)
        print(f"✅ Title: {video_data.title}")
        print(f"✅ Channel: {video_data.channel_name}")
        print(f"✅ Duration: {video_data.duration}s")
        
        # Test transcript retrieval
        print("2️⃣ Getting transcript...")
        transcript = await youtube_service.get_transcript(video_id)
        
        if transcript:
            transcript_length = len(transcript)
            word_count = len(transcript.split())
            print(f"✅ Transcript retrieved successfully!")
            print(f"   📊 Length: {transcript_length} characters")
            print(f"   📊 Words: {word_count}")
            print(f"   📝 Preview: {transcript[:200]}...")
            return True
        else:
            print("❌ No transcript available")
            return False
            
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Error: {error_msg}")
        
        # Analyze error types
        if "no element found" in error_msg.lower():
            print("🔍 Analysis: XML parsing error - likely IP blocking or rate limiting")
        elif "transcript" in error_msg.lower():
            print("🔍 Analysis: Transcript-specific error")
        elif "unavailable" in error_msg.lower():
            print("🔍 Analysis: Video unavailable")
        else:
            print("🔍 Analysis: Unknown error type")
        
        return False

async def run_comprehensive_test():
    """Run comprehensive test suite"""
    print("🚀 YouTube Transcript API Test Suite")
    print("=" * 80)
    
    youtube_service = YouTubeService()
    
    results = {
        "total": len(TEST_VIDEOS),
        "successful": 0,
        "failed": 0,
        "errors": []
    }
    
    for video_info in TEST_VIDEOS:
        success = await test_video(youtube_service, video_info)
        
        if success:
            results["successful"] += 1
        else:
            results["failed"] += 1
            results["errors"].append({
                "video": video_info["name"],
                "id": video_info["id"]
            })
        
        # Add delay between requests to be respectful
        await asyncio.sleep(2)
    
    # Print summary
    print(f"\n{'='*80}")
    print("📊 TEST SUMMARY")
    print(f"{'='*80}")
    print(f"Total videos tested: {results['total']}")
    print(f"✅ Successful: {results['successful']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"📈 Success rate: {(results['successful']/results['total']*100):.1f}%")
    
    if results["errors"]:
        print(f"\n❌ Failed videos:")
        for error in results["errors"]:
            print(f"   • {error['video']} ({error['id']})")
    
    # Recommendations based on results
    print(f"\n💡 RECOMMENDATIONS:")
    if results["successful"] == 0:
        print("   🚨 No videos worked - likely IP blocking issue")
        print("   🔧 Next step: Implement proxy support")
    elif results["successful"] < results["total"] * 0.5:
        print("   ⚠️  Low success rate - partial IP blocking or rate limiting")
        print("   🔧 Next step: Add proxy support and longer delays")
    elif results["successful"] < results["total"]:
        print("   ✅ Good success rate - some videos may not have transcripts")
        print("   🔧 Next step: Implement fallback strategies")
    else:
        print("   🎉 Perfect success rate! API is working well")
        print("   🔧 Next step: Implement production optimizations")
    
    await youtube_service.client.aclose()

if __name__ == "__main__":
    try:
        asyncio.run(run_comprehensive_test())
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Test suite failed: {e}")