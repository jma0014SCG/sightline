#!/bin/bash

echo "🚀 Deploying Sightline to Vercel..."
echo ""
echo "This will:"
echo "1. Connect to your Vercel account"
echo "2. Create/link the project"
echo "3. Deploy to production"
echo ""

# Deploy to Vercel
echo "📦 Starting Vercel deployment..."
vercel --prod

echo ""
echo "✅ Deployment command executed!"
echo ""
echo "📋 Next steps after deployment:"
echo "1. Note your production URL from the output above"
echo "2. Update Google OAuth redirect URIs in Google Cloud Console"
echo "3. Configure Stripe webhooks with your production URL"
echo "4. Update STRIPE_WEBHOOK_SECRET in Vercel after creating the webhook"
echo ""
echo "🔗 Important URLs:"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- Google Cloud Console: https://console.cloud.google.com"
echo "- Stripe Dashboard: https://dashboard.stripe.com/webhooks"