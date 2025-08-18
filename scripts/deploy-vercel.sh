#!/bin/bash

# Vercel Deployment Script
# This script handles the complete deployment process for Sightline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Parse command line arguments
ENVIRONMENT="preview"
SKIP_TESTS=false
SKIP_BUILD=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --prod|--production) ENVIRONMENT="production"; shift ;;
        --skip-tests) SKIP_TESTS=true; shift ;;
        --skip-build) SKIP_BUILD=true; shift ;;
        --help) 
            echo "Usage: ./scripts/deploy-vercel.sh [options]"
            echo "Options:"
            echo "  --prod, --production    Deploy to production environment"
            echo "  --skip-tests           Skip running tests"
            echo "  --skip-build           Skip building the application"
            echo "  --help                 Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
done

echo "=================================="
echo "   Sightline Deployment Script    "
echo "=================================="
echo ""
print_status "Environment: $ENVIRONMENT"
echo ""

# Step 1: Environment validation
print_status "Validating environment variables..."
if [ "$ENVIRONMENT" = "production" ]; then
    node scripts/validate-production-env.js || {
        print_error "Production environment validation failed"
        exit 1
    }
else
    pnpm env:check || {
        print_error "Environment validation failed"
        exit 1
    }
fi

# Step 2: Code quality checks
if [ "$SKIP_TESTS" = false ]; then
    print_status "Running code quality checks..."
    
    print_status "Running linter..."
    pnpm lint || {
        print_error "Linting failed"
        exit 1
    }
    
    print_status "Running type checks..."
    pnpm typecheck || {
        print_error "Type checking failed"
        exit 1
    }
    
    print_status "Checking code formatting..."
    pnpm format:check || {
        print_error "Code formatting check failed"
        print_warning "Run 'pnpm format' to fix formatting issues"
        exit 1
    }
fi

# Step 3: Build the application
if [ "$SKIP_BUILD" = false ]; then
    print_status "Building the application..."
    if [ "$ENVIRONMENT" = "production" ]; then
        pnpm build:prod || {
            print_error "Production build failed"
            exit 1
        }
    else
        pnpm build || {
            print_error "Build failed"
            exit 1
        }
    fi
fi

# Step 4: Database migrations (if needed)
print_status "Checking for pending database migrations..."
pnpm db:generate || {
    print_error "Database client generation failed"
    exit 1
}

# Step 5: Deploy to Vercel
print_status "Deploying to Vercel ($ENVIRONMENT)..."
if [ "$ENVIRONMENT" = "production" ]; then
    print_warning "Deploying to PRODUCTION environment"
    echo "Are you sure you want to deploy to production? (yes/no)"
    read -r confirmation
    if [ "$confirmation" != "yes" ]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    vercel --prod || {
        print_error "Production deployment failed"
        exit 1
    }
else
    vercel || {
        print_error "Preview deployment failed"
        exit 1
    }
fi

# Step 6: Post-deployment validation
print_status "Validating deployment..."
if [ "$ENVIRONMENT" = "production" ]; then
    DEPLOY_URL="https://sightline.ai"
else
    # Get the preview URL from Vercel
    DEPLOY_URL=$(vercel ls --token $VERCEL_TOKEN 2>/dev/null | grep "Preview" | head -1 | awk '{print $2}')
fi

if [ -n "$DEPLOY_URL" ]; then
    print_status "Checking deployment health at $DEPLOY_URL..."
    sleep 10
    curl -f "$DEPLOY_URL/api/health" > /dev/null 2>&1 || {
        print_warning "Health check failed, but deployment may still be initializing"
    }
fi

# Step 7: Clean up
print_status "Cleaning up..."
rm -rf .next/cache

echo ""
echo "=================================="
echo "   Deployment Complete!           "
echo "=================================="
if [ "$ENVIRONMENT" = "production" ]; then
    print_status "Production deployment successful!"
    print_status "URL: https://sightline.ai"
else
    print_status "Preview deployment successful!"
    if [ -n "$DEPLOY_URL" ]; then
        print_status "URL: $DEPLOY_URL"
    fi
fi

echo ""
print_status "Next steps:"
echo "  1. Verify the deployment at the URL above"
echo "  2. Run smoke tests"
echo "  3. Monitor error tracking in Sentry"
echo "  4. Check performance metrics in Vercel Analytics"

exit 0