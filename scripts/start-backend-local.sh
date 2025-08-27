#!/bin/bash

# Start the backend API locally for development and testing
# This script uses the optimized configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Sightline Backend (Optimized)${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "api/index.py" ]; then
    echo -e "${RED}❌ Error: Must run from project root directory${NC}"
    echo "Please run from: /Users/jeffaxelrod/Documents/Sightline"
    exit 1
fi

# Check for .env file
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  Warning: No .env or .env.local file found${NC}"
    echo "Copy api/.env.example to .env and configure your environment variables"
    echo ""
fi

# Export environment variables for local development
export ENVIRONMENT=development
export LOG_LEVEL=INFO
export PORT=8000

# Optional: Set test environment variables
export PROGRESS_TTL_HOURS=4
export DB_POOL_MIN_SIZE=5
export DB_POOL_MAX_SIZE=20
export DB_COMMAND_TIMEOUT=30

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  • Environment: development"
echo "  • Port: 8000"
echo "  • Workers: 1 (development mode)"
echo "  • Log Level: INFO"
echo "  • Auto-reload: Enabled"
echo ""

echo -e "${YELLOW}🔧 Starting API server...${NC}"
echo ""

# Start the API with optimized settings
cd api && uvicorn index:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --log-level info \
    --access-log \
    --reload-dir . \
    --reload-include "*.py"