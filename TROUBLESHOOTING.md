# Troubleshooting Guide

## YouTube Link Pasting Issues

If pasting YouTube links isn't working, follow these debugging steps:

### Step 1: Check Authentication

1. **Sign in first**: Make sure you're signed in with Google OAuth
   - Go to http://localhost:3000/login
   - Click "Continue with Google"
   - Complete the OAuth flow

2. **Verify authentication status**:
   - Look for user info in the top navigation
   - Check browser console for auth-related errors

### Step 2: Check Services Are Running

Both frontend and backend must be running:

```bash
# Quick check - run this in terminal:
./scripts/debug-startup.sh

# OR manually:
# Terminal 1 - Backend
npm run api:dev

# Terminal 2 - Frontend  
npm run dev
```

**Expected ports:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Step 3: Check Environment Variables

Ensure `.env.local` has all required variables:

```bash
# Validate environment
npm run env:validate

# Required variables:
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Step 4: Use Debug Panel

1. Open http://localhost:3000
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
1. Backend not running (check http://localhost:8000/api/health)
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
1. Ensure backend is running: `npm run api:dev`
2. Check backend health: `curl http://localhost:8000/api/health`
3. Verify CORS settings allow localhost:3000

### Issue: Database errors
**Solutions:**
1. Check DATABASE_URL format
2. Run database migrations: `npm run db:push`
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
npm run env:validate

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

### Enable verbose logging:
```bash
# Backend logs
cd api && ../venv/bin/python -m uvicorn index:app --reload --log-level debug

# Frontend logs  
NEXT_PUBLIC_DEBUG=true npm run dev
```

### Database debugging:
```bash
# Open Prisma Studio
npm run db:studio

# Check database schema
npm run db:generate
```

### Network debugging:
1. Open browser Network tab
2. Filter by "XHR" or "Fetch"
3. Look for failed requests to `/api/trpc/` or backend
4. Check request/response details

## Recovery Steps

If nothing works, try this reset sequence:

1. **Stop all services**: `pkill -f uvicorn && pkill -f next`
2. **Clean install**: `rm -rf node_modules && npm install`
3. **Reset database**: `npm run db:push --force-reset`
4. **Restart services**: `./scripts/debug-startup.sh`
5. **Test with Debug Panel**