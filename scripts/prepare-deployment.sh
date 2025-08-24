#!/bin/bash

# Sightline.ai - Deployment Preparation Script
# Purpose: Clean up and archive files before Vercel deployment
# Usage: ./scripts/prepare-deployment.sh [--dry-run]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for dry-run mode
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo -e "${BLUE}🔍 Running in DRY-RUN mode - no files will be modified${NC}"
fi

echo -e "${GREEN}🚀 Sightline.ai Deployment Preparation Script${NC}"
echo "========================================"

# Function to execute or simulate commands
execute() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN] Would execute: $@${NC}"
    else
        "$@"
    fi
}

# Function to remove file with confirmation
remove_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${RED}Removing: $file${NC}"
        execute rm -f "$file"
    fi
}

# Function to archive file
archive_file() {
    local source=$1
    local dest=$2
    if [ -f "$source" ]; then
        echo -e "${YELLOW}Archiving: $source -> $dest${NC}"
        execute mkdir -p "$(dirname "$dest")"
        execute mv "$source" "$dest"
    fi
}

echo -e "\n${BLUE}📁 Step 1: Creating archive directories${NC}"
execute mkdir -p Docs/archive/deployment
execute mkdir -p Docs/archive/implementations
execute mkdir -p Docs/archive/test-reports
execute mkdir -p Docs/archive/scripts

echo -e "\n${BLUE}🗑️  Step 2: Removing legacy documentation files${NC}"
remove_file "DEPLOY_NOW.md"
remove_file "PHASE8_IMPLEMENTATION.md"
remove_file "PRODUCTION_FIX.md"
remove_file "PRODUCTION_FIX_GUIDE.md"
remove_file "RAILWAY_DEPLOYMENT_GUIDE.md"
remove_file "SAFE_MIGRATION_GUIDE.md"
remove_file "TEST_REPORT.md"
remove_file "URGENT_PRODUCTION_FIX.md"
remove_file "REAL_FIX.md"
remove_file "phase8-test-report.html"
remove_file "phase8-test-results.json"
remove_file "test-results-phase8.json"

echo -e "\n${BLUE}🗑️  Step 3: Removing development test files${NC}"
remove_file "test-backend-direct.html"
remove_file "test-integration.js"
remove_file "test-sentry.js"
remove_file "results.xml"

echo -e "\n${BLUE}📦 Step 4: Archiving deployment-specific files${NC}"
archive_file "DEPLOYMENT_FIX_REPORT.md" "Docs/archive/deployment/DEPLOYMENT_FIX_REPORT.md"
archive_file "VERCEL_ENV_UPDATE.md" "Docs/archive/deployment/VERCEL_ENV_UPDATE.md"
archive_file "CLERK_WEBHOOK_SETUP.md" "Docs/archive/deployment/CLERK_WEBHOOK_SETUP.md"
archive_file "RATE_LIMITS.md" "Docs/archive/deployment/RATE_LIMITS.md"

echo -e "\n${BLUE}📦 Step 5: Archiving phase testing scripts${NC}"
archive_file "scripts/test-phase8-prelaunch.js" "Docs/archive/scripts/test-phase8-prelaunch.js"
archive_file "scripts/test-phase8-runner.js" "Docs/archive/scripts/test-phase8-runner.js"
archive_file "scripts/test-phase81-critical-systems.js" "Docs/archive/scripts/test-phase81-critical-systems.js"
archive_file "scripts/test-phase82-usage-limits.js" "Docs/archive/scripts/test-phase82-usage-limits.js"
archive_file "scripts/test-phase83-load-testing.js" "Docs/archive/scripts/test-phase83-load-testing.js"
archive_file "scripts/final-report.js" "Docs/archive/scripts/final-report.js"
archive_file "scripts/final-verification.js" "Docs/archive/scripts/final-verification.js"
archive_file "scripts/diagnose-production.js" "Docs/archive/scripts/diagnose-production.js"

echo -e "\n${BLUE}📝 Step 6: Creating .vercelignore file${NC}"
if [ "$DRY_RUN" = false ]; then
    cat > .vercelignore << 'EOF'
# Development
*.test.ts
*.test.tsx
*.spec.ts
__tests__
e2e/
tests/
scripts/test-*
scripts/*phase*
scripts/prepare-deployment.sh

# Documentation
Docs/archive/
*.md
!README.md
!PROJECT_INDEX_FINAL.md

# Python API (if hosted separately)
api/
venv/
*.py
requirements.txt

# Build artifacts
.next/
out/
dist/
*.log

# Development configs
jest.config.js
playwright.config.ts
.eslintrc*
.prettierrc*

# Deployment scripts
deploy.sh
scripts/deploy-api-to-railway.sh
scripts/deploy-railway-fix.sh
scripts/fix-vercel-database.sh
EOF
    echo -e "${GREEN}✅ Created .vercelignore file${NC}"
else
    echo -e "${YELLOW}[DRY-RUN] Would create .vercelignore file${NC}"
fi

echo -e "\n${BLUE}🔍 Step 7: Verification${NC}"
echo "Checking for remaining test files..."
if [ "$DRY_RUN" = false ]; then
    remaining_test_files=$(find . -name "*phase8*" -o -name "*PRODUCTION_FIX*" -o -name "*URGENT*" 2>/dev/null | grep -v "Docs/archive" | grep -v "node_modules" || true)
    if [ -n "$remaining_test_files" ]; then
        echo -e "${YELLOW}⚠️  Warning: Found remaining test files:${NC}"
        echo "$remaining_test_files"
    else
        echo -e "${GREEN}✅ No remaining test files found${NC}"
    fi
fi

echo -e "\n${GREEN}🎉 Deployment preparation complete!${NC}"
echo "========================================"
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review changes with: git status"
echo "2. Commit changes: git add . && git commit -m 'chore: prepare for Vercel deployment'"
echo "3. Run production build: pnpm build:prod"
echo "4. Deploy to Vercel: pnpm deploy"
echo "5. Verify deployment: pnpm verify:production"

if [ "$DRY_RUN" = true ]; then
    echo -e "\n${YELLOW}This was a DRY-RUN. Run without --dry-run to execute changes.${NC}"
fi