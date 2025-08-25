#!/bin/bash

# Sightline.ai - Final Cleanup Script for Vercel Deployment
# Purpose: Remove remaining unnecessary files and optimize for production
# Usage: ./scripts/final-cleanup.sh [--dry-run]

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

echo -e "${GREEN}🚀 Sightline.ai Final Cleanup Script${NC}"
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

# Function to remove directory
remove_dir() {
    local dir=$1
    if [ -d "$dir" ]; then
        echo -e "${RED}Removing directory: $dir${NC}"
        execute rm -rf "$dir"
    fi
}

echo -e "\n${BLUE}🗑️  Step 1: Removing build artifacts${NC}"
remove_file "tsconfig.tsbuildinfo"
remove_file "api/api.log"
remove_file "src/middleware.ts.bak"

echo -e "\n${BLUE}🗑️  Step 2: Removing alternative deployment configs${NC}"
remove_file "deploy.sh"
remove_file "railway.json"
remove_file "render.yaml"

echo -e "\n${BLUE}🗑️  Step 3: Removing disabled/unused files${NC}"
remove_file "requirements.txt.disabled"
remove_file "requirements.txt.vercel-disabled"

echo -e "\n${BLUE}🗑️  Step 4: Removing debug/test routes (optional)${NC}"
echo -e "${YELLOW}⚠️  Warning: This will remove debug and test pages${NC}"
if [ "$DRY_RUN" = false ]; then
    read -p "Remove debug/test routes? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        remove_dir "src/app/debug"
        remove_dir "src/app/test"
        remove_file "src/app/api/dev/synthetic-summary/route.ts"
    else
        echo -e "${BLUE}Skipping debug/test route removal${NC}"
    fi
else
    echo -e "${YELLOW}[DRY-RUN] Would prompt to remove debug/test routes${NC}"
fi

echo -e "\n${BLUE}🔍 Step 5: Finding and removing backup files${NC}"
if [ "$DRY_RUN" = false ]; then
    find . -name "*.bak" -type f -exec rm -f {} \; 2>/dev/null || true
    echo -e "${GREEN}✅ Removed all .bak files${NC}"
else
    echo -e "${YELLOW}[DRY-RUN] Would remove all .bak files${NC}"
fi

echo -e "\n${BLUE}📝 Step 6: Updating .gitignore${NC}"
if [ "$DRY_RUN" = false ]; then
    # Check if entries already exist before adding
    if ! grep -q "tsconfig.tsbuildinfo" .gitignore 2>/dev/null; then
        echo "tsconfig.tsbuildinfo" >> .gitignore
        echo -e "${GREEN}✅ Added tsconfig.tsbuildinfo to .gitignore${NC}"
    fi
    if ! grep -q "\*.log" .gitignore 2>/dev/null; then
        echo "*.log" >> .gitignore
        echo -e "${GREEN}✅ Added *.log to .gitignore${NC}"
    fi
    if ! grep -q "\*.bak" .gitignore 2>/dev/null; then
        echo "*.bak" >> .gitignore
        echo -e "${GREEN}✅ Added *.bak to .gitignore${NC}"
    fi
else
    echo -e "${YELLOW}[DRY-RUN] Would update .gitignore${NC}"
fi

echo -e "\n${BLUE}📊 Step 7: Calculating space saved${NC}"
if [ "$DRY_RUN" = false ]; then
    # Calculate approximate space saved
    SPACE_SAVED=0
    
    # Add up known file sizes
    [ ! -f "tsconfig.tsbuildinfo" ] && SPACE_SAVED=$((SPACE_SAVED + 2600))
    [ ! -f "api/api.log" ] && SPACE_SAVED=$((SPACE_SAVED + 180))
    [ ! -f "deploy.sh" ] && SPACE_SAVED=$((SPACE_SAVED + 1))
    [ ! -f "railway.json" ] && SPACE_SAVED=$((SPACE_SAVED + 1))
    [ ! -f "render.yaml" ] && SPACE_SAVED=$((SPACE_SAVED + 2))
    
    echo -e "${GREEN}✅ Approximately ${SPACE_SAVED}KB saved${NC}"
else
    echo -e "${YELLOW}[DRY-RUN] Would calculate space saved${NC}"
fi

echo -e "\n${BLUE}🔍 Step 8: Final verification${NC}"
echo "Checking for remaining issues..."

# Check for large files
LARGE_FILES=$(find . -type f -size +1M ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/.next/*" ! -path "*/venv/*" -exec ls -lh {} \; 2>/dev/null | head -5)
if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠️  Large files found (>1MB):${NC}"
    echo "$LARGE_FILES"
    echo -e "${BLUE}Consider optimizing these files${NC}"
fi

# Check for remaining test/debug files
DEBUG_FILES=$(find ./src -name "*debug*" -o -name "*test*" -o -name "*synthetic*" 2>/dev/null | grep -v "__tests__" | grep -v "*.test.ts" || true)
if [ -n "$DEBUG_FILES" ]; then
    echo -e "${YELLOW}⚠️  Remaining debug/test files:${NC}"
    echo "$DEBUG_FILES"
fi

echo -e "\n${GREEN}🎉 Final cleanup complete!${NC}"
echo "========================================"
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review changes: git status"
echo "2. Optimize images: Run image optimization script"
echo "3. Build production: pnpm build:prod"
echo "4. Test locally: pnpm start"
echo "5. Deploy: pnpm deploy"

if [ "$DRY_RUN" = true ]; then
    echo -e "\n${YELLOW}This was a DRY-RUN. Run without --dry-run to execute changes.${NC}"
fi

echo -e "\n${BLUE}📌 Remember to:${NC}"
echo "• Set all environment variables in Vercel dashboard"
echo "• Configure Python API on Railway separately"
echo "• Enable Sentry and PostHog monitoring"
echo "• Test all critical user paths after deployment"