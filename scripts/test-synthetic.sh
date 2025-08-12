#!/bin/bash

# Test synthetic summary endpoint with correlation tracking
# Usage: ./scripts/test-synthetic.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Synthetic Summary Test =====${NC}"
echo ""

# Generate correlation ID
CID="test-$(date +%s)-$(uuidgen | tr '[:upper:]' '[:lower:]' | cut -c1-8)"

echo -e "${YELLOW}Correlation ID:${NC} $CID"
echo ""

# 1. Trigger synthetic test
echo -e "${GREEN}1. Triggering synthetic test...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:8000/api/dev/synthetic \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: $CID")

echo "Response: $RESPONSE"
echo ""

# Extract task_id from response
TASK_ID=$(echo $RESPONSE | grep -o '"task_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$TASK_ID" ]; then
  echo -e "${RED}Error: No task_id in response${NC}"
  exit 1
fi

echo -e "${YELLOW}Task ID:${NC} $TASK_ID"
echo ""

# 2. Poll progress endpoint
echo -e "${GREEN}2. Polling progress...${NC}"
for i in {1..10}; do
  sleep 1
  PROGRESS=$(curl -s http://localhost:8000/api/progress/$TASK_ID)
  echo "Progress #$i: $PROGRESS"
  
  # Check if completed
  if echo "$PROGRESS" | grep -q '"status":"completed"'; then
    echo -e "${GREEN}✓ Progress completed!${NC}"
    break
  fi
  
  # Check for error
  if echo "$PROGRESS" | grep -q '"status":"error"'; then
    echo -e "${RED}✗ Error detected in progress${NC}"
    exit 1
  fi
done

echo ""
echo -e "${BLUE}===== Test Complete =====${NC}"
echo ""
echo -e "${YELLOW}To view structured logs:${NC}"
echo "  Frontend (tRPC): grep 'tRPC.summary' logs"
echo "  Backend (API): grep 'api.synthetic' logs"
echo "  Database: grep 'prisma.query' logs"
echo ""
echo -e "${YELLOW}To trace by correlation ID:${NC}"
echo "  grep '$CID' logs"