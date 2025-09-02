#!/usr/bin/env python3
"""
Get Server IP Address
This script gets the public IP address of the server making YouTube API calls
"""

import requests
import socket
import json
from datetime import datetime

def get_server_ip():
    """Get the public IP address of this server"""
    
    print("🔍 Detecting Server IP Address...")
    print("=" * 50)
    
    # Method 1: Using ipify.org (most reliable)
    try:
        response = requests.get('https://api.ipify.org?format=json', timeout=5)
        ip = response.json()['ip']
        print(f"✅ Public IP (via ipify): {ip}")
        public_ip = ip
    except Exception as e:
        print(f"❌ ipify failed: {e}")
        public_ip = None
    
    # Method 2: Using ifconfig.me (backup)
    try:
        response = requests.get('https://ifconfig.me/ip', timeout=5)
        ip = response.text.strip()
        print(f"✅ Public IP (via ifconfig): {ip}")
        if not public_ip:
            public_ip = ip
    except Exception as e:
        print(f"❌ ifconfig.me failed: {e}")
    
    # Method 3: Using ipinfo.io (with location info)
    try:
        response = requests.get('https://ipinfo.io/json', timeout=5)
        data = response.json()
        print(f"✅ Public IP (via ipinfo): {data.get('ip')}")
        print(f"   Location: {data.get('city')}, {data.get('region')}, {data.get('country')}")
        print(f"   ISP: {data.get('org')}")
        if not public_ip:
            public_ip = data.get('ip')
    except Exception as e:
        print(f"❌ ipinfo.io failed: {e}")
    
    # Method 4: Local hostname resolution
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        print(f"\nℹ️  Hostname: {hostname}")
        print(f"ℹ️  Local IP: {local_ip}")
    except Exception as e:
        print(f"❌ Local resolution failed: {e}")
    
    print("\n" + "=" * 50)
    
    if public_ip:
        print(f"🎯 YOUR SERVER'S PUBLIC IP: {public_ip}")
        print("\n📋 Add this IP to your YouTube API key restrictions:")
        print(f"   1. Go to https://console.cloud.google.com/apis/credentials")
        print(f"   2. Click on your YouTube API key")
        print(f"   3. Under 'Application restrictions', select 'IP addresses'")
        print(f"   4. Add this IP: {public_ip}")
        print(f"   5. Click 'Save'")
        
        # Save to file for reference
        with open('server_ip.txt', 'w') as f:
            f.write(f"Server IP: {public_ip}\n")
            f.write(f"Detected at: {datetime.now().isoformat()}\n")
        print(f"\nℹ️  IP saved to server_ip.txt")
    else:
        print("❌ Could not determine public IP address")
    
    return public_ip

if __name__ == "__main__":
    get_server_ip()