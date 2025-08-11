#!/bin/bash

# Reference Repository Cloning Script
# Creates a shallow clone of the reference implementation for comparison

set -e  # Exit on any error

echo "🔄 Cloning reference implementation..."

# Create .tmp directory if it doesn't exist
if [ ! -d ".tmp" ]; then
    mkdir -p .tmp
    echo "📁 Created .tmp directory"
fi

# Create reference directory
if [ ! -d ".tmp/reference" ]; then
    mkdir -p .tmp/reference
    echo "📁 Created .tmp/reference directory"
fi

# Remove existing clone if it exists
if [ -d ".tmp/reference/sightline" ]; then
    echo "🗑️  Removing existing reference clone..."
    rm -rf .tmp/reference/sightline
fi

# Clone the reference repository (shallow clone)
echo "📦 Cloning reference repository..."
git clone --depth=1 https://github.com/jma0014SCG/sightline.git .tmp/reference/sightline

# Change to the cloned directory and get commit info
cd .tmp/reference/sightline

# Get commit hash and info
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_DATE=$(git log -1 --format="%cd" --date=short)
COMMIT_MESSAGE=$(git log -1 --format="%s")

echo ""
echo "✅ Reference repository cloned successfully!"
echo "📊 Repository Information:"
echo "   Commit Hash: $COMMIT_HASH"
echo "   Date: $COMMIT_DATE"
echo "   Message: $COMMIT_MESSAGE"
echo ""
echo "📍 Location: .tmp/reference/sightline"
echo "📏 Repository size:"
du -sh . 2>/dev/null || echo "   Size calculation unavailable"

# Return to project root
cd ../../..

echo ""
echo "🎉 Reference cloning completed!"
echo ""
echo "💡 Usage:"
echo "   - Compare files: diff src/components/... .tmp/reference/sightline/src/components/..."
echo "   - Browse reference: cd .tmp/reference/sightline"
echo "   - Clean up: rm -rf .tmp/reference"
echo "   - Re-run: bash scripts/clone_reference.sh"