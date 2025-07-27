#!/bin/bash

# Start Next.js development server
echo "Starting Next.js development server..."
pnpm dev &

# Start FastAPI development server
echo "Starting FastAPI development server..."
cd api && python -m uvicorn main:app --reload --port 8000 &

# Wait for both processes
wait