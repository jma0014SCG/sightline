#!/bin/bash

# ============================================================================
# Post-Security Fix Deployment Script
# ============================================================================
# Purpose: Guide through steps after removing exposed secrets from git history
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Post-Security Fix Deployment Guide${NC}"
echo "======================================"
echo ""

# Step 1: Verify secret removal
echo -e "${YELLOW}Step 1: Verifying secret removal from git history...${NC}"
SECRET_COUNT=$(git log -p --all --full-history -- scripts/deploy-clerk-production.sh | grep -c "sk_live_" || echo "0")

if [ "$SECRET_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✓ No secrets found in git history${NC}"
else
    echo -e "${RED}✗ Warning: Found $SECRET_COUNT instances of secrets in history${NC}"
    echo -e "${RED}  Run: git filter-branch to clean history${NC}"
    exit 1
fi

# Step 2: Check environment variables
echo ""
echo -e "${YELLOW}Step 2: Checking environment variables...${NC}"

if [ -z "${CLERK_SECRET_KEY:-}" ]; then
    echo -e "${RED}✗ CLERK_SECRET_KEY not set${NC}"
    echo "  Export it before deployment:"
    echo "  export CLERK_SECRET_KEY='your-new-secret-key'"
    ENV_READY=false
else
    echo -e "${GREEN}✓ CLERK_SECRET_KEY is set${NC}"
    ENV_READY=true
fi

if [ -z "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]; then
    echo -e "${RED}✗ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set${NC}"
    echo "  Export it before deployment:"
    echo "  export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='your-publishable-key'"
    ENV_READY=false
else
    echo -e "${GREEN}✓ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set${NC}"
fi

# Step 3: Next steps guidance
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "======================================"

echo -e "${YELLOW}1. IMMEDIATE: Rotate Clerk Secret Key${NC}"
echo "   - Go to: https://dashboard.clerk.com"
echo "   - Navigate to: API Keys"
echo "   - Rotate the compromised secret key"
echo "   - Copy the new secret key"
echo ""

echo -e "${YELLOW}2. Update Environment Variables${NC}"
echo "   Local (.env.local):"
echo "   - Update CLERK_SECRET_KEY with new value"
echo "   - Verify NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is correct"
echo ""
echo "   Vercel:"
echo "   - Run: vercel env rm CLERK_SECRET_KEY production"
echo "   - Run: vercel env add CLERK_SECRET_KEY production"
echo "   - Enter the new secret key when prompted"
echo ""

echo -e "${YELLOW}3. Force Push Clean History${NC}"
echo "   ⚠️  WARNING: This will rewrite remote history"
echo "   - Coordinate with team members first"
echo "   - Run: git push --force-with-lease origin main"
echo ""

echo -e "${YELLOW}4. Clean Remote Repository${NC}"
echo "   GitHub Settings → Security → Secret scanning"
echo "   - Enable secret scanning"
echo "   - Enable push protection"
echo ""

echo -e "${YELLOW}5. Deploy to Vercel${NC}"
if [ "$ENV_READY" = true ]; then
    echo -e "${GREEN}   Environment variables are set. Ready to deploy!${NC}"
    echo "   Run: pnpm deploy"
else
    echo -e "${RED}   Set environment variables first before deploying${NC}"
fi
echo ""

echo -e "${YELLOW}6. Verify Deployment${NC}"
echo "   - Check Vercel deployment logs"
echo "   - Test authentication flow"
echo "   - Monitor for any auth errors"
echo ""

# Step 4: Repository statistics
echo -e "${BLUE}📊 Repository Optimization Results:${NC}"
echo "======================================"

# Check repository size
REPO_SIZE=$(du -sh .git 2>/dev/null | cut -f1)
echo "Repository size: $REPO_SIZE"

# Check image optimization results
if [ -d "public/images" ]; then
    ORIGINAL_SIZE=$(find public/images -name "*.original.*" -type f -exec du -ch {} + 2>/dev/null | grep total | cut -f1 || echo "N/A")
    OPTIMIZED_SIZE=$(find public/images \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.webp" \) ! -name "*.original.*" -type f -exec du -ch {} + 2>/dev/null | grep total | cut -f1 || echo "N/A")
    echo "Original images: $ORIGINAL_SIZE"
    echo "Optimized images: $OPTIMIZED_SIZE"
fi

echo ""
echo -e "${GREEN}✨ Security fix complete!${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}⚠️  Security Reminders:${NC}"
echo "- Never commit secrets to version control"
echo "- Always use environment variables for sensitive data"
echo "- Enable GitHub secret scanning and push protection"
echo "- Rotate keys immediately if exposed"
echo "- Use git-secrets or similar tools for prevention"