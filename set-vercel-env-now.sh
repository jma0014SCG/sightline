#!/bin/bash

echo "🚀 Setting Vercel environment variables for production..."

# Critical Backend URLs
echo "Setting backend URLs..."
echo "https://sightline-ai-backend-production.up.railway.app" | vercel env add NEXT_PUBLIC_BACKEND_URL production 2>/dev/null || echo "NEXT_PUBLIC_BACKEND_URL already exists"
echo "https://sightline-ai-backend-production.up.railway.app" | vercel env add BACKEND_URL production 2>/dev/null || echo "BACKEND_URL already exists"
echo "https://sightline-ai-backend-production.up.railway.app" | vercel env add NEXT_PUBLIC_API_URL production 2>/dev/null || echo "NEXT_PUBLIC_API_URL already exists"

# Database URL (from your .env file)
echo "Setting database URL..."
echo "postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-plain-king-aec6xvqs-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require" | vercel env add DATABASE_URL production 2>/dev/null || echo "DATABASE_URL already exists"

# Clerk Authentication
echo "Setting Clerk keys..."
echo "pk_test_cG9zaXRpdmUtd2FydGhvZy01Mi5jbGVyay5hY2NvdW50cy5kZXYk" | vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production 2>/dev/null || echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY already exists"
echo "sk_test_vs5Zp3LwpoH7g1DJvsi5QP2SbrtBWZYbOTUJXvmeKs" | vercel env add CLERK_SECRET_KEY production 2>/dev/null || echo "CLERK_SECRET_KEY already exists"
echo "whsec_PaeT8jLMDpdjKfSszvYfMJYrmpv1+Kqk" | vercel env add CLERK_WEBHOOK_SECRET production 2>/dev/null || echo "CLERK_WEBHOOK_SECRET already exists"

# OpenAI API Key (from your .env.local)
echo "Setting OpenAI key..."
echo "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" | vercel env add OPENAI_API_KEY production 2>/dev/null || echo "OPENAI_API_KEY already exists"

# Stripe Keys
echo "Setting Stripe keys..."
echo "sk_test_51QvIZPCy13fiBRAHTogRm4oTEpgT4MtNxDyU6e6WG88xuLmwZ1xovtIZYP0IeVZ21g4qevF3DNbLxpRWi4UE48jq00lW9AjEH2" | vercel env add STRIPE_SECRET_KEY production 2>/dev/null || echo "STRIPE_SECRET_KEY already exists"
echo "pk_test_51QvIZPCy13fiBRAHDj5Y5pL5TbanirimJLwpDcF2fbuh30VdOvFWSUYJPc8HEsm7rg29PeRgjUN8ePa3afDO4SV700Rcl74peq" | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production 2>/dev/null || echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY already exists"
echo "price_1RnjYKCy13fiBRAHpaHORqNS" | vercel env add STRIPE_PRO_PRICE_ID production 2>/dev/null || echo "STRIPE_PRO_PRICE_ID already exists"
echo "price_1RnjYKCy13fiBRAHpaHORqNS" | vercel env add NEXT_PUBLIC_STRIPE_PRO_PRICE_ID production 2>/dev/null || echo "NEXT_PUBLIC_STRIPE_PRO_PRICE_ID already exists"

# Gumloop API
echo "Setting Gumloop keys..."
echo "b29a51e34c8d475b9a936d9dbc078d24" | vercel env add GUMLOOP_API_KEY production 2>/dev/null || echo "GUMLOOP_API_KEY already exists"
echo "BOJsm756awOuwFoccac3ISyK4cV2" | vercel env add GUMLOOP_USER_ID production 2>/dev/null || echo "GUMLOOP_USER_ID already exists"

# Oxylabs
echo "Setting Oxylabs credentials..."
echo "sightlineai_Sh2z6" | vercel env add OXYLABS_USERNAME production 2>/dev/null || echo "OXYLABS_USERNAME already exists"
echo "Y1q48uCXoMEW_C" | vercel env add OXYLABS_PASSWORD production 2>/dev/null || echo "OXYLABS_PASSWORD already exists"

# App URL
echo "Setting app URL..."
echo "https://sightlineai.io" | vercel env add NEXT_PUBLIC_APP_URL production 2>/dev/null || echo "NEXT_PUBLIC_APP_URL already exists"

echo ""
echo "✅ Environment variables set!"
echo ""
echo "Now triggering a new deployment with cleared cache..."
vercel --prod --force

echo ""
echo "🎉 Deployment triggered! Check the Vercel dashboard for progress."