#!/bin/bash

# Railway API Deployment Script
# This script automates the deployment of the Python API to Railway

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# Header
echo -e "${BLUE}🚀 Railway API Deployment Script${NC}"
echo "================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    log_error "Railway CLI is not installed!"
    echo ""
    echo "Install Railway CLI first:"
    echo "  macOS:    brew install railway"
    echo "  npm:      npm install -g @railway/cli"
    echo "  Linux:    curl -fsSL https://railway.app/install.sh | sh"
    exit 1
fi

log_success "Railway CLI found"

# Navigate to API directory
cd api/
log_info "Changed to api/ directory"

# Check for required files
log_info "Checking required files..."

if [ ! -f "requirements.txt" ]; then
    log_error "requirements.txt not found!"
    exit 1
fi

if [ ! -f "Procfile" ]; then
    log_error "Procfile not found!"
    exit 1
fi

if [ ! -f "index.py" ]; then
    log_error "index.py not found!"
    exit 1
fi

log_success "All required files present"

# Login to Railway
log_info "Logging into Railway..."
railway login

# Check if already linked to a project
if railway status &> /dev/null; then
    log_warn "Already linked to a Railway project"
    echo ""
    read -p "Do you want to use the existing project? (y/n): " use_existing
    
    if [ "$use_existing" != "y" ]; then
        log_info "Unlinking from existing project..."
        railway unlink
        
        log_info "Creating new Railway project..."
        railway init
    fi
else
    log_info "Creating new Railway project..."
    railway init
fi

# Deploy to Railway
log_info "Starting deployment to Railway..."
echo ""
log_warn "This may take 3-5 minutes..."
echo ""

railway up

log_success "Deployment initiated!"
echo ""

# Get the deployment URL
log_info "Getting deployment URL..."
RAILWAY_URL=$(railway domain 2>/dev/null || echo "")

if [ -z "$RAILWAY_URL" ]; then
    log_warn "Could not get deployment URL automatically"
    log_info "Opening Railway dashboard to get URL..."
    railway open
    echo ""
    echo "Please copy your Railway URL from the dashboard"
    read -p "Enter your Railway URL (e.g., https://your-app.railway.app): " RAILWAY_URL
fi

echo ""
log_success "Railway URL: $RAILWAY_URL"
echo ""

# Set environment variables reminder
log_warn "IMPORTANT: Set environment variables in Railway dashboard!"
echo ""
echo "Required variables:"
echo "  - OPENAI_API_KEY"
echo "  - YOUTUBE_API_KEY"
echo ""
echo "Optional but recommended:"
echo "  - GUMLOOP_API_KEY"
echo "  - OXYLABS_USERNAME"
echo "  - OXYLABS_PASSWORD"
echo "  - UPSTASH_REDIS_URL"
echo "  - SENTRY_DSN"
echo ""

read -p "Have you set the environment variables? (y/n): " env_set

if [ "$env_set" != "y" ]; then
    log_info "Opening Railway dashboard to set environment variables..."
    railway open
    echo ""
    echo "Please set the required environment variables and press Enter to continue..."
    read -p ""
fi

# Test the deployment
log_info "Testing deployment..."
echo ""

# Test health endpoint
if curl -s "${RAILWAY_URL}/api/health" | grep -q "healthy"; then
    log_success "API is healthy and responding!"
else
    log_error "API health check failed. Please check the logs:"
    railway logs
    exit 1
fi

# Update Vercel environment variables
echo ""
log_info "Now we need to update Vercel with the Railway URL"
echo ""

cd ..  # Back to project root

# Check if Vercel CLI is installed
if command -v vercel &> /dev/null; then
    log_info "Updating Vercel environment variables..."
    
    echo "Adding BACKEND_URL=${RAILWAY_URL}"
    vercel env add BACKEND_URL production <<< "$RAILWAY_URL"
    
    echo "Adding NEXT_PUBLIC_BACKEND_URL=${RAILWAY_URL}"
    vercel env add NEXT_PUBLIC_BACKEND_URL production <<< "$RAILWAY_URL"
    
    log_success "Vercel environment variables updated!"
    
    echo ""
    read -p "Do you want to redeploy Vercel now? (y/n): " redeploy
    
    if [ "$redeploy" = "y" ]; then
        log_info "Redeploying to Vercel..."
        vercel --prod --force
    fi
else
    log_warn "Vercel CLI not found. Please update environment variables manually:"
    echo ""
    echo "1. Go to your Vercel dashboard"
    echo "2. Navigate to Settings > Environment Variables"
    echo "3. Add/Update these variables for Production:"
    echo "   BACKEND_URL = ${RAILWAY_URL}"
    echo "   NEXT_PUBLIC_BACKEND_URL = ${RAILWAY_URL}"
    echo "4. Redeploy your Vercel project"
fi

# Final verification
echo ""
log_info "Running deployment verification..."
node scripts/verify-deployment.js "$RAILWAY_URL"

echo ""
echo "================================="
log_success "Deployment complete!"
echo ""
echo "Your API is now live at: ${RAILWAY_URL}"
echo ""
echo "Next steps:"
echo "1. Monitor Railway logs: railway logs"
echo "2. Check Railway metrics: railway open"
echo "3. Test your production site"
echo ""
echo "Useful commands:"
echo "  View logs:        railway logs"
echo "  Open dashboard:   railway open"
echo "  Deploy updates:   railway up"
echo "  Rollback:        railway rollback"
echo ""