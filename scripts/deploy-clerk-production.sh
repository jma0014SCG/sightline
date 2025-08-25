#!/bin/bash

# ============================================================================
# Clerk Production Deployment Script
# ============================================================================
# Purpose: Deploy Clerk configuration to Vercel production environment
# IMPORTANT: Set environment variables before running this script
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Clerk Production Deployment${NC}"
echo "=================================="

# Check required environment variables
if [ -z "${CLERK_SECRET_KEY:-}" ]; then
    echo -e "${RED}Error: CLERK_SECRET_KEY environment variable not set${NC}"
    echo "Export it before running:"
    echo "  export CLERK_SECRET_KEY='your-secret-key-here'"
    exit 1
fi

if [ -z "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable not set${NC}"
    echo "Export it before running:"
    echo "  export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='your-publishable-key-here'"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}Error: Vercel CLI is not installed${NC}"
    echo "Install it with: npm i -g vercel"
    exit 1
fi

echo -e "${YELLOW}Adding environment variables to Vercel...${NC}"

# Add Clerk production keys to Vercel
echo "Adding CLERK_SECRET_KEY..."
if vercel env add CLERK_SECRET_KEY production < <(echo "$CLERK_SECRET_KEY"); then
    echo -e "${GREEN}✓ CLERK_SECRET_KEY added successfully${NC}"
else
    echo -e "${RED}✗ Failed to add CLERK_SECRET_KEY${NC}"
    exit 1
fi

echo "Adding NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY..."
if vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production < <(echo "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"); then
    echo -e "${GREEN}✓ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY added successfully${NC}"
else
    echo -e "${RED}✗ Failed to add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY${NC}"
    exit 1
fi

# Optional: Add other Clerk-related environment variables
if [ -n "${CLERK_WEBHOOK_SECRET:-}" ]; then
    echo "Adding CLERK_WEBHOOK_SECRET..."
    if vercel env add CLERK_WEBHOOK_SECRET production < <(echo "$CLERK_WEBHOOK_SECRET"); then
        echo -e "${GREEN}✓ CLERK_WEBHOOK_SECRET added successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Failed to add CLERK_WEBHOOK_SECRET (optional)${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🎉 Clerk production deployment complete!${NC}"
echo "=================================="
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Deploy your application: vercel --prod"
echo "2. Verify Clerk authentication is working"
echo "3. Test webhook endpoints if configured"
echo ""
echo -e "${YELLOW}⚠️  Security Reminder:${NC}"
echo "- Never commit API keys to version control"
echo "- Rotate keys regularly"
echo "- Use environment variables for sensitive data"