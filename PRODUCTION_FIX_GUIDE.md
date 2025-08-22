# Production Deployment Fix Guide

## Issue Summary
The production summarization flow is broken because:
1. **CORS Configuration**: Railway backend was rejecting Vercel frontend requests
2. **Missing Gumloop Credentials**: Transcript extraction service not initialized
3. **Environment Variable Issues**: Some variables missing or incorrectly named

## Immediate Actions Required

### 1. Deploy Updated CORS Configuration to Railway
The CORS configuration has been updated in `api/index.py` to support:
- Production domain (https://sightline.ai)
- Vercel preview deployments (*.vercel.app)
- Dynamic origin configuration via environment variables

**Deploy the updated code:**
```bash
cd api
railway up
```

### 2. Add Missing Environment Variables to Railway

**Critical - Add Gumloop API Credentials:**
```bash
railway variables set GUMLOOP_API_KEY=b29a51e34c8d475b9a936d9dbc078d24
railway variables set GUMLOOP_USER_ID=BOJsm756awOuwFoccac3ISyK4cV2
railway variables set GUMLOOP_FLOW_ID=bPJRzorobbEyDxzt8dkz2n
```

**Optional - Add for better CORS handling:**
```bash
railway variables set NEXT_PUBLIC_APP_URL=https://sightline.ai
railway variables set RAILWAY_ENVIRONMENT=production
```

### 3. Verify Vercel Environment Variables

Ensure these are set in Vercel dashboard:
- `BACKEND_URL` = https://sightline-ai-backend-production.up.railway.app
- `NEXT_PUBLIC_BACKEND_URL` = https://sightline-ai-backend-production.up.railway.app

### 4. Restart Services

**Railway:**
```bash
railway restart
```

**Vercel:**
Trigger a redeployment from the Vercel dashboard or:
```bash
vercel --prod
```

## Verification Steps

### 1. Check Railway Health
```bash
curl https://sightline-ai-backend-production.up.railway.app/api/health
```
Expected: `{"status":"healthy","service":"sightline-api"}`

### 2. Check CORS Headers
```bash
curl -I -X OPTIONS https://sightline-ai-backend-production.up.railway.app/api/health \
  -H "Origin: https://sightline.ai" \
  -H "Access-Control-Request-Method: GET"
```
Should return `Access-Control-Allow-Origin: https://sightline.ai`

### 3. Test Summarization Flow
1. Go to https://sightline.ai
2. Enter a YouTube URL
3. Monitor browser console for errors
4. Check Railway logs: `railway logs`

## Troubleshooting

### If CORS errors persist:
1. Check Railway logs for the printed allowed origins
2. Verify the exact domain being used by Vercel
3. Add specific domain to `ALLOWED_ORIGINS` environment variable

### If summarization still fails:
1. Check Railway logs for specific errors
2. Verify all YouTube/transcript service credentials are set
3. Ensure DATABASE_URL is correctly configured

### If connection timeouts occur:
1. Verify Railway service is running: `railway status`
2. Check if PORT=8000 is set in Railway
3. Ensure no firewall/proxy issues

## Data Flow Verification

The complete flow should be:
1. **Frontend** (Vercel) → URLInput component
2. **tRPC Router** → Uses backendClient with BACKEND_URL
3. **Railway Backend** → Receives POST to /api/summarize
4. **Transcript Services** → Gumloop → YouTube → YT-DLP → Oxylabs (fallback chain)
5. **AI Processing** → OpenAI via LangChain
6. **Response** → Back through the chain to frontend

## Environment Variable Reference

### Railway (Python API)
- `PORT=8000`
- `DATABASE_URL` (PostgreSQL for progress storage)
- `OPENAI_API_KEY` (Required for summarization)
- `GUMLOOP_API_KEY` (Primary transcript service)
- `GUMLOOP_USER_ID`
- `GUMLOOP_FLOW_ID`
- `YOUTUBE_API_KEY` (Optional fallback)
- `OXYLABS_USERNAME` (Optional fallback)
- `OXYLABS_PASSWORD` (Optional fallback)

### Vercel (Next.js Frontend)
- `BACKEND_URL` (Railway API URL)
- `NEXT_PUBLIC_BACKEND_URL` (Same as BACKEND_URL)
- `DATABASE_URL` (Neon PostgreSQL)
- `CLERK_*` (Authentication)
- `STRIPE_*` (Payments)

## Success Indicators
✅ Railway health check returns 200
✅ No CORS errors in browser console
✅ Transcript extraction successful (check Railway logs)
✅ Summary appears in frontend after processing
✅ Progress bar updates during processing