# 🚨 URGENT: Production Backend Connection Issue

## The Problem
Your production app at sightlineai.io cannot connect to the Railway backend API. The error `JSON.parse: unexpected end of data` means the backend is returning empty responses.

## Immediate Fix Required

### Step 1: Check Railway Backend Status
1. Go to your Railway dashboard
2. Check if the Python API is running
3. Look for "Application startup complete" in logs
4. If not running, redeploy it

### Step 2: Set Environment Variable in Vercel
Go to [Vercel Dashboard](https://vercel.com) → Your Project → Settings → Environment Variables

Add this variable:
```
NEXT_PUBLIC_BACKEND_URL = https://sightline-ai-backend-production.up.railway.app
```

**IMPORTANT**: Make sure there are NO quotes around the URL value!

### Step 3: Verify Railway Backend is Accessible
Test this URL in your browser:
```
https://sightline-ai-backend-production.up.railway.app/api/health
```

Should return:
```json
{"status":"healthy","service":"sightline-api"}
```

If this doesn't work, your Railway backend is not running.

### Step 4: Redeploy Vercel After Setting Variable
1. Go to Vercel Dashboard
2. Click "Redeploy"
3. Uncheck "Use existing build cache"
4. Deploy

### Step 5: Clear Browser Cache
After deployment:
1. Open sightlineai.io
2. Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Open browser console (F12)
4. Look for: `🔗 Backend URL: https://sightline-ai-backend-production.up.railway.app`

## Quick Verification

Run this in your browser console on sightlineai.io:
```javascript
fetch('https://sightline-ai-backend-production.up.railway.app/api/health')
  .then(r => r.json())
  .then(d => console.log('✅ Backend is working:', d))
  .catch(e => console.log('❌ Backend is down:', e))
```

## If Railway Backend is Down

### Option 1: Redeploy Railway
```bash
# If you have Railway CLI
railway up

# Or push to trigger deployment
git push
```

### Option 2: Check Railway Logs
Look for errors like:
- Database connection failed
- Missing environment variables
- Python import errors

Common fixes:
- Ensure `DATABASE_URL` is set
- Ensure `OPENAI_API_KEY` is set
- Ensure `GUMLOOP_API_KEY` is set

## The Root Cause

The issue is one of these:
1. **Backend URL not set in Vercel** (most likely)
2. **Railway backend is down** 
3. **CORS blocking the request**

## Test After Fix

1. Go to sightlineai.io
2. Paste YouTube URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
3. Click "Get Summary"
4. Should see real progress stages
5. Should complete in 60-90 seconds

## Still Not Working?

Check these in order:

1. **Railway Logs**
   - Any Python errors?
   - Is it receiving requests?
   - Database connection working?

2. **Browser Network Tab**
   - Look for request to `/api/summarize`
   - Check response - is it empty?
   - Any CORS errors?

3. **Environment Variables**
   - In Vercel: Is `NEXT_PUBLIC_BACKEND_URL` set?
   - In Railway: Are all API keys set?

## Emergency Contact

If critical and needs immediate help:
- Check Railway Status: https://railway.app/status
- Check Vercel Status: https://vercel-status.com