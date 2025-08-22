#!/bin/bash

echo "🚀 Railway Deployment Fix Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Setting critical environment variables in Railway${NC}"
echo "Please run these commands in your terminal:"
echo ""
echo "# Set Gumloop credentials (CRITICAL - without these, summarization won't work)"
echo "railway variables set GUMLOOP_API_KEY=b29a51e34c8d475b9a936d9dbc078d24"
echo "railway variables set GUMLOOP_USER_ID=BOJsm756awOuwFoccac3ISyK4cV2"
echo "railway variables set GUMLOOP_FLOW_ID=bPJRzorobbEyDxzt8dkz2n"
echo ""
echo "# Set Railway environment flag for CORS"
echo "railway variables set RAILWAY_ENVIRONMENT=production"
echo ""
echo "# Ensure PORT is set correctly"
echo "railway variables set PORT=8000"
echo ""
echo -e "${GREEN}✅ Press Enter after running these commands...${NC}"
read

echo -e "${YELLOW}Step 2: Deploying the updated API code${NC}"
cd api

# Check if we're in the api directory
if [ ! -f "index.py" ]; then
    echo -e "${RED}❌ Error: Not in the api directory${NC}"
    exit 1
fi

echo "Deploying to Railway..."
railway up

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${YELLOW}Step 3: Verify deployment${NC}"
echo "Testing health endpoint..."

# Wait for deployment to be ready
sleep 10

# Test health endpoint
HEALTH_RESPONSE=$(curl -s --max-time 5 https://sightline-ai-backend-production.up.railway.app/api/health)

if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo -e "${GREEN}✅ API is healthy!${NC}"
    echo "Response: $HEALTH_RESPONSE"
else
    echo -e "${RED}❌ API health check failed${NC}"
    echo "Response: $HEALTH_RESPONSE"
    echo ""
    echo "Please check Railway logs:"
    echo "railway logs"
fi

echo ""
echo -e "${YELLOW}Step 4: Test CORS${NC}"
CORS_TEST=$(curl -I -s --max-time 5 -X OPTIONS https://sightline-ai-backend-production.up.railway.app/api/health \
  -H "Origin: https://sightline.ai" \
  -H "Access-Control-Request-Method: GET" | grep "access-control-allow-origin")

if [[ $CORS_TEST == *"sightline.ai"* ]]; then
    echo -e "${GREEN}✅ CORS is configured correctly!${NC}"
    echo "Header: $CORS_TEST"
else
    echo -e "${RED}❌ CORS configuration issue${NC}"
    echo "Header: $CORS_TEST"
fi

echo ""
echo -e "${YELLOW}Step 5: Update Vercel environment variables${NC}"
echo "Make sure these are set in Vercel dashboard:"
echo ""
echo "BACKEND_URL=https://sightline-ai-backend-production.up.railway.app"
echo "NEXT_PUBLIC_BACKEND_URL=https://sightline-ai-backend-production.up.railway.app"
echo ""
echo -e "${GREEN}✅ Deployment fix complete!${NC}"
echo ""
echo "Test the full flow at: https://sightline.ai"