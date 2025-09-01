# Fix YouTube API Key Issue

## Steps to Fix:

### 1. Get a New YouTube Data API v3 Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Enable the **YouTube Data API v3**:
   - Go to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click on it and press "ENABLE"

4. Create an API Key:
   - Go to "APIs & Services" → "Credentials"
   - Click "+ CREATE CREDENTIALS" → "API key"
   - Copy the new API key

5. (Optional) Add restrictions for security:
   - Click on the API key you created
   - Under "API restrictions", select "Restrict key"
   - Select "YouTube Data API v3" from the list
   - Save

### 2. Update Your Environment Variables

#### Local Development (.env.local):
```bash
YOUTUBE_API_KEY=YOUR_NEW_API_KEY_HERE
```

#### Production (Railway Backend):
1. Go to your Railway dashboard
2. Select your sightline-ai-backend service
3. Go to "Variables" tab
4. Add or update: `YOUTUBE_API_KEY=YOUR_NEW_API_KEY_HERE`
5. The service will automatically redeploy

### 3. Verify It's Working

Run the test script:
```bash
python3 test_youtube_api.py
```

You should see:
```
✅ YouTube Data API v3 is working correctly
```

## Alternative: Use yt-dlp Only (No API Key Needed)

If you don't want to use the YouTube API, we can modify the code to rely entirely on yt-dlp, which doesn't require an API key but may be slower.