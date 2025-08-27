#!/bin/bash

# Script to set production environment variables in Vercel
# IMPORTANT: Run this to add missing API keys to production

echo "🔧 Setting Production Environment Variables in Vercel..."
echo "=================================================="

# Critical for summaries to work
echo "📝 Setting OpenAI API Key (CRITICAL for summaries)..."
vercel env add OPENAI_API_KEY production

echo "📝 Setting YouTube API Key..."
vercel env add YOUTUBE_API_KEY production

# Stripe keys for payments
echo "💳 Setting Stripe Secret Key..."
vercel env add STRIPE_SECRET_KEY production

echo "💳 Setting Stripe Publishable Key..."
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

echo "💳 Setting Stripe Webhook Secret..."
vercel env add STRIPE_WEBHOOK_SECRET production

# Optional but useful
echo "📝 Setting Gumloop API Key (optional)..."
vercel env add GUMLOOP_API_KEY production

echo ""
echo "✅ Environment variables set!"
echo ""
echo "🚀 Now deploy to apply changes:"
echo "   vercel --prod --force"
echo ""
echo "📋 To verify all env vars are set:"
echo "   vercel env ls production"