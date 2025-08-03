#!/usr/bin/env python3
"""
Test script for Gumloop integration
"""

import sys
import os
import asyncio
from dotenv import load_dotenv

# Add the api directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'api'))

# Load environment variables from api directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'api', '.env'))

from services.gumloop_service import GumloopService

async def test_gumloop_service():
    """Test the Gumloop service with a sample YouTube URL"""
    
    # Get credentials from environment
    api_key = os.getenv('GUMLOOP_API_KEY')
    user_id = os.getenv('GUMLOOP_USER_ID')
    flow_id = os.getenv('GUMLOOP_FLOW_ID')
    
    print("🔧 Testing Gumloop Service Integration")
    print(f"API Key: {'✅ Set' if api_key else '❌ Missing'}")
    print(f"User ID: {'✅ Set' if user_id else '❌ Missing'}")
    print(f"Flow ID: {'✅ Set' if flow_id else '❌ Missing'}")
    print()
    
    if not all([api_key, user_id, flow_id]):
        print("❌ Missing required Gumloop credentials. Check your .env file.")
        return
    
    # Initialize the service
    gumloop_service = GumloopService(
        api_key=api_key,
        user_id=user_id,
        flow_id=flow_id
    )
    
    # Test with the sample URL from your example
    test_url = "https://www.youtube.com/watch?v=Xq0xJl-2D_s"
    
    print(f"🔄 Testing with URL: {test_url}")
    print()
    
    try:
        transcript = await gumloop_service.get_transcript(test_url)
        
        if transcript:
            print("✅ SUCCESS! Retrieved content from Gumloop:")
            print(f"   📝 Transcript: {len(transcript)} characters") 
            print(f"      Preview: {transcript[:150]}...")
        else:
            print("❌ FAILED: No content returned")
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_gumloop_service())