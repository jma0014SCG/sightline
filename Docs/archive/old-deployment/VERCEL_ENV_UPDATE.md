# Vercel Environment Variables Update

## Required Environment Variables

Please ensure these are set in your Vercel dashboard at https://vercel.com/dashboard

### Backend API URLs
```
BACKEND_URL=https://sightline-ai-backend-production.up.railway.app
NEXT_PUBLIC_BACKEND_URL=https://sightline-ai-backend-production.up.railway.app
```

### Application URL
```
NEXT_PUBLIC_APP_URL=https://sightlineai.io
```

## How to Update in Vercel

1. Go to your Vercel dashboard
2. Select your Sightline project
3. Go to Settings → Environment Variables
4. Add or update the above variables for Production environment
5. Redeploy the application for changes to take effect

## Verify After Deployment

After updating, the frontend at https://sightlineai.io should properly connect to the Railway backend API.

Test by:
1. Going to https://sightlineai.io
2. Pasting a YouTube URL
3. The summarization should now work correctly