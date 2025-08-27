# 🚨 Railway Backend Production Fix Guide

**Issue**: Railway backend not connecting with Vercel production frontend
**Date**: 2025-01-26
**Status**: FIXES APPLIED - Requires Vercel Deployment

## 🔍 Root Cause Analysis

### 1. **Content Security Policy (CSP) Blocking** ✅ FIXED
- **Problem**: CSP header in `next.config.js` was blocking requests to Railway backend
- **Symptom**: Browser console shows CSP violation errors
- **Solution**: Added Railway URLs to `connect-src` directive

### 2. **Environment Variable Configuration**
- **Problem**: `NEXT_PUBLIC_BACKEND_URL` may not be available at build time in Vercel
- **Symptom**: Backend URL falls back to localhost in production
- **Solution**: Ensure environment variables are set in Vercel dashboard

### 3. **CORS Configuration** ✅ VERIFIED
- **Status**: Railway backend properly configured for Vercel deployments
- **Allows**: All Vercel preview URLs and production domain

## 📋 Fixes Applied

### Fix #1: Updated CSP Headers in `next.config.js`
```javascript
// Added to connect-src:
'https://sightline-ai-backend-production.up.railway.app'
'https://*.railway.app'
'http://localhost:8000'  // For local development
```

### Fix #2: Created Railway Backend Test Script
```bash
# Test Railway backend connectivity
node scripts/test-railway-backend.js
```

## 🚀 Deployment Steps

### Step 1: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/jma0014-gmailcoms-projects/sightline-ai/settings/environment-variables)

2. Ensure these variables are set for **Production**:
```bash
NEXT_PUBLIC_BACKEND_URL=https://sightline-ai-backend-production.up.railway.app
BACKEND_URL=https://sightline-ai-backend-production.up.railway.app
NEXT_PUBLIC_API_URL=https://sightline-ai-backend-production.up.railway.app

# Also verify these are set (from .env.production):
DATABASE_URL=postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-royal-sun-aer2owja-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-royal-sun-aer2owja.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
```

3. **IMPORTANT**: These must be available at **build time**, not just runtime!

### Step 2: Test Railway Backend Locally
```bash
# Run the test script
node scripts/test-railway-backend.js

# Expected output:
# ✅ All endpoints responding
# ✅ CORS headers present
```

### Step 3: Deploy to Vercel
```bash
# Force a new deployment with updated config
vercel --prod --force

# Or trigger from Vercel dashboard
```

### Step 4: Verify Production
After deployment, check:

1. **Browser Console** (on production site):
   - No CSP violation errors
   - No CORS errors
   - Backend requests going to Railway URL

2. **Network Tab**:
   - API calls to `https://sightline-ai-backend-production.up.railway.app`
   - Status codes 200/201
   - Proper JSON responses

3. **Test Summary Creation**:
   - Go to production site
   - Enter a YouTube URL
   - Should see progress updates
   - Summary should complete successfully

## 🧪 Testing Commands

### Local Testing
```bash
# Test Railway backend connectivity
node scripts/test-railway-backend.js

# Test with production environment
NODE_ENV=production npm run dev

# Check environment variables
node -e "console.log(process.env.NEXT_PUBLIC_BACKEND_URL)"
```

### Production Testing
```bash
# Check deployment logs
vercel logs --prod

# Monitor Railway logs
# Go to: https://railway.app/project/[your-project-id]/logs
```

## 🔍 Troubleshooting

### If Backend Still Not Connecting:

1. **Check Railway Service Status**:
   - Go to Railway dashboard
   - Ensure service is "Active"
   - Check deployment logs for errors

2. **Verify Environment Variables in Vercel**:
   ```bash
   vercel env ls production
   ```

3. **Test Backend Directly**:
   ```bash
   curl https://sightline-ai-backend-production.up.railway.app/api/health
   ```

4. **Check Browser Console** for:
   - CSP violations
   - CORS errors
   - Network failures

5. **Railway Environment Variables**:
   Ensure these are set in Railway:
   - `OPENAI_API_KEY`
   - `GUMLOOP_API_KEY`
   - `DATABASE_URL`
   - `RAILWAY_ENVIRONMENT=production`

### Common Issues:

| Issue | Solution |
|-------|----------|
| CSP violation errors | Deploy the updated `next.config.js` |
| CORS errors | Check Railway CORS config in `api/index.py` |
| 404 errors | Verify Railway deployment is successful |
| Timeout errors | Check Railway service health |
| Empty responses | Check Railway logs for Python errors |

## 📊 Expected Behavior

When working correctly:

1. **Landing Page**: 
   - URL input accepts YouTube links
   - Shows progress bar during processing

2. **Summary Creation**:
   - Progress updates: 5% → 25% → 60% → 100%
   - Takes 20-30 seconds for average video
   - Returns formatted summary with sections

3. **Network Requests**:
   - POST to `/api/trpc/summary.createAnonymous`
   - Backend calls to `https://sightline-ai-backend-production.up.railway.app/api/summarize`
   - Progress polling to `/api/progress/{task_id}`

## ✅ Verification Checklist

- [ ] CSP headers updated in `next.config.js`
- [ ] Environment variables set in Vercel dashboard
- [ ] Railway backend responding to health checks
- [ ] Vercel deployment successful
- [ ] No CSP violations in browser console
- [ ] No CORS errors in network tab
- [ ] Summary creation working end-to-end
- [ ] Progress tracking functioning

## 🚨 Emergency Rollback

If issues persist after deployment:

1. **Revert CSP Changes**:
   ```bash
   git revert HEAD
   vercel --prod
   ```

2. **Use Fallback Backend**:
   - The code has fallback to mock data
   - Users will see "Service Temporarily Unavailable"

3. **Contact Support**:
   - Railway: Check service status
   - Vercel: Check deployment logs

## 📝 Notes

- The Railway backend URL must be in the CSP `connect-src` directive
- Environment variables must be available at **build time** in Vercel
- CORS is properly configured on Railway backend
- Database migration to production branch is complete
- All required services (Clerk, Stripe, OpenAI) should be configured

## 🎯 Next Steps

1. **Immediate**: Deploy to Vercel with updated CSP headers
2. **Verify**: Test summary creation on production
3. **Monitor**: Check logs for any errors
4. **Optimize**: Consider adding caching for better performance

---

*Fix implemented: 2025-01-26*
*Railway Backend: https://sightline-ai-backend-production.up.railway.app*
*Production Frontend: https://sightlineai.io*