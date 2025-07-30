#!/bin/bash

# Production Deployment Script for Sightline.ai
# This script helps automate the deployment process

echo "🚀 Sightline.ai Production Deployment Script"
echo "==========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found!${NC}"
    echo "Installing Vercel CLI..."
    npm i -g vercel
fi

# Function to check if a command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1 failed!${NC}"
        exit 1
    fi
}

# Step 1: Build test
echo -e "\n${YELLOW}Step 1: Testing build...${NC}"
npm run build
check_status "Build test"

# Step 2: Type checking
echo -e "\n${YELLOW}Step 2: Running type checks...${NC}"
npm run typecheck
check_status "Type checking"

# Step 3: Link to Vercel (if not already linked)
echo -e "\n${YELLOW}Step 3: Linking to Vercel...${NC}"
if [ ! -f ".vercel/project.json" ]; then
    vercel link
    check_status "Vercel linking"
else
    echo -e "${GREEN}✅ Already linked to Vercel${NC}"
fi

# Step 4: Deploy to production
echo -e "\n${YELLOW}Step 4: Deploying to production...${NC}"
echo "This will deploy your current code to production."
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    vercel --prod
    check_status "Production deployment"
else
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo -e "\nNext steps:"
echo "1. Update Google OAuth redirect URIs"
echo "2. Configure Stripe webhook endpoint"
echo "3. Test all features in production"
echo "4. Monitor logs for any issues"

# Get production URL
echo -e "\n${YELLOW}Your production URL:${NC}"
vercel ls --prod | grep "Production" | head -1