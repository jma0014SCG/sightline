#!/usr/bin/env python3
"""
Test script to verify YouTube metadata service in production
"""
import requests
import json
import time

def test_production_api():
    """Test the production API directly"""
    
    base_url = "https://sightline-ai-backend-production.up.railway.app"
    
    # Test 1: Health check
    print("🔍 Testing production API...")
    print(f"\n1️⃣ Health Check:")
    health_response = requests.get(f"{base_url}/api/health")
    print(f"   Status: {health_response.status_code}")
    print(f"   Response: {health_response.json()}")
    
    # Test 2: Simple summarize request
    print(f"\n2️⃣ Testing summarize endpoint with metadata:")
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Astley
    
    print(f"   Video URL: {test_url}")
    print(f"   Sending request...")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{base_url}/api/summarize",
            json={"url": test_url},
            timeout=60
        )
        
        elapsed = time.time() - start_time
        print(f"   Response time: {elapsed:.2f}s")
        print(f"   Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n   📊 Metadata Retrieved:")
            print(f"      - Video Title: {data.get('video_title', 'N/A')}")
            print(f"      - Channel Name: {data.get('channel_name', 'N/A')}")
            print(f"      - View Count: {data.get('view_count', 0):,}")
            print(f"      - Like Count: {data.get('like_count', 0):,}")
            print(f"      - Comment Count: {data.get('comment_count', 0):,}")
            print(f"      - Duration: {data.get('duration', 0)} seconds")
            print(f"      - Upload Date: {data.get('upload_date', 'N/A')}")
            
            # Check if metadata is real or fallback
            if data.get('view_count', 0) == 0 and data.get('video_title') == 'Unknown Title':
                print("\n   ❌ Metadata appears to be using fallback values!")
            else:
                print("\n   ✅ Metadata fetching is working!")
                
        else:
            print(f"   ❌ Error: {response.text[:200]}")
            
    except requests.Timeout:
        print(f"   ❌ Request timed out after 60 seconds")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

if __name__ == "__main__":
    test_production_api()