#!/bin/bash

# Clerk Production Deployment Script
# This script helps set up Clerk production keys in Vercel

echo "🔐 Clerk Production Setup for Vercel"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI is not installed${NC}"
    echo "Please install it with: npm i -g vercel"
    exit 1
fi

echo -e "${YELLOW}⚠️  SECURITY WARNING:${NC}"
echo "This script will add production keys to Vercel."
echo "Make sure you're in a secure environment."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Source the production environment file
if [ ! -f ".env.production.local" ]; then
    echo -e "${RED}❌ .env.production.local not found${NC}"
    exit 1
fi

echo ""
echo "📝 Adding Clerk keys to Vercel..."
echo ""

# Add Clerk production keys to Vercel
echo "Adding CLERK_SECRET_KEY..."
vercel env add CLERK_SECRET_KEY production < <(echo "REDACTED_SECRET_KEY")

echo "Adding NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY..."
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production < <(echo "pk_live_Y2xlcmsuc2lnaHRsaW5lYWkuaW8k")

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Webhook Setup Required${NC}"
echo "======================================"
echo ""
echo "You MUST complete the webhook setup in Clerk Dashboard:"
echo ""
echo "1. Go to: https://dashboard.clerk.com"
echo "2. Select your production instance"
echo "3. Navigate to: Webhooks -> Create Endpoint"
echo "4. Add endpoint URL: https://sightlineai.io/api/webhooks/clerk"
echo "5. Subscribe to events:"
echo "   ✅ user.created"
echo "   ✅ user.updated"
echo "   ✅ user.deleted"
echo "6. Copy the Signing Secret (starts with whsec_)"
echo "7. Run: vercel env add CLERK_WEBHOOK_SECRET production"
echo "8. Paste the webhook secret when prompted"
echo ""

echo -e "${GREEN}✅ Clerk production keys added to Vercel!${NC}"
echo ""
echo "Next steps:"
echo "1. Complete webhook setup (see above)"
echo "2. Deploy to production: pnpm deploy"
echo "3. Test authentication flow"
echo ""

# Offer to pull current env vars to verify
read -p "Pull current Vercel env vars to verify? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Current production environment variables:"
    vercel env ls production
fi