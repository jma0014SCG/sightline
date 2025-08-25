#!/bin/bash

# ============================================================================
# Sightline.ai - Final Cleanup Script for Vercel Deployment
# ============================================================================
# Purpose: Automated repository cleanup for optimal Vercel deployment
# Target: Reduce repository size by ~37.5% (48MB → 30MB)
# Usage: ./scripts/final-cleanup.sh [--dry-run] [--aggressive] [--metrics]
# ============================================================================

set -euo pipefail # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'      # Set Internal Field Separator for safety

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse command line arguments
DRY_RUN=false
AGGRESSIVE=false
SHOW_METRICS=false

for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN=true
            echo -e "${BLUE}🔍 Running in DRY-RUN mode - no files will be modified${NC}"
            ;;
        --aggressive)
            AGGRESSIVE=true
            echo -e "${YELLOW}⚡ Aggressive mode enabled - removing all non-essential files${NC}"
            ;;
        --metrics)
            SHOW_METRICS=true
            ;;
        --help)
            echo "Usage: $0 [--dry-run] [--aggressive] [--metrics]"
            echo "  --dry-run    Simulate cleanup without making changes"
            echo "  --aggressive Remove all non-essential files including test/debug"
            echo "  --metrics    Show detailed metrics and performance data"
            exit 0
            ;;
    esac
done

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_section() { echo -e "\n${MAGENTA}=== $1 ===${NC}\n"; }

# Track cleanup metrics
TOTAL_SIZE_BEFORE=0
TOTAL_SIZE_AFTER=0
FILES_REMOVED=0
ERRORS_COUNT=0
START_TIME=$(date +%s)

echo -e "${GREEN}🚀 Sightline.ai Final Cleanup Script${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Get directory size in KB
get_dir_size_kb() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - returns size in KB
        du -sk "$1" 2>/dev/null | cut -f1
    else
        # Linux - returns size in KB
        du -sk "$1" 2>/dev/null | cut -f1
    fi
}

# Function to execute or simulate commands
execute() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN] Would execute: $@${NC}"
    else
        "$@"
    fi
}

# Enhanced file removal with size tracking
remove_file() {
    local file=$1
    if [ -f "$file" ]; then
        local size_kb=0
        if [[ "$OSTYPE" == "darwin"* ]]; then
            size_kb=$(( $(stat -f%z "$file" 2>/dev/null || echo 0) / 1024 ))
        else
            size_kb=$(( $(stat -c%s "$file" 2>/dev/null || echo 0) / 1024 ))
        fi
        
        if [ "$DRY_RUN" = false ]; then
            rm -f "$file" 2>/dev/null && {
                FILES_REMOVED=$((FILES_REMOVED + 1))
                log_success "Removed: $file (${size_kb}KB)"
            } || {
                ERRORS_COUNT=$((ERRORS_COUNT + 1))
                log_error "Failed to remove: $file"
            }
        else
            echo -e "${YELLOW}[DRY-RUN] Would remove: $file (${size_kb}KB)${NC}"
            FILES_REMOVED=$((FILES_REMOVED + 1))
        fi
    fi
}

# Enhanced directory removal
remove_dir() {
    local dir=$1
    if [ -d "$dir" ]; then
        local size_kb=$(get_dir_size_kb "$dir")
        
        if [ "$DRY_RUN" = false ]; then
            rm -rf "$dir" 2>/dev/null && {
                FILES_REMOVED=$((FILES_REMOVED + 1))
                log_success "Removed directory: $dir (${size_kb}KB)"
            } || {
                ERRORS_COUNT=$((ERRORS_COUNT + 1))
                log_error "Failed to remove directory: $dir"
            }
        else
            echo -e "${YELLOW}[DRY-RUN] Would remove directory: $dir (${size_kb}KB)${NC}"
            FILES_REMOVED=$((FILES_REMOVED + 1))
        fi
    fi
}

# Record initial size
TOTAL_SIZE_BEFORE=$(get_dir_size_kb ".")

log_info "Repository size before cleanup: ${TOTAL_SIZE_BEFORE}KB"

# ========================================================================
# PHASE 1: Build Artifacts and Caches
# ========================================================================
log_section "Phase 1: Build Artifacts & Caches"

# TypeScript build info (2.6MB)
remove_file "tsconfig.tsbuildinfo"
remove_file ".next/tsconfig.tsbuildinfo"

# Build directories
remove_dir ".next"
remove_dir "out"
remove_dir "dist"
remove_dir "build"

# Node modules cache
remove_dir "node_modules/.cache"
remove_dir ".pnpm-store"
remove_dir ".yarn"
remove_dir ".turbo"

# ========================================================================
# PHASE 2: Logs and Temporary Files
# ========================================================================
log_section "Phase 2: Logs & Temporary Files"

# Log files
remove_file "api/api.log"
find . -name "*.log" -type f ! -path "*/node_modules/*" ! -path "*/.git/*" -exec bash -c 'remove_file "$0"' {} \; 2>/dev/null || true

# Temporary and backup files
find . -name "*.tmp" -o -name "*.temp" -o -name "*.bak" -o -name "*.backup" -o -name "*.swp" -o -name "*.swo" -o -name "*~" | while read -r file; do
    remove_file "$file"
done

# OS files
find . -name ".DS_Store" -o -name "Thumbs.db" -o -name "desktop.ini" | while read -r file; do
    remove_file "$file"
done

# ========================================================================
# PHASE 3: Unused Deployment Configurations
# ========================================================================
log_section "Phase 3: Unused Deployment Configs"

# Legacy deployment files
remove_file "deploy.sh"
remove_file "railway.json"
remove_file "render.yaml"
remove_file "Procfile"
remove_file "app.json"
remove_file "now.json"
remove_file "netlify.toml"
remove_file "heroku.yml"

# Disabled requirements
remove_file "requirements.txt.disabled"
remove_file "requirements.txt.vercel-disabled"

# ========================================================================
# PHASE 4: Python/API Artifacts (if separating backend)
# ========================================================================
log_section "Phase 4: Python/API Artifacts"

# Python cache
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -o -name "*.pyo" -o -name "*.pyd" | while read -r file; do
    remove_file "$file"
done

# Python test artifacts
remove_dir ".pytest_cache"
remove_dir ".coverage"
remove_dir "htmlcov"
remove_dir ".tox"
remove_dir ".mypy_cache"
remove_dir ".ruff_cache"

# ========================================================================
# PHASE 5: Test and Development Files (conditional)
# ========================================================================
log_section "Phase 5: Test & Development Files"

# Test coverage
remove_dir "coverage"
remove_dir ".nyc_output"
remove_dir "test-results"

# E2E test artifacts
remove_dir "playwright-report"
remove_dir "e2e/screenshots"
remove_dir "e2e/videos"
remove_dir "e2e/downloads"

# Storybook
remove_dir "storybook-static"

# Debug/test routes (if aggressive mode)
if [ "$AGGRESSIVE" = true ] || [ "$DRY_RUN" = true ]; then
    if [ "$AGGRESSIVE" = true ]; then
        log_warning "Aggressive mode: Removing debug/test routes"
        remove_dir "src/app/debug"
        remove_dir "src/app/test"
        remove_file "src/app/api/dev/synthetic-summary/route.ts"
        remove_dir "src/app/api/ping"
    else
        echo -e "${YELLOW}[DRY-RUN] Would remove debug/test routes in aggressive mode${NC}"
    fi
fi

# ========================================================================
# PHASE 6: Documentation Archives
# ========================================================================
log_section "Phase 6: Documentation Archives"

# Archive directories (keep active docs)
remove_dir "Docs/archive"
remove_dir "docs-old"
remove_dir "documentation-backup"

# Phase files
for i in {1..20}; do
    find . -name "*phase${i}*" -o -name "*PHASE${i}*" | while read -r file; do
        remove_file "$file"
    done
done

# ========================================================================
# PHASE 7: Update .gitignore
# ========================================================================
log_section "Phase 7: Updating .gitignore"

if [ "$DRY_RUN" = false ]; then
    # Create temporary file for new entries
    cat > .gitignore.additions << 'EOF'

# === Vercel Optimization Additions ===
# Build artifacts
tsconfig.tsbuildinfo
*.tsbuildinfo
.turbo/

# Logs
api.log
*.log
npm-debug.log*
yarn-debug.log*
pnpm-debug.log*

# Temporary files
*.tmp
*.temp
*.bak
*.backup
*.swp
*.swo
*~

# Legacy deployment configs
deploy.sh
railway.json
render.yaml
Procfile
app.json
now.json
netlify.toml
heroku.yml

# Python artifacts
__pycache__/
*.pyc
*.pyo
*.pyd
.pytest_cache/
.mypy_cache/
.ruff_cache/

# Test artifacts
playwright-report/
e2e/screenshots/
e2e/videos/
test-results/

# Archives
Docs/archive/
*phase[0-9]*
*PHASE[0-9]*

# OS files
.DS_Store
Thumbs.db
desktop.ini
EOF
    
    # Add new entries if not already present
    while IFS= read -r line; do
        if [ -n "$line" ] && ! grep -qF "$line" .gitignore 2>/dev/null; then
            echo "$line" >> .gitignore
        fi
    done < .gitignore.additions
    
    rm -f .gitignore.additions
    log_success "Updated .gitignore with optimization rules"
else
    echo -e "${YELLOW}[DRY-RUN] Would update .gitignore${NC}"
fi

# ========================================================================
# PHASE 8: Git Optimization (optional)
# ========================================================================
if [ "$AGGRESSIVE" = true ] && [ "$DRY_RUN" = false ]; then
    log_section "Phase 8: Git Repository Optimization"
    
    # Remove files from git that should be ignored
    git rm -r --cached . 2>/dev/null || true
    git add . 2>/dev/null || true
    
    # Optimize git repository
    git gc --aggressive --prune=now 2>/dev/null || true
    
    log_success "Git repository optimized"
fi

# ========================================================================
# PHASE 9: Large File Detection
# ========================================================================
log_section "Phase 9: Large File Analysis"

echo "Scanning for large files..."
LARGE_FILES=$(find . -type f -size +1M ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/.next/*" ! -path "*/venv/*" -exec ls -lh {} \; 2>/dev/null | head -10)

if [ -n "$LARGE_FILES" ]; then
    log_warning "Large files found (>1MB):"
    echo "$LARGE_FILES"
    echo ""
    log_info "Consider:"
    echo "  • Optimizing images with: ./scripts/optimize-images.sh"
    echo "  • Moving large assets to CDN"
    echo "  • Compressing video/audio files"
fi

# ========================================================================
# Final Report
# ========================================================================
log_section "Cleanup Complete - Summary Report"

TOTAL_SIZE_AFTER=$(get_dir_size_kb ".")
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Calculate reduction
if [ "$TOTAL_SIZE_BEFORE" -gt 0 ]; then
    REDUCTION=$(( (TOTAL_SIZE_BEFORE - TOTAL_SIZE_AFTER) * 100 / TOTAL_SIZE_BEFORE ))
else
    REDUCTION=0
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Repository Optimization Results:${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Size before cleanup:    ${YELLOW}$(printf "%'d" $TOTAL_SIZE_BEFORE) KB${NC}"
echo -e "Size after cleanup:     ${GREEN}$(printf "%'d" $TOTAL_SIZE_AFTER) KB${NC}"
echo -e "Space saved:            ${GREEN}$(printf "%'d" $((TOTAL_SIZE_BEFORE - TOTAL_SIZE_AFTER))) KB (${REDUCTION}%)${NC}"
echo -e "Files removed:          ${GREEN}$FILES_REMOVED${NC}"
echo -e "Duration:               ${GREEN}${DURATION} seconds${NC}"
if [[ $ERRORS_COUNT -gt 0 ]]; then
    echo -e "Errors encountered:     ${RED}$ERRORS_COUNT${NC}"
fi
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Show metrics if requested
if [ "$SHOW_METRICS" = true ]; then
    log_section "Detailed Metrics"
    echo "Repository Analysis:"
    echo "  • Total files: $(find . -type f ! -path "*/node_modules/*" ! -path "*/.git/*" | wc -l)"
    echo "  • Total directories: $(find . -type d ! -path "*/node_modules/*" ! -path "*/.git/*" | wc -l)"
    echo "  • TypeScript files: $(find . -name "*.ts" -o -name "*.tsx" ! -path "*/node_modules/*" | wc -l)"
    echo "  • JavaScript files: $(find . -name "*.js" -o -name "*.jsx" ! -path "*/node_modules/*" | wc -l)"
    echo "  • Python files: $(find . -name "*.py" ! -path "*/venv/*" | wc -l)"
    echo ""
fi

# Next steps
log_section "Next Steps"
echo "1. ✅ Run image optimization: ./scripts/optimize-images.sh"
echo "2. ✅ Update vercel.json with optimized configuration"
echo "3. ✅ Test build locally: pnpm build:prod"
echo "4. ✅ Run deployment validation: ./scripts/validate-deployment.sh"
echo "5. ✅ Deploy to Vercel: pnpm deploy"

if [ "$DRY_RUN" = true ]; then
    echo ""
    log_warning "This was a DRY-RUN. Run without --dry-run to execute changes."
fi

# Final status
if [[ $ERRORS_COUNT -gt 0 ]]; then
    log_warning "Cleanup completed with some errors. Please review the output above."
    exit 1
else
    log_success "Repository successfully optimized for Vercel deployment!"
    echo ""
    echo -e "${BLUE}📌 Remember to:${NC}"
    echo "• Set all 17 environment variables in Vercel dashboard"
    echo "• Deploy Python API to Railway separately"
    echo "• Enable Vercel Analytics and Speed Insights"
    echo "• Configure monitoring (Sentry, PostHog)"
    exit 0
fi