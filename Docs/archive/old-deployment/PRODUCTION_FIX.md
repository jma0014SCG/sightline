# 🚨 Production Summary Flow Fix Guide

## Critical Issues Found and Fixed

### 1. ✅ Missing Backend URL Configuration
**Problem**: Frontend couldn't communicate with Python API backend
**Solution**: Added `BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL` to environment configuration

### 2. ✅ Backend Client URL Resolution  
**Problem**: Client-side code couldn't access backend URL
**Solution**: Fixed backend client to properly handle server/client environment variable access

### 3. ⚠️ Environment Variables to Set

## 🔧 Immediate Actions Required

### Step 1: Set Environment Variables in Vercel
Go to your Vercel project settings and add:
```bash
NEXT_PUBLIC_BACKEND_URL=https://sightline-api-production.up.railway.app
```

### Step 2: Set Environment Variables in Railway
Go to your Railway project settings and ensure these are set:
```bash
# Core settings
RAILWAY_ENVIRONMENT=production
PRODUCTION=true

# Database - should already be set
DATABASE_URL=<your-neon-database-url>

# Required API Keys - ensure these are set
OPENAI_API_KEY=<your-openai-key>
YOUTUBE_API_KEY=<your-youtube-key>
GUMLOOP_API_KEY=<your-gumloop-key>
```

### Step 3: Verify CORS Configuration
The Python API should allow your production domains. Check that Railway API includes:
- https://sightlineai.io
- https://www.sightlineai.io
- https://*.vercel.app (for preview deployments)

### Step 4: Redeploy Both Services
1. **Railway (Python API)**: 
   - Push to trigger automatic deployment or manually redeploy
   - Wait for "Application startup complete" in logs

2. **Vercel (Frontend)**:
   - Redeploy after setting environment variables
   - Use "Redeploy" button in Vercel dashboard with "Use existing Build Cache" unchecked

## 🧪 Testing the Fix

### 1. Test Backend Health
```bash
curl https://sightline-api-production.up.railway.app/api/health
```
Should return: `{"status":"healthy","service":"sightline-api"}`

### 2. Test Frontend-Backend Connection
1. Open browser console on production site
2. Look for: `🔗 Backend URL: https://sightline-api-production.up.railway.app`
3. Should NOT see: `⚠️ WARNING: Backend URL not configured in production!`

### 3. Test Summary Creation
1. Go to https://sightlineai.io
2. Paste a YouTube URL
3. Click "Get Summary"
4. Watch for:
   - Progress bar should show real stages (not just simulation)
   - Should complete within 60-90 seconds
   - Summary should display with rich content

### 4. Check Progress Tracking
Open Network tab and look for:
- Request to: `https://sightline-api-production.up.railway.app/api/progress/{task_id}`
- Should return progress updates with stages

## 🔍 Debugging Checklist

If issues persist, check:

- [ ] **Environment Variables Set?**
  - Vercel: `NEXT_PUBLIC_BACKEND_URL` is set
  - Railway: All required API keys are set

- [ ] **Both Services Running?**
  - Railway: Check deployment logs for "Application startup complete"
  - Vercel: Check function logs for any errors

- [ ] **CORS Working?**
  - Browser console should not show CORS errors
  - Network tab should show successful OPTIONS requests

- [ ] **Database Accessible?**
  - Railway logs should not show database connection errors
  - Progress data should persist between requests

- [ ] **API Keys Valid?**
  - OpenAI API key is active and has credits
  - YouTube API key has quota remaining
  - Gumloop API key is valid

## 📊 Expected Flow

1. **User submits URL** → Frontend calls tRPC `summary.create`
2. **tRPC calls Python API** → `/api/summarize` with URL
3. **Python API returns** → task_id immediately
4. **Frontend polls progress** → `/api/progress/{task_id}` every 1-2 seconds
5. **Backend updates progress** → Through PostgreSQL storage
6. **Summary completes** → Frontend receives full summary data
7. **Data saved to DB** → Prisma creates/updates summary record

## 🚀 Quick Deploy Commands

### Railway (if using CLI)
```bash
railway up
railway logs
```

### Vercel (if using CLI)
```bash
vercel --prod
vercel env pull  # To verify env vars
```

## 📞 Support Channels

If you need help:
1. Check Railway logs: `railway logs` or dashboard
2. Check Vercel logs: Function logs in dashboard
3. Check browser console for client-side errors
4. Check Network tab for failed API calls

## ✅ Success Indicators

You'll know it's working when:
- Progress bar shows actual processing stages (not simulation)
- Summaries complete in 60-90 seconds
- Rich content (playbooks, frameworks, etc.) appears in summaries
- No console errors about missing backend URL
- No CORS errors in network tab