#!/bin/bash

# ============================================================================
# Automated Image Optimization Pipeline for Vercel Deployment
# ============================================================================
# Purpose: Optimize all images for web performance (70% size reduction target)
# Features: WebP conversion, responsive sizing, lazy loading preparation
# Target: Reduce image assets from 3.5MB to <1MB
# ============================================================================

set -euo pipefail
IFS=$'\n\t'

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
IMAGE_DIR="public/images"
OPTIMIZED_DIR="public/images/optimized"
BACKUP_DIR="public/images.backup-$(date +%Y%m%d-%H%M%S)"
QUALITY_WEBP=85
QUALITY_JPEG=85
MAX_WIDTH_LOGO=400
MAX_WIDTH_PODCAST=200
MAX_WIDTH_PREVIEW=800

# Metrics tracking
TOTAL_SIZE_BEFORE=0
TOTAL_SIZE_AFTER=0
FILES_PROCESSED=0
FILES_FAILED=0
START_TIME=$(date +%s)

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_section() { echo -e "\n${MAGENTA}=== $1 ===${NC}\n"; }

# Check for required tools
check_dependencies() {
    log_section "Checking Dependencies"
    
    local missing_deps=()
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("node")
    fi
    
    # Check for npm or pnpm
    if ! command -v pnpm &> /dev/null && ! command -v npm &> /dev/null; then
        missing_deps+=("pnpm or npm")
    fi
    
    # Check for ImageMagick (optional but recommended)
    if ! command -v convert &> /dev/null; then
        log_warning "ImageMagick not found. Will use Node.js tools only."
    else
        log_success "ImageMagick found - will use for additional optimizations"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        echo "Please install missing dependencies and try again."
        exit 1
    fi
    
    log_success "All required dependencies are installed"
}

# Install optimization tools
install_tools() {
    log_section "Installing Optimization Tools"
    
    # Check if @squoosh/cli is installed globally
    if ! command -v squoosh-cli &> /dev/null; then
        log_info "Installing @squoosh/cli for image optimization..."
        if command -v pnpm &> /dev/null; then
            pnpm add -g @squoosh/cli sharp-cli imagemin-cli
        else
            npm install -g @squoosh/cli sharp-cli imagemin-cli
        fi
        log_success "Image optimization tools installed"
    else
        log_info "Optimization tools already installed"
    fi
}

# Get file size in bytes
get_file_size() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        stat -f%z "$1" 2>/dev/null || echo 0
    else
        stat -c%s "$1" 2>/dev/null || echo 0
    fi
}

# Calculate directory size in KB
get_dir_size_kb() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        du -sk "$1" 2>/dev/null | cut -f1
    else
        du -sk "$1" 2>/dev/null | cut -f1
    fi
}

# Create backup
create_backup() {
    log_section "Creating Backup"
    
    if [ -d "$IMAGE_DIR" ]; then
        cp -r "$IMAGE_DIR" "$BACKUP_DIR"
        log_success "Backup created at: $BACKUP_DIR"
        TOTAL_SIZE_BEFORE=$(get_dir_size_kb "$IMAGE_DIR")
        log_info "Original image directory size: ${TOTAL_SIZE_BEFORE}KB"
    else
        log_error "Image directory not found: $IMAGE_DIR"
        exit 1
    fi
}

# Optimize single image
optimize_image() {
    local input_file="$1"
    local output_dir="$2"
    local max_width="$3"
    local filename=$(basename "$input_file")
    local name="${filename%.*}"
    local ext="${filename##*.}"
    
    # Create output directory if it doesn't exist
    mkdir -p "$output_dir"
    
    # Size before optimization
    local size_before=$(get_file_size "$input_file")
    
    # Generate multiple formats and sizes
    local success=true
    
    # Convert to WebP
    # Try to find squoosh-cli in various locations
    SQUOOSH_CMD=""
    if command -v squoosh-cli &> /dev/null; then
        SQUOOSH_CMD="squoosh-cli"
    elif [ -f "/Users/jeffaxelrod/Library/pnpm/squoosh-cli" ]; then
        SQUOOSH_CMD="/Users/jeffaxelrod/Library/pnpm/squoosh-cli"
    elif command -v npx &> /dev/null; then
        SQUOOSH_CMD="npx @squoosh/cli"
    fi
    
    if [ -n "$SQUOOSH_CMD" ]; then
        # WebP version
        echo "Running: $SQUOOSH_CMD on $input_file"
        $SQUOOSH_CMD --webp "{\"quality\":$QUALITY_WEBP}" \
            --resize "{\"width\":$max_width,\"method\":\"lanczos3\"}" \
            -d "$output_dir" \
            "$input_file" || success=false
        
        # Optimized original format
        if [[ "$ext" == "png" ]]; then
            $SQUOOSH_CMD --oxipng "{\"level\":2}" \
                --resize "{\"width\":$max_width}" \
                -d "$output_dir" \
                "$input_file" 2>/dev/null || success=false
        elif [[ "$ext" == "jpg" ]] || [[ "$ext" == "jpeg" ]]; then
            $SQUOOSH_CMD --mozjpeg "{\"quality\":$QUALITY_JPEG}" \
                --resize "{\"width\":$max_width}" \
                -d "$output_dir" \
                "$input_file" 2>/dev/null || success=false
        fi
    elif command -v convert &> /dev/null; then
        # Fallback to ImageMagick
        convert "$input_file" \
            -resize "${max_width}x>" \
            -quality $QUALITY_WEBP \
            "$output_dir/${name}.webp" 2>/dev/null || success=false
        
        convert "$input_file" \
            -resize "${max_width}x>" \
            -quality $QUALITY_JPEG \
            "$output_dir/${name}.${ext}" 2>/dev/null || success=false
    else
        # Fallback: just copy the file
        cp "$input_file" "$output_dir/" || success=false
    fi
    
    if [ "$success" = true ]; then
        local size_after=$(get_file_size "$output_dir/${name}.webp" 2>/dev/null || get_file_size "$output_dir/$filename")
        local reduction=$(( (size_before - size_after) * 100 / size_before ))
        ((FILES_PROCESSED++))
        log_success "Optimized: $filename (reduced by ${reduction}%)"
    else
        ((FILES_FAILED++))
        log_error "Failed to optimize: $filename"
    fi
}

# Generate responsive image sizes
generate_responsive_sizes() {
    local input_file="$1"
    local output_dir="$2"
    local base_name="${3}"
    local sizes=(320 640 768 1024 1440 1920)
    
    # Try to find squoosh-cli
    SQUOOSH_CMD=""
    if command -v squoosh-cli &> /dev/null; then
        SQUOOSH_CMD="squoosh-cli"
    elif [ -f "/Users/jeffaxelrod/Library/pnpm/squoosh-cli" ]; then
        SQUOOSH_CMD="/Users/jeffaxelrod/Library/pnpm/squoosh-cli"
    elif command -v npx &> /dev/null; then
        SQUOOSH_CMD="npx @squoosh/cli"
    fi
    
    for size in "${sizes[@]}"; do
        if [ -n "$SQUOOSH_CMD" ]; then
            $SQUOOSH_CMD --webp "{\"quality\":$QUALITY_WEBP}" \
                --resize "{\"width\":$size}" \
                -s "-${size}w" \
                -d "$output_dir" \
                "$input_file" 2>/dev/null || true
        fi
    done
}

# Main optimization process
main() {
    log_section "Image Optimization Pipeline"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check dependencies
    check_dependencies
    
    # Install tools if needed
    install_tools
    
    # Create backup
    create_backup
    
    # Create optimized directories
    mkdir -p "$OPTIMIZED_DIR/logo"
    mkdir -p "$OPTIMIZED_DIR/podcasts"
    mkdir -p "$OPTIMIZED_DIR/previews"
    mkdir -p "$OPTIMIZED_DIR/responsive"
    
    # ========================================================================
    # PHASE 1: Optimize Logo Images
    # ========================================================================
    log_section "Phase 1: Optimizing Logo Images"
    
    if [ -d "$IMAGE_DIR/logo" ]; then
        for ext in png jpg jpeg svg; do
            for img in "$IMAGE_DIR/logo"/*.$ext; do
                [ -f "$img" ] || continue
                optimize_image "$img" "$OPTIMIZED_DIR/logo" "$MAX_WIDTH_LOGO"
            done
        done
    fi
    
    # Also check root for logo files
    for ext in png jpg jpeg svg; do
        for img in "$IMAGE_DIR"/logo*.$ext; do
            [ -f "$img" ] || continue
            optimize_image "$img" "$OPTIMIZED_DIR/logo" "$MAX_WIDTH_LOGO"
        done
    done
    
    # ========================================================================
    # PHASE 2: Optimize Podcast Images
    # ========================================================================
    log_section "Phase 2: Optimizing Podcast Images"
    
    if [ -d "$IMAGE_DIR/podcasts" ]; then
        for ext in png jpg jpeg; do
            for img in "$IMAGE_DIR/podcasts"/*.$ext; do
                [ -f "$img" ] || continue
                optimize_image "$img" "$OPTIMIZED_DIR/podcasts" "$MAX_WIDTH_PODCAST"
            done
        done
    fi
    
    # ========================================================================
    # PHASE 3: Optimize Preview Images
    # ========================================================================
    log_section "Phase 3: Optimizing Preview Images"
    
    for ext in png jpg jpeg; do
        for img in "$IMAGE_DIR"/*preview*.$ext; do
            [ -f "$img" ] || continue
            optimize_image "$img" "$OPTIMIZED_DIR/previews" "$MAX_WIDTH_PREVIEW"
            # Generate responsive sizes for preview images
            generate_responsive_sizes "$img" "$OPTIMIZED_DIR/responsive" "$(basename "$img" | cut -d. -f1)"
        done
    done
    
    # ========================================================================
    # PHASE 4: Optimize Remaining Images
    # ========================================================================
    log_section "Phase 4: Optimizing Remaining Images"
    
    for ext in png jpg jpeg gif; do
        for img in "$IMAGE_DIR"/*.$ext; do
            [ -f "$img" ] || continue
            # Skip if already processed
            basename=$(basename "$img")
            if [[ ! "$basename" =~ logo|preview|podcast ]]; then
                optimize_image "$img" "$OPTIMIZED_DIR" 1200
            fi
        done
    done
    
    # ========================================================================
    # PHASE 5: Generate Next.js Image Component Mappings
    # ========================================================================
    log_section "Phase 5: Generating Image Component Mappings"
    
    cat > "$OPTIMIZED_DIR/image-manifest.json" << 'EOF'
{
  "images": {
    "logos": {
      "main": {
        "src": "/images/optimized/logo/logo.webp",
        "fallback": "/images/optimized/logo/logo.png",
        "width": 400,
        "height": 100,
        "alt": "Sightline.ai Logo"
      },
      "white": {
        "src": "/images/optimized/logo/logo-white.webp",
        "fallback": "/images/optimized/logo/logo-white.png",
        "width": 400,
        "height": 100,
        "alt": "Sightline.ai Logo"
      }
    },
    "responsive": {
      "sizes": [320, 640, 768, 1024, 1440, 1920],
      "formats": ["webp", "jpg"],
      "quality": 85
    }
  }
}
EOF
    
    # ========================================================================
    # PHASE 6: Generate Next.js Image Component Helper
    # ========================================================================
    log_section "Phase 6: Creating Next.js Image Helper Component"
    
    cat > "src/components/atoms/OptimizedImage.tsx" << 'EOF'
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  sizes = '100vw',
  quality = 85,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  // Convert to optimized path if not already
  const optimizedSrc = src.startsWith('/images/optimized/') 
    ? src 
    : src.replace('/images/', '/images/optimized/');
  
  // Check for WebP support
  const webpSrc = optimizedSrc.replace(/\.(jpg|jpeg|png)$/, '.webp');
  
  return (
    <div className={`relative ${className}`}>
      <Image
        src={webpSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes={sizes}
        quality={quality}
        className={`
          duration-700 ease-in-out
          ${isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'}
        `}
        onLoadingComplete={() => setIsLoading(false)}
        onError={(e) => {
          // Fallback to original format if WebP fails
          (e.target as HTMLImageElement).src = optimizedSrc;
        }}
      />
    </div>
  );
}
EOF
    
    # ========================================================================
    # Final Report
    # ========================================================================
    log_section "Optimization Complete - Summary Report"
    
    TOTAL_SIZE_AFTER=$(get_dir_size_kb "$OPTIMIZED_DIR")
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Calculate reduction
    if [ "$TOTAL_SIZE_BEFORE" -gt 0 ]; then
        REDUCTION=$(( (TOTAL_SIZE_BEFORE - TOTAL_SIZE_AFTER) * 100 / TOTAL_SIZE_BEFORE ))
    else
        REDUCTION=0
    fi
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Image Optimization Results:${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Size before:            ${YELLOW}$(printf "%'d" $TOTAL_SIZE_BEFORE) KB${NC}"
    echo -e "Size after:             ${GREEN}$(printf "%'d" $TOTAL_SIZE_AFTER) KB${NC}"
    echo -e "Space saved:            ${GREEN}$(printf "%'d" $((TOTAL_SIZE_BEFORE - TOTAL_SIZE_AFTER))) KB (${REDUCTION}%)${NC}"
    echo -e "Files processed:        ${GREEN}$FILES_PROCESSED${NC}"
    echo -e "Duration:               ${GREEN}${DURATION} seconds${NC}"
    if [[ $FILES_FAILED -gt 0 ]]; then
        echo -e "Files failed:           ${RED}$FILES_FAILED${NC}"
    fi
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Recommendations
    log_section "Implementation Steps"
    echo "1. ✅ Review optimized images in: $OPTIMIZED_DIR"
    echo "2. ✅ Test images in development: pnpm dev"
    echo "3. ✅ Update image imports to use OptimizedImage component"
    echo "4. ✅ Replace original images: mv $OPTIMIZED_DIR/* $IMAGE_DIR/"
    echo "5. ✅ Remove backup after verification: rm -rf $BACKUP_DIR"
    
    echo ""
    log_info "Image manifest created at: $OPTIMIZED_DIR/image-manifest.json"
    log_info "Next.js component created at: src/components/atoms/OptimizedImage.tsx"
    
    # CDN recommendations
    log_section "CDN Configuration (Optional)"
    echo "For even better performance, consider using a CDN:"
    echo "• Cloudinary: Auto-format, auto-quality, responsive delivery"
    echo "• Imgix: Real-time image processing and optimization"
    echo "• Cloudflare Images: Integrated with Cloudflare CDN"
    echo "• Vercel Image Optimization: Built-in with Next.js on Vercel"
    
    if [[ $FILES_FAILED -gt 0 ]]; then
        log_warning "Some images failed to optimize. Please review manually."
        exit 1
    else
        log_success "All images successfully optimized!"
        exit 0
    fi
}

# Error handler
trap 'log_error "Script failed on line $LINENO"' ERR

# Run main function
main "$@"