---
title: "Troubleshooting Guide"
description: "Comprehensive troubleshooting steps and solutions for common Sightline.ai platform issues"
type: "guide"
canonical_url: "/docs/operations/troubleshooting"
version: "1.0"
last_updated: "2025-01-09"
audience: ["developers", "system-administrators", "support-team"]
complexity: "intermediate"
tags: ["troubleshooting", "debugging", "operations", "support", "issues"]
status: "active"
estimated_time: "20 minutes read"
related_docs: ["/docs/operations/monitoring", "/docs/development/bug-tracking", "/production-operations-guide"]
---

# Troubleshooting Guide

## YouTube Link Pasting Issues

If pasting YouTube links isn't working, follow these debugging steps:

### Step 1: Check Authentication

1. **Sign in first**: Make sure you're signed in with Clerk authentication
   - Go to <http://localhost:3000>
   - Click "Sign In" button to open authentication modal
   - Choose from Google, GitHub, or email authentication options
   - Complete the authentication flow

2. **Verify authentication status**:
   - Look for user avatar/info in the top navigation
   - Check browser console for Clerk-related errors
   - Verify JWT token in browser developer tools → Application → Local Storage

### Step 2: Check Services Are Running

Both frontend and backend must be running:

```bash
# Quick check - run both servers concurrently:
pnpm dev:full

# OR manually in separate terminals:
# Terminal 1 - Backend
pnpm api:dev

# Terminal 2 - Frontend  
pnpm dev
```

**Expected ports:**

- Frontend: <http://localhost:3000>
- Backend: <http://localhost:8000>

### Step 3: Check Environment Variables

Ensure `.env.local` has all required variables:

```bash
# Validate environment
pnpm env:validate

# Required variables:
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
GOOGLE_CLIENT_SECRET=...
```

### Step 4: Use Debug Panel

1. Open <http://localhost:3000>
2. Sign in if needed
3. Look for the Debug Panel in bottom-right corner (development only)
4. Click "Test Summary" to see detailed logs
5. Check what specific step fails

### Step 5: Check Browser Console

1. Open browser dev tools (F12)
2. Go to Console tab
3. Look for errors when pasting URL
4. Check Network tab for failed API requests

## Common Issues & Solutions

### Issue: "Not authenticated" error

**Solution:** Sign in with Google OAuth first

### Issue: "Failed to create summary" error

**Possible causes:**

1. Backend not running (check <http://localhost:8000/api/health>)
2. Invalid OpenAI API key
3. Database connection issues
4. YouTube transcript not available

### Issue: Page loads but nothing happens when pasting URL

**Debug steps:**

1. Check browser console for JavaScript errors
2. Verify tRPC connection in Debug Panel
3. Test authentication in Debug Panel
4. Check if backend is responding

### Issue: Backend connection errors

**Solutions:**

1. Ensure backend is running: `pnpm run api:dev`
2. Check backend health: `curl http://localhost:8000/api/health`
3. Verify CORS settings allow localhost:3000

### Issue: Database errors

**Solutions:**

1. Check DATABASE_URL format
2. Run database migrations: `pnpm run db:push`
3. Verify Neon database is accessible

## Quick Debug Commands

```bash
# Test backend health
curl http://localhost:8000/api/health

# Test authentication endpoint
curl http://localhost:3000/api/auth/session

# Check tRPC endpoint
curl http://localhost:3000/api/trpc/auth.getSession \
  -H "Content-Type: application/json" \
  -d '{"json":null,"meta":{"values":{}}}'

# Validate environment
pnpm run env:validate

# Check running processes
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
```

## Debug Panel Features

The Debug Panel (visible in development) provides:

- ✅ Authentication status
- 🔍 Test summarization with custom URL
- 🔍 Test authentication endpoint
- 🔍 Test tRPC connection
- 📝 Real-time logs of all operations

## Getting Help

1. **Check logs**: Always check Debug Panel and browser console first
2. **Test incrementally**: Use Debug Panel buttons to isolate the issue
3. **Verify services**: Ensure both frontend and backend are running
4. **Environment**: Double-check all environment variables are set

## Advanced Debugging

### Enable verbose logging

```bash
# Backend logs
cd api && ../venv/bin/python -m uvicorn index:app --reload --log-level debug

# Frontend logs  
NEXT_PUBLIC_DEBUG=true pnpm run dev
```

### Database debugging

```bash
# Open Prisma Studio
pnpm run db:studio

# Check database schema
pnpm run db:generate
```

### Network debugging

1. Open browser Network tab
2. Filter by "XHR" or "Fetch"
3. Look for failed requests to `/api/trpc/` or backend
4. Check request/response details

## Recovery Steps

If nothing works, try this reset sequence:

1. **Stop all services**: `pkill -f uvicorn && pkill -f next`
2. **Clean install**: `rm -rf node_modules && pnpm install`
3. **Reset database**: `pnpm run db:push --force-reset`
4. **Restart services**: `./scripts/debug-startup.sh`
5. **Test with Debug Panel**
