# Synthetic Summary Test Documentation

## Overview

The synthetic test endpoint exercises the full summary pipeline with correlation tracking, allowing end-to-end testing of:

1. **tRPC summary.create** - API routing layer
2. **FastAPI /api/summarize** - Backend processing
3. **Progress polling** - Real-time status updates
4. **DB write** - Prisma database operations

## Test Endpoint

### `/api/dev/synthetic` (Development Only)

**Method:** POST  
**URL:** `http://localhost:8000/api/dev/synthetic`  
**Headers:**
- `Content-Type: application/json`
- `X-Correlation-Id: <optional-cid>` (auto-generated if not provided)

**Response:**
```json
{
  "task_id": "uuid-v4",
  "cid": "correlation-id",
  "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "message": "Synthetic test initiated successfully",
  "poll_endpoint": "/api/progress/{task_id}"
}
```

## Correlation ID Flow

The correlation ID (`cid`) flows through the entire stack:

```
Frontend → tRPC → FastAPI → Progress Store → DB
```

### Format Patterns:
- User-initiated: `{timestamp}-{random}`
- Anonymous: `anon-{timestamp}-{random}`
- API-generated: `api-{uuid}`
- Test: `test-{timestamp}-{uuid-fragment}`

## Running the Test

### Quick Test with Script

```bash
# Make sure both servers are running
pnpm dev:full

# In another terminal
./scripts/test-synthetic.sh
```

### Manual Test with curl

```bash
# 1. Trigger synthetic test
curl -X POST http://localhost:8000/api/dev/synthetic \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: test-123" \
  | jq '.'

# 2. Poll progress (use task_id from response)
curl http://localhost:8000/api/progress/{task_id} | jq '.'

# 3. Repeat polling until status is "completed"
```

## Log Locations & Formats

### 1. FastAPI Backend Logs

**Location:** Python API console output  
**Format:** JSON structured logs

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "component": "api.synthetic",
  "cid": "test-123",
  "task_id": "uuid-here",
  "message": "Starting synthetic summary test"
}
```

**Components to watch:**
- `api.synthetic` - Synthetic test endpoint
- `api.synthetic.progress` - Progress updates
- `api.summarize` - Main summarization endpoint

### 2. tRPC/Next.js Logs

**Location:** Next.js console output  
**Format:** JSON via logger

```json
{
  "cid": "test-123",
  "userId": "user-id",
  "videoId": "dQw4w9WgXcQ",
  "component": "tRPC.summary.create",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Components to watch:**
- `tRPC.summary.create` - Authenticated summary creation
- `tRPC.summary.createAnonymous` - Anonymous summary creation
- `tRPC.summary.create.db` - Database operations

### 3. Prisma Database Logs

**Location:** Next.js console output (dev only)  
**Format:** JSON structured logs

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "DEBUG",
  "component": "prisma.query",
  "query": "INSERT INTO Summary...",
  "params": "[...]",
  "duration": 45,
  "message": "Query executed in 45ms"
}
```

**Log levels:**
- `DEBUG` - Query execution details
- `INFO` - General information
- `WARN` - Warnings
- `ERROR` - Errors

## Tracing Requests

### By Correlation ID

```bash
# Trace entire request flow
grep "test-123" logs/*.log

# Or in terminal output
pnpm dev:full 2>&1 | grep "test-123"
```

### By Task ID

```bash
# Find all logs for a specific task
grep "task-id-here" logs/*.log
```

### By Component

```bash
# FastAPI logs
grep "api.synthetic" logs/*.log

# tRPC logs
grep "tRPC.summary" logs/*.log

# Database logs
grep "prisma.query" logs/*.log
```

## Files Changed

### 1. **api/index.py**
- Added `/api/dev/synthetic` endpoint
- Added correlation ID extraction from headers
- Added structured JSON logging throughout
- Updated progress storage to include `cid`

### 2. **src/server/api/routers/summary.ts**
- Added correlation ID generation
- Added structured logging with `cid`
- Added database operation logging

### 3. **src/lib/db/prisma.ts**
- Enhanced Prisma logging configuration
- Added structured JSON output for queries
- Enabled query, error, warn, info events in dev

### 4. **scripts/test-synthetic.sh** (NEW)
- Automated test script for synthetic endpoint
- Includes progress polling
- Color-coded output

### 5. **docs/SYNTHETIC_TEST.md** (NEW)
- This documentation file

## Minimal Diffs Summary

```diff
# api/index.py
+ Added /api/dev/synthetic endpoint
+ Added X-Correlation-Id header support
+ Added JSON structured logging
+ Added cid to progress_storage

# src/server/api/routers/summary.ts
+ Generate correlation IDs
+ Log with cid throughout request
+ Log database operations

# src/lib/db/prisma.ts
+ Enhanced Prisma event logging
+ JSON structured output
+ Query timing information
```

## Troubleshooting

### No logs appearing?
- Ensure `NODE_ENV=development` is set
- Check that both servers are running (`pnpm dev:full`)

### Synthetic endpoint not found?
- The endpoint is only available in development mode
- Check environment variables

### Progress not updating?
- Check that task_id is correct
- Verify progress_storage has the entry
- Look for error status in progress response

### Database logs missing?
- Prisma logging only works in development
- Check `NODE_ENV=development`
- Restart Next.js server after env changes