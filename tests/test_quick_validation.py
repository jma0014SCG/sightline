#!/usr/bin/env python3
"""
Quick validation test for YouTubeMetadataService integration
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

from services.youtube_service import YouTubeService

async def quick_validation():
    """Quick validation of the enhanced metadata functionality"""
    
    print("⚡ Quick YouTube Metadata Validation")
    print("=" * 40)
    print()
    
    # Initialize YouTube service
    youtube_service = YouTubeService()
    
    # Test with a actual YouTube video
    video_id = "g3qe4rDw1XU"  # YouTube video from the provided link
    
    print(f"🎥 Testing with: {video_id}")
    
    # Test the parallel method
    start_time = datetime.now()
    video_info, (transcript, is_gumloop) = await youtube_service.get_video_data_parallel(video_id)
    end_time = datetime.now()
    
    duration = (end_time - start_time).total_seconds()
    
    print(f"⏱️  Execution time: {duration:.2f}s")
    print()
    
    # Validate enhanced metadata
    print("📋 Enhanced Metadata Results:")
    print(f"   📝 Title: {video_info.title}")
    print(f"   👤 Channel: {video_info.channel_name}")
    print(f"   👀 Views: {video_info.view_count:,}" if video_info.view_count else "   👀 Views: N/A")
    print(f"   👍 Likes: {video_info.like_count:,}" if video_info.like_count else "   👍 Likes: N/A")
    print(f"   💬 Comments: {video_info.comment_count:,}" if video_info.comment_count else "   💬 Comments: N/A")
    print(f"   ⏱️  Duration: {video_info.duration}s")
    print(f"   📅 Upload Date: {video_info.upload_date.strftime('%Y-%m-%d')}" if video_info.upload_date else "   📅 Upload Date: N/A")
    print()
    
    # Validate description exists
    if video_info.description:
        desc_preview = video_info.description[:100] + "..." if len(video_info.description) > 100 else video_info.description
        print(f"   📄 Description: {desc_preview}")
    else:
        print("   📄 Description: N/A")
    print()
    
    # Validate transcript
    print("📝 Transcript Results:")
    if transcript:
        print(f"   ✅ Retrieved: {len(transcript)} characters")
        print(f"   🔧 Source: {'Gumloop' if is_gumloop else 'Standard'}")
        print(f"   📄 Preview: {transcript[:100]}...")
    else:
        print("   ❌ Failed to retrieve transcript")
    print()
    
    # Check if we got enhanced metadata
    enhanced_fields = {
        'view_count': video_info.view_count is not None,
        'like_count': video_info.like_count is not None,
        'comment_count': video_info.comment_count is not None,
        'upload_date': video_info.upload_date is not None,
        'description': video_info.description is not None and len(video_info.description) > 0,
    }
    
    enhanced_success = sum(enhanced_fields.values())
    total_fields = len(enhanced_fields)
    
    print("🎯 Enhancement Success Rate:")
    print(f"   📊 {enhanced_success}/{total_fields} enhanced fields populated ({(enhanced_success/total_fields)*100:.0f}%)")
    
    for field, success in enhanced_fields.items():
        status = "✅" if success else "❌"
        print(f"   {status} {field.replace('_', ' ').title()}")
    
    print()
    
    if enhanced_success >= total_fields * 0.8:  # 80% success rate
        print("🎉 SUCCESS: Enhanced metadata integration working correctly!")
        return True
    else:
        print("⚠️  WARNING: Some enhanced metadata fields missing")
        return False

if __name__ == "__main__":
    print("🚀 Quick Validation Test")
    print("=" * 25)
    print()
    
    success = asyncio.run(quick_validation())
    
    if success:
        print("\n✅ All validations passed!")
        exit(0)
    else:
        print("\n❌ Some validations failed!")
        exit(1)