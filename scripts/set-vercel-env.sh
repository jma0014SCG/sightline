#!/bin/bash

echo "Setting critical environment variables in Vercel..."

# Backend API URLs
echo "https://sightline-ai-backend-production.up.railway.app" | vercel env add BACKEND_URL production
echo "https://sightline-ai-backend-production.up.railway.app" | vercel env add NEXT_PUBLIC_BACKEND_URL production

# Application URL
echo "https://sightlineai.io" | vercel env add NEXT_PUBLIC_APP_URL production

echo "Environment variables set! Now redeploy with: vercel --prod"