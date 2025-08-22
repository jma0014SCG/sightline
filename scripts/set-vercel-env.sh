#!/bin/bash

# Script to set all required environment variables in Vercel
# Run this to configure your production deployment

echo "🚀 Setting up Vercel environment variables..."

# Backend URLs (CRITICAL - without these, the app won't work!)
echo "Setting backend URLs..."
vercel env add NEXT_PUBLIC_BACKEND_URL production <<< "https://sightline-ai-backend-production.up.railway.app"
vercel env add BACKEND_URL production <<< "https://sightline-ai-backend-production.up.railway.app"  
vercel env add NEXT_PUBLIC_API_URL production <<< "https://sightline-ai-backend-production.up.railway.app"

echo "✅ Backend URLs configured!"
echo ""
echo "⚠️  IMPORTANT: You still need to manually add these sensitive keys in Vercel Dashboard:"
echo "   - OPENAI_API_KEY (get from OpenAI)"
echo "   - STRIPE_SECRET_KEY (get from Stripe)"
echo "   - CLERK_WEBHOOK_SECRET (get from Clerk)"
echo "   - STRIPE_WEBHOOK_SECRET (get from Stripe)"
echo "   - GUMLOOP_API_KEY (get from Gumloop)"
echo "   - OXYLABS_USERNAME (get from Oxylabs)"
echo "   - OXYLABS_PASSWORD (get from Oxylabs)"
echo "   - MAILERLITE_API_KEY (get from MailerLite)"
echo ""
echo "After adding these, redeploy your application!"
