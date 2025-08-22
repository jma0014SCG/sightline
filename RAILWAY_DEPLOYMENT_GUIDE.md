# Railway Deployment Guide for Sightline Python API

## 🚀 Quick Deployment Steps

### 1. Install Railway CLI (if not installed)
```bash
# macOS
brew install railway

# Or via npm
npm install -g @railway/cli
```

### 2. Deploy Python API to Railway

```bash
# Navigate to API directory
cd api/

# Login to Railway
railway login

# Initialize new Railway project
railway init

# Link to existing project (if you have one)
# railway link

# Deploy to Railway
railway up

# Open Railway dashboard to view deployment
railway open
```

### 3. Set Environment Variables on Railway

After deployment, go to your Railway dashboard and add these environment variables:

```env
# Required API Keys
OPENAI_API_KEY=sk-...your-key...
YOUTUBE_API_KEY=...your-youtube-api-key...

# Optional but recommended
GUMLOOP_API_KEY=...if-you-have-one...
OXYLABS_USERNAME=...if-you-have-one...
OXYLABS_PASSWORD=...if-you-have-one...

# Redis Cache (optional)
UPSTASH_REDIS_URL=...your-upstash-url...
UPSTASH_REDIS_TOKEN=...your-upstash-token...

# Monitoring (optional)
SENTRY_DSN=...your-sentry-dsn...
```

### 4. Get Your Railway API URL

After deployment, Railway will provide you with a URL like:
- `https://sightline-api-production.up.railway.app`
- Or a custom domain if configured

### 5. Update Vercel Environment Variables

```bash
# Add backend URL to Vercel (from project root)
cd ..

# Add production backend URL
vercel env add BACKEND_URL
# When prompted, enter: https://your-railway-url.railway.app

vercel env add NEXT_PUBLIC_BACKEND_URL  
# When prompted, enter: https://your-railway-url.railway.app

# Select "Production" environment when prompted
```

### 6. Redeploy Frontend on Vercel

```bash
# Force redeploy with new environment variables
vercel --prod --force
```

## 🔍 Verification Steps

### Test Railway API Health
```bash
# Replace with your actual Railway URL
curl https://your-api.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-21T..."
}
```

### Test Summarization Endpoint
```bash
curl -X POST https://your-api.railway.app/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "user_id": "test-user"
  }'
```

## 🔧 Railway Configuration Details

### Procfile
```
web: uvicorn index:app --host 0.0.0.0 --port $PORT --workers 1 --log-level info
```

### Runtime
- Python 3.11.9
- Automatically detected from `runtime.txt`

### Health Check
- Endpoint: `/api/health`
- Timeout: 30 seconds
- Automatic restarts on failure

## 📊 Railway Dashboard Features

### Monitoring
- View logs: `railway logs`
- View metrics: Check dashboard for CPU, memory, network usage
- Set up alerts for errors or high resource usage

### Scaling
- Horizontal scaling: Add more dynos in Railway dashboard
- Vertical scaling: Upgrade plan for more resources
- Auto-scaling: Configure based on traffic patterns

## 🐛 Troubleshooting

### Common Issues

#### 1. Module Import Errors
```bash
# If you see import errors, ensure all dependencies are in requirements.txt
railway run pip freeze > requirements.txt
railway up
```

#### 2. Port Binding Issues
Make sure your Procfile uses `$PORT`:
```
web: uvicorn index:app --host 0.0.0.0 --port $PORT
```

#### 3. Environment Variables Not Loading
```bash
# Check current environment variables
railway variables

# Add missing variables
railway variables set OPENAI_API_KEY=sk-...
```

#### 4. CORS Issues
Your API already has CORS configured for production domains. If issues persist:
1. Check `api/index.py` CORS settings
2. Ensure frontend URL is in allowed origins

#### 5. Timeout Issues
For long-running video processing:
- Railway has a 5-minute timeout by default
- Consider implementing background jobs with progress tracking
- Or upgrade to Railway Pro for longer timeouts

## 🔄 Updating the API

### Deploy Updates
```bash
cd api/
# Make your changes
railway up
```

### Rollback Deployment
```bash
# View deployment history
railway deployments

# Rollback to previous version
railway rollback
```

## 💰 Railway Pricing

### Hobby Plan (Free)
- $5 free credit/month
- Good for testing and development
- Limited resources

### Pro Plan ($20/month)
- Unlimited projects
- More resources
- Team collaboration
- Custom domains

## 🎯 Next Steps After Deployment

1. **Monitor Initial Performance**
   - Check Railway logs for any errors
   - Monitor response times
   - Verify all endpoints working

2. **Set Up Custom Domain** (optional)
   ```bash
   railway domain
   ```

3. **Configure Auto-Deploy** (optional)
   - Connect GitHub repo to Railway
   - Auto-deploy on push to main branch

4. **Add Redis Caching** (recommended)
   - Sign up for Upstash Redis
   - Add UPSTASH_REDIS_URL to Railway env vars
   - Improves response times significantly

5. **Set Up Monitoring**
   - Add Sentry for error tracking
   - Configure Railway metrics alerts
   - Set up uptime monitoring (e.g., UptimeRobot)

## 📞 Support Resources

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

## ✅ Deployment Checklist

- [ ] Railway CLI installed
- [ ] API deployed to Railway
- [ ] Environment variables configured on Railway
- [ ] Railway URL obtained
- [ ] Vercel environment variables updated
- [ ] Frontend redeployed
- [ ] Health endpoint tested
- [ ] Summarization endpoint tested
- [ ] Monitoring configured
- [ ] Custom domain setup (optional)

---

**Deployment should take 10-15 minutes total. Your API will be live and ready to handle production traffic!**