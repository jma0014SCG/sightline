# 🚨 IMMEDIATE DEPLOYMENT STEPS - FIX BROKEN PRODUCTION

Your production site is broken because it can't connect to the Python backend. I've added fallback code so the app won't crash, but you need to fix the backend connection.

## 🔧 What I Just Fixed

1. **Added fallback system** - App shows friendly error instead of crashing
2. **Enhanced error logging** - You can now see exactly what's failing
3. **Created health endpoints** - Visit `/api/backend-health` to diagnose issues
4. **Fixed JSON parse errors** - No more empty response crashes

## 🚀 Deploy These Fixes First

```bash
# Commit and push the fixes I just made
git add -A
git commit -m "fix: add backend fallback and error handling"
git push origin main
```

Wait for Vercel to auto-deploy (2-3 minutes), then check:
- https://sightlineai.io/api/backend-health - Shows what's broken
- https://sightlineai.io - Should work without crashing (shows fallback message)

## ⚡ Then Fix the Backend (15 minutes)

### Option A: Automated Deployment (Recommended)
```bash
# Run the automated deployment script
./scripts/deploy-api-to-railway.sh
```

This script will:
1. Deploy your API to Railway
2. Set up environment variables
3. Update Vercel with the Railway URL
4. Redeploy your frontend
5. Verify everything works

### Option B: Manual Deployment

#### Step 1: Deploy Python API to Railway (5 min)
```bash
cd api/
railway login
railway init  # Create new project when prompted
railway up    # Deploy the API
railway open  # Opens dashboard to get URL
```

#### Step 2: Set Environment Variables in Railway Dashboard (2 min)
Add these in Railway dashboard → Variables:
```
OPENAI_API_KEY=sk-...
YOUTUBE_API_KEY=...
GUMLOOP_API_KEY=...  # Optional
OXYLABS_USERNAME=... # Optional
OXYLABS_PASSWORD=... # Optional
```

#### Step 3: Update Vercel Environment Variables (3 min)
```bash
cd ..  # Back to project root

# Get your Railway URL (e.g.,
# Add it to Vercel:
vercel env add BACKEND_URL
# Paste: https://your-api.railway.app

vercel env add NEXT_PUBLIC_BACKEND_URL
# Paste: https://your-api.railway.app
```

#### Step 4: Redeploy Frontend (5 min)
```bash
vercel --prod --force
```

#### Step 5: Verify Deployment
```bash
# Test your Railway API
node scripts/verify-deployment.js https://your-api.railway.app
```

## ✅ Success Indicators

When properly deployed, you should see:
1. ✅ Railway API responds at https://your-api.railway.app/api/health
2. ✅ Vercel site can submit YouTube URLs
3. ✅ Progress tracking works
4. ✅ Summaries complete successfully

## 🔴 Current Status

**BEFORE FIX:**
- ❌ All summarization broken
- ❌ API calls fail with network errors
- ❌ Frontend tries to call localhost:8000
- ❌ No Python runtime on Vercel

**AFTER FIX:**
- ✅ Railway hosts Python API
- ✅ Frontend calls Railway URL
- ✅ All features working
- ✅ Proper production architecture

## 📊 Architecture After Fix

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │─────▶│ Vercel       │─────▶│  Railway    │
│             │      │ (Next.js)    │      │ (Python API)│
└─────────────┘      └──────────────┘      └─────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐      ┌─────────────┐
                     │   Neon DB    │      │   OpenAI    │
                     └──────────────┘      └─────────────┘
```

## 🚀 Deploy Now!

**Time Required:** 15 minutes
**Difficulty:** Easy
**Impact:** Restores ALL functionality

Run this command to start:
```bash
./scripts/deploy-api-to-railway.sh
```

Or if you prefer manual control, follow Option B above.

## 🆘 If You Get Stuck

1. **Railway Issues**: Check https://docs.railway.app
2. **Vercel Issues**: Run `vercel logs` to see errors
3. **API Not Working**: Check Railway logs with `railway logs`
4. **CORS Errors**: Make sure NEXT_PUBLIC_BACKEND_URL is set correctly

## 📝 Files Created for This Fix

- `/api/Procfile` - Railway process configuration
- `/api/runtime.txt` - Python version specification
- `/api/requirements.txt` - Python dependencies
- `/api/railway.json` - Railway configuration
- `/scripts/deploy-api-to-railway.sh` - Automated deployment
- `/scripts/verify-deployment.js` - Deployment verification
- `/RAILWAY_DEPLOYMENT_GUIDE.md` - Detailed documentation

## 🎯 Final Step: Remove Fallback

Once your Railway backend is working:

1. Edit `/src/server/api/routers/summary.ts`
2. Change the import back:
```typescript
// Remove the fallback
import { backendClient } from '@/lib/api/backend-client'
// Delete this line:
// import { backendClientWithFallback as backendClient } from '@/lib/api/backend-client-with-fallback'
```
3. Commit and push
4. Your app is now fully functional!

---

**YOUR PRODUCTION HAS A TEMPORARY FIX. DEPLOY THE CHANGES, THEN FIX THE BACKEND CONNECTION.**