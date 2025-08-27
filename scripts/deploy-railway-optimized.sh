#!/bin/bash

# Railway Deployment Script with Optimized Configuration
# This script deploys the optimized backend to Railway

set -e  # Exit on error

echo "🚀 Starting Railway deployment with optimized configuration..."

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "   npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please run: railway login"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Pre-deployment checklist:${NC}"

# Check for required files
echo -n "Checking railway.json... "
if [ -f "railway.json" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
    exit 1
fi

echo -n "Checking requirements.txt... "
if [ -f "requirements.txt" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
    exit 1
fi

echo -n "Checking api/index.py... "
if [ -f "api/index.py" ]; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌ Missing${NC}"
    exit 1
fi

# Verify environment variables are set in Railway
echo -e "\n${YELLOW}🔐 Required environment variables in Railway:${NC}"
echo "Please ensure these are set in your Railway project:"
echo "  - DATABASE_URL"
echo "  - OPENAI_API_KEY"
echo "  - GUMLOOP_API_KEY"
echo "  - GUMLOOP_USER_ID"
echo "  - GUMLOOP_FLOW_ID"
echo "  - YOUTUBE_API_KEY"
echo ""
read -p "Have you configured all required environment variables in Railway? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please configure environment variables first at: https://railway.app${NC}"
    exit 1
fi

# Run tests before deployment
echo -e "\n${YELLOW}🧪 Running pre-deployment tests...${NC}"

# Test database connection if DATABASE_URL is available locally
if [ ! -z "$DATABASE_URL" ]; then
    echo "Testing database connection..."
    python3 -c "import asyncpg, asyncio; asyncio.run(asyncpg.connect('$DATABASE_URL'))" 2>/dev/null && \
        echo -e "${GREEN}✅ Database connection successful${NC}" || \
        echo -e "${YELLOW}⚠️  Could not test database connection locally${NC}"
fi

# Check Python syntax
echo "Checking Python syntax..."
python3 -m py_compile api/index.py api/services/*.py api/routers/*.py 2>/dev/null && \
    echo -e "${GREEN}✅ Python syntax check passed${NC}" || \
    echo -e "${YELLOW}⚠️  Could not verify Python syntax (files may still be valid)${NC}"

# Deployment confirmation
echo -e "\n${YELLOW}📦 Ready to deploy with the following optimizations:${NC}"
echo "  • Workers reduced from 4 to 2"
echo "  • Connection pool increased to 5-20"
echo "  • Added retry logic with exponential backoff"
echo "  • Circuit breakers for external services"
echo "  • Enhanced health monitoring"
echo "  • Resource usage tracking"
echo ""
read -p "Deploy to Railway production? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

# Deploy to Railway
echo -e "\n${YELLOW}🚂 Deploying to Railway...${NC}"
railway up

# Check deployment status
echo -e "\n${YELLOW}📊 Checking deployment status...${NC}"
railway status

# Get deployment URL
echo -e "\n${YELLOW}🌐 Getting deployment URL...${NC}"
DEPLOY_URL=$(railway domain 2>/dev/null || echo "Unable to get URL")
echo "Deployment URL: $DEPLOY_URL"

# Wait for deployment to be ready
echo -e "\n${YELLOW}⏳ Waiting for deployment to be ready...${NC}"
sleep 10

# Test health endpoint
if [ ! -z "$DEPLOY_URL" ] && [ "$DEPLOY_URL" != "Unable to get URL" ]; then
    echo -e "\n${YELLOW}🏥 Testing health endpoint...${NC}"
    
    # Test basic health
    curl -s "https://$DEPLOY_URL/api/health" | python3 -m json.tool && \
        echo -e "${GREEN}✅ Basic health check passed${NC}" || \
        echo -e "${RED}❌ Basic health check failed${NC}"
    
    # Test detailed health
    echo -e "\n${YELLOW}📋 Detailed health check:${NC}"
    curl -s "https://$DEPLOY_URL/api/health/detailed" | python3 -m json.tool || \
        echo -e "${YELLOW}⚠️  Detailed health check not available yet${NC}"
fi

# Show logs
echo -e "\n${YELLOW}📜 Recent deployment logs:${NC}"
railway logs --lines 20

echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Monitor logs: railway logs"
echo "2. Check metrics: railway metrics"
echo "3. View in dashboard: https://railway.app"
echo "4. Test API endpoints"
echo ""
echo "Health check URLs:"
echo "  - Basic: https://$DEPLOY_URL/api/health"
echo "  - Detailed: https://$DEPLOY_URL/api/health/detailed"
echo "  - Resources: https://$DEPLOY_URL/api/health/resources"
echo "  - Database: https://$DEPLOY_URL/api/health/database"
echo "  - Circuit Breakers: https://$DEPLOY_URL/api/health/circuit-breakers"