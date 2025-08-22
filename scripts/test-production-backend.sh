#!/bin/bash

echo "🔍 Testing Production Backend Connection"
echo "========================================="

# Test the backend health endpoint directly
echo -e "\n1. Testing Railway Backend Health:"
curl -s https://sightline-api-production.up.railway.app/api/health | jq . || echo "❌ Failed to connect"

# Test the backend root
echo -e "\n2. Testing Railway Backend Root:"
curl -s https://sightline-api-production.up.railway.app/api | jq . || echo "❌ Failed to connect"

# Test the frontend's test endpoint
echo -e "\n3. Testing Frontend's Backend Test Endpoint:"
curl -s https://sightlineai.io/api/test-backend | jq . || echo "❌ Failed to connect"

# Test if the summarize endpoint exists
echo -e "\n4. Testing Summarize Endpoint (OPTIONS):"
curl -X OPTIONS -s -I https://sightline-api-production.up.railway.app/api/summarize | head -5

# Test POST to summarize with a real request
echo -e "\n5. Testing Summarize Endpoint (POST):"
curl -X POST -s https://sightline-api-production.up.railway.app/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
  | jq . || echo "❌ Failed to summarize"

echo -e "\n========================================="
echo "✅ Tests Complete"