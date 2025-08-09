#!/usr/bin/env python3
"""
Test script for YouTubeMetadataService
"""

import asyncio
import os
import sys
from datetime import datetime

# Add parent directories to path
current_dir = os.path.dirname(__file__)
parent_dir = os.path.dirname(current_dir)
api_dir = os.path.join(parent_dir, 'api')

sys.path.insert(0, api_dir)

# Load environment variables
from dotenv import load_dotenv
load_dotenv(os.path.join(api_dir, '.env'))

from services.youtube_metadata_service import YouTubeMetadataService

async def test_youtube_metadata_service():
    """Test the YouTubeMetadataService with sample videos"""
    
    print("🔧 Testing YouTube Metadata Service")
    print()
    
    # Initialize the service
    service = YouTubeMetadataService()
    
    # Check configuration
    api_available = service.youtube_client is not None
    ytdlp_available = hasattr(service, 'executor')
    
    print(f"YouTube Data API: {'✅ Available' if api_available else '❌ Not available'}")
    print(f"yt-dlp fallback: {'✅ Available' if ytdlp_available else '❌ Not available'}")
    print()
    
    # Test videos - using popular, stable videos
    test_videos = [
        {
            'id': 'jNQXAC9IVRw',  # Popular tech video
            'name': 'Popular Tech Video'
        },
        {
            'id': 'dQw4w9WgXcQ',  # Classic Rick Roll (stable, well-known)
            'name': 'Classic Music Video'
        }
    ]
    
    for video in test_videos:
        video_id = video['id']
        video_name = video['name']
        
        print(f"🎥 Testing {video_name} (ID: {video_id})")
        print("-" * 50)
        
        try:
            # Get metadata
            start_time = datetime.now()
            metadata = await service.get_metadata(video_id)
            end_time = datetime.now()
            
            duration = (end_time - start_time).total_seconds()
            
            if metadata:
                print(f"✅ SUCCESS! Retrieved metadata in {duration:.2f}s")
                print(f"   📝 Title: {metadata.get('title', 'N/A')}")
                print(f"   👤 Channel: {metadata.get('channel_name', 'N/A')}")
                print(f"   👀 Views: {metadata.get('view_count', 0):,}" if metadata.get('view_count') else "   👀 Views: N/A")
                print(f"   👍 Likes: {metadata.get('like_count', 0):,}" if metadata.get('like_count') else "   👍 Likes: N/A")
                print(f"   💬 Comments: {metadata.get('comment_count', 0):,}" if metadata.get('comment_count') else "   💬 Comments: N/A")
                print(f"   ⏱️  Duration: {metadata.get('duration', 0)} seconds")
                
                if metadata.get('description'):
                    desc_preview = metadata['description'][:100] + "..." if len(metadata['description']) > 100 else metadata['description']
                    print(f"   📋 Description: {desc_preview}")
                
                if metadata.get('upload_date'):
                    upload_date = metadata['upload_date']
                    if isinstance(upload_date, datetime):
                        print(f"   📅 Upload Date: {upload_date.strftime('%Y-%m-%d')}")
                    else:
                        print(f"   📅 Upload Date: {upload_date}")
                
                # Test caching
                print("   🔄 Testing cache...")
                cache_start = datetime.now()
                cached_metadata = await service.get_metadata(video_id)
                cache_end = datetime.now()
                cache_duration = (cache_end - cache_start).total_seconds()
                
                if cache_duration < duration * 0.1:  # Should be much faster from cache
                    print(f"   ✅ Cache hit! Retrieved in {cache_duration:.3f}s")
                else:
                    print(f"   ⚠️  Possible cache miss, took {cache_duration:.3f}s")
                    
            else:
                print(f"   ❌ Failed to retrieve metadata")
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
        
        print()
    
    print("🏁 Testing completed!")

async def test_parallel_performance():
    """Test parallel performance vs sequential"""
    
    print("⚡ Testing Parallel Performance")
    print("-" * 50)
    
    service = YouTubeMetadataService()
    
    # Use the same video for fair comparison
    video_id = "jNQXAC9IVRw"
    
    # Clear any cached data
    cache_key = f"youtube:metadata:{video_id}"
    if hasattr(service, 'cache') and cache_key in service.cache:
        del service.cache[cache_key]
    
    if service.redis_client:
        try:
            service.redis_client.delete(cache_key)
        except:
            pass
    
    # Test sequential approach (simulated)
    print("📊 Sequential approach simulation:")
    start_time = datetime.now()
    metadata = await service.get_metadata(video_id)
    # Simulate additional work that would happen in parallel
    await asyncio.sleep(0.5)  # Simulate transcript fetching time
    end_time = datetime.now()
    sequential_time = (end_time - start_time).total_seconds()
    
    print(f"   Time: {sequential_time:.2f}s")
    
    # Test parallel approach simulation
    print("📊 Parallel approach simulation:")
    start_time = datetime.now()
    
    # Create tasks that would run in parallel
    metadata_task = service.get_metadata(video_id)
    # Simulate transcript task
    async def simulate_transcript():
        await asyncio.sleep(0.5)
        return "simulated transcript"
    
    transcript_task = simulate_transcript()
    
    # Run in parallel
    metadata_result, transcript_result = await asyncio.gather(metadata_task, transcript_task)
    
    end_time = datetime.now()
    parallel_time = (end_time - start_time).total_seconds()
    
    print(f"   Time: {parallel_time:.2f}s")
    
    if parallel_time < sequential_time:
        improvement = ((sequential_time - parallel_time) / sequential_time) * 100
        print(f"   ✅ Parallel is {improvement:.1f}% faster!")
    else:
        print("   ⚠️  Parallel performance not significantly better (possibly due to caching)")
    
    print()

if __name__ == "__main__":
    print("🚀 Starting YouTube Metadata Service Tests")
    print("=" * 60)
    print()
    
    asyncio.run(test_youtube_metadata_service())
    asyncio.run(test_parallel_performance())