---
title: "API Documentation"
description: "Comprehensive API reference for Sightline.ai dual-layer architecture with tRPC and FastAPI"
type: "guide"
canonical_url: "/api"
version: "2.0"
last_updated: "2025-01-09"
audience: ["developers", "api-users", "frontend-developers", "backend-developers"]
complexity: "intermediate"
tags: ["api", "trpc", "fastapi", "documentation", "reference", "integration"]
api_categories: ["core", "system", "monitoring"]
http_methods: ["GET", "POST", "DELETE"]
related_docs: ["/claude", "/architecture", "/contributing", "/environment-setup"]
---

# API Documentation

**Comprehensive API reference for Sightline.ai dual-layer architecture with type-safe frontend communication and high-performance AI processing**

## Table of Contents

### [Part I: Architecture & Overview](#part-i-architecture--overview)

- [API Architecture Overview](#api-architecture-overview)
- [Quick Start](#quick-start)
- [Core Data Types](#core-data-types)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

### [Part II: tRPC API Reference](#part-ii-trpc-api-reference)

- [Summary Router](#summary-router)
- [Smart Collections Integration](#smart-collections-integration)
- [Progress Tracking Integration](#progress-tracking-integration)
- [tRPC Error Handling Patterns](#trpc-error-handling-patterns)

### [Part III: FastAPI Reference](#part-iii-fastapi-reference)

- [Summarization Endpoints](#summarization-endpoints)
- [Progress Tracking API](#progress-tracking-api)
- [Health Check Endpoints](#health-check-endpoints)
- [Processing Pipeline](#processing-pipeline)

### [Part IV: Implementation Examples](#part-iv-implementation-examples)

- [Frontend Progress Tracking](#frontend-progress-tracking)
- [Backend Processing Examples](#backend-processing-examples)
- [Error Handling Patterns](#error-handling-patterns)
- [Testing Strategies](#testing-strategies)

### [Part V: Operations & Monitoring](#part-v-operations--monitoring)

- [Load Balancer Configuration](#load-balancer-configuration)
- [Kubernetes Integration](#kubernetes-integration)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)

---

# Part I: Architecture & Overview

## API Architecture Overview

Sightline.ai uses a dual API architecture optimized for different use cases:

```text
Frontend ──→ tRPC API ──→ Database (User Operations)
            ↘         ↙
              FastAPI ──→ AI Processing
```

### API Layers

#### tRPC API (TypeScript)

**Purpose**: Type-safe frontend-backend communication  
**Base URL**: `/api/trpc` (development: `http://localhost:3000/api/trpc`)  
**Authentication**: Clerk JWT tokens  

**Key Features**:

- End-to-end type safety with automatic TypeScript inference
- Real-time optimistic updates
- Built-in error handling with structured error codes
- Automatic request/response validation with Zod schemas

#### FastAPI (Python)  

**Purpose**: High-performance AI processing  
**Base URL**: `/api` (development: `http://localhost:8000`)  
**Authentication**: JWT validation for protected routes  

**Key Features**:

- Async processing for CPU-intensive operations
- OpenAPI/Swagger automatic documentation
- Real-time progress tracking for long-running tasks
- Integration with Python AI/ML ecosystem

## Quick Start

### tRPC Client Usage

```typescript
import { api } from '@/lib/trpc'

// Create summary for authenticated user
const { data: summary } = await api.summary.create.useMutation()
const result = await summary.mutateAsync({ 
  url: 'https://youtube.com/watch?v=dQw4w9WgXcQ' 
})

// Query user's library with filtering
const { data: library } = api.library.getAll.useQuery({
  categories: ['Technology'],
  sortBy: 'date',
  limit: 10
})
```

### FastAPI Direct Usage

```bash
# Health check
curl http://localhost:8000/api/health

# Create summary (requires authentication)
curl -X POST http://localhost:8000/api/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"url": "https://youtube.com/watch?v=dQw4w9WgXcQ", "userId": "user_123"}'

# Check processing progress
curl http://localhost:8000/api/progress/550e8400-e29b-41d4-a716-446655440000
```

## Core Data Types

### Schema Definitions

```typescript
interface Summary {
  id: string
  userId: string
  videoTitle: string
  videoUrl: string
  content: string          // Structured AI-generated content
  keyMoments?: string      // Timestamped highlights
  tags: Tag[]             // Smart Collections tags
  categories: Category[]   // Smart Collections categories
  createdAt: Date
}

interface Tag {
  id: string
  name: string
  type: 'PERSON' | 'COMPANY' | 'TECHNOLOGY' | 'PRODUCT' | 
        'CONCEPT' | 'FRAMEWORK' | 'TOOL'
}

interface Category {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  plan: 'FREE' | 'PRO' | 'COMPLETE'
  subscriptionStatus: string
}
```

## Authentication

### Clerk Integration (tRPC)

```typescript
// Protected procedure (requires authentication)
export const protectedProcedure = t.procedure
  .use(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    return next({ ctx: { ...ctx, user: ctx.user } })
  })

// Usage in frontend
const user = useUser() // Clerk hook
if (user) {
  const summaries = await api.summary.create.mutate(input)
}
```

### JWT Validation (FastAPI)

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def verify_token(token: str = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=["RS256"])
        return payload["sub"]
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Usage in endpoint
@app.post("/api/summarize")
async def create_summary(
    request: SummarizeRequest,
    user_id: str = Depends(verify_token)
):
    return await process_summary(request, user_id)
```

## Error Handling

### tRPC Error Codes

```typescript
// Standard error codes
'BAD_REQUEST'           // Invalid input (400)
'UNAUTHORIZED'          // Authentication required (401)  
'FORBIDDEN'             // Access denied/limits exceeded (403)
'NOT_FOUND'            // Resource not found (404)
'CONFLICT'             // Resource already exists (409)
'INTERNAL_SERVER_ERROR' // Server processing error (500)

// Usage
try {
  const summary = await api.summary.create.mutate({ url })
} catch (error) {
  if (error.data?.code === 'FORBIDDEN') {
    // Handle plan limits
  }
}
```

### FastAPI Error Responses

```json
{
  "error": "Could not retrieve transcript for this video",
  "detail": "The video may not have captions available",
  "status_code": 400,
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Rate Limiting

### Usage Limits by Plan

- **Anonymous**: 1 summary (lifetime, per browser fingerprint + IP)
- **Free Plan**: 3 summaries (lifetime limit)
- **Pro Plan**: 25 summaries/month (resets on billing cycle)
- **Enterprise Plan**: Unlimited summaries

### Rate Limit Headers

```http
X-RateLimit-Limit: 25
X-RateLimit-Remaining: 18
X-RateLimit-Reset: 1704412800
X-RateLimit-Window: month
```

---

# Part II: tRPC API Reference

## Summary Router

**Video summarization procedures for authenticated and anonymous users**

### `createAnonymous`

Create video summary for anonymous users without authentication.

**Usage**:

```typescript
api.summary.createAnonymous.mutate(input)
```

**Input Schema**:

```typescript
{
  url: string              // YouTube URL (validated, max 2048 chars)
  browserFingerprint: string  // Browser fingerprint for anonymous tracking
}
```

**Output Schema**:

```typescript
{
  id: string
  videoTitle: string
  channelName: string
  videoUrl: string
  content: string
  createdAt: Date
  isAnonymous: true
  canSave: false
  task_id: string
}
```

**Example**:

```typescript
const createAnonymousSubmit = async (url: string) => {
  const fingerprint = generateBrowserFingerprint()
  
  try {
    const summary = await api.summary.createAnonymous.mutate({
      url,
      browserFingerprint: fingerprint
    })
    
    console.log('Task ID:', summary.task_id)
    return summary
  } catch (error) {
    if (error.data?.code === 'FORBIDDEN') {
      // User already used their anonymous summary
      showSignUpModal()
    }
  }
}
```

**Error Codes**:

- `FORBIDDEN`: User already created anonymous summary
- `BAD_REQUEST`: Invalid YouTube URL or suspicious content
- `INTERNAL_SERVER_ERROR`: Backend processing failure

### `create`

Create video summary for authenticated users.

**Usage**:

```typescript
api.summary.create.mutate(input)
```

**Input Schema**:

```typescript
{
  url: string          // YouTube URL (validated)
  title?: string       // Optional custom title
  isPublic?: boolean   // Public sharing (default: false)
}
```

**Output Schema**:

```typescript
{
  id: string
  userId: string
  videoTitle: string
  channelName: string
  videoUrl: string
  content: string
  tags: Tag[]          // Smart Collections tags
  categories: Category[] // Smart Collections categories
  createdAt: Date
  task_id: string
}
```

**Example**:

```typescript
const createSummary = async (url: string) => {
  const user = useUser()
  if (!user) throw new Error('Authentication required')
  
  const summary = await api.summary.create.mutate({
    url,
    isPublic: false
  })
  
  // Poll for progress
  pollTaskProgress(summary.task_id)
  
  return summary
}
```

**Usage Limits**:

- Free Plan: 3 summaries total (lifetime)
- Pro Plan: 25 summaries/month
- Enterprise Plan: Unlimited

### `getById`

Retrieve specific summary by ID with access control.

**Usage**:

```typescript
api.summary.getById.useQuery({ id })
```

**Input Schema**:

```typescript
{
  id: string // Summary ID
}
```

**Output Schema**:

```typescript
{
  id: string
  videoTitle: string
  channelName: string
  videoUrl: string
  content: string
  keyMoments?: string
  tags: Tag[]
  categories: Category[]
  createdAt: Date
  isOwner: boolean      // User ownership flag
  canEdit: boolean      // Edit permissions
}
```

**Example**:

```typescript
const SummaryPage = ({ summaryId }: { summaryId: string }) => {
  const { data: summary, isLoading } = api.summary.getById.useQuery({ 
    id: summaryId 
  })
  
  if (isLoading) return <LoadingSkeleton />
  if (!summary) return <NotFound />
  
  return <SummaryViewer summary={summary} />
}
```

### `update`

Update summary metadata (title, public status).

**Usage**:

```typescript
api.summary.update.mutate(input)
```

**Input Schema**:

```typescript
{
  id: string
  title?: string
  isPublic?: boolean
}
```

**Example**:

```typescript
const updateSummary = async (id: string, updates: Partial<Summary>) => {
  const updated = await api.summary.update.mutate({
    id,
    ...updates
  })
  
  toast.success('Summary updated successfully')
  return updated
}
```

### `delete`

Delete user's summary with cascading cleanup.

**Usage**:

```typescript
api.summary.delete.mutate({ id })
```

**Input Schema**:

```typescript
{
  id: string // Summary ID to delete
}
```

**Output Schema**:

```typescript
{
  success: true
  deletedId: string
}
```

**Example**:

```typescript
const deleteSummary = async (id: string) => {
  if (!confirm('Delete this summary permanently?')) return
  
  await api.summary.delete.mutate({ id })
  
  // Update UI optimistically
  utils.summary.getById.invalidate({ id })
  utils.library.getAll.invalidate()
  
  toast.success('Summary deleted')
}
```

### `toggleFavorite`

Toggle favorite status for a summary.

**Usage**:

```typescript
api.summary.toggleFavorite.mutate({ id })
```

**Input Schema**:

```typescript
{
  id: string // Summary ID
}
```

**Output**: Updated summary with new favorite status

**Example**:

```typescript
const toggleFavorite = async (id: string) => {
  const updated = await api.summary.toggleFavorite.mutate({ id })
  toast.success(updated.isFavorite ? 'Added to favorites' : 'Removed from favorites')
  return updated
}
```

### `rate`

Rate a summary from 1 to 5 stars.

**Usage**:

```typescript
api.summary.rate.mutate({ id, rating })
```

**Input Schema**:

```typescript
{
  id: string        // Summary ID
  rating: number    // 1-5 stars
}
```

**Output**: Updated summary with rating

**Example**:

```typescript
const rateSummary = async (id: string, rating: number) => {
  const updated = await api.summary.rate.mutate({ id, rating })
  toast.success(`Rated ${rating} stars`)
  return updated
}
```

### `updateNotes`

Add or update personal notes on a summary.

**Usage**:

```typescript
api.summary.updateNotes.mutate({ id, notes })
```

**Input Schema**:

```typescript
{
  id: string      // Summary ID
  notes: string   // Personal notes text
}
```

**Output**: Updated summary with notes

**Example**:

```typescript
const saveNotes = async (id: string, notes: string) => {
  const updated = await api.summary.updateNotes.mutate({ id, notes })
  toast.success('Notes saved')
  return updated
}
```

### `getByVideoId`

Check if a video has already been summarized.

**Usage**:

```typescript
api.summary.getByVideoId.useQuery({ videoId })
```

**Input Schema**:

```typescript
{
  videoId: string // YouTube video ID
}
```

**Output**: Summary object or null

**Example**:

```typescript
const checkExisting = async (videoId: string) => {
  const existing = await api.summary.getByVideoId.query({ videoId })
  if (existing) {
    toast.info('This video has already been summarized')
    router.push(`/library/${existing.id}`)
  }
  return existing
}
```

### `claimAnonymousSummaries`

Claim anonymous summaries after signup.

**Usage**:

```typescript
api.summary.claimAnonymousSummaries.query({ fingerprint })
```

**Input Schema**:

```typescript
{
  fingerprint: string // Browser fingerprint used for anonymous summaries
}
```

**Output**: Array of claimed summaries

**Example**:

```typescript
const claimSummaries = async () => {
  const fingerprint = generateBrowserFingerprint()
  const claimed = await api.summary.claimAnonymousSummaries.query({ fingerprint })
  
  if (claimed.length > 0) {
    toast.success(`Claimed ${claimed.length} anonymous summaries`)
  }
  return claimed
}
```

## Smart Collections Integration

Authenticated summaries automatically include Smart Collections tags and categories:

```typescript
interface Tag {
  id: string
  name: string
  type: 'PERSON' | 'COMPANY' | 'TECHNOLOGY' | 'PRODUCT' | 
        'CONCEPT' | 'FRAMEWORK' | 'TOOL'
}

// Example usage in UI
const TagDisplay = ({ tags }: { tags: Tag[] }) => {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <Badge 
          key={tag.id}
          variant={getTagColor(tag.type)}
          className="text-xs"
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  )
}
```

## Progress Tracking Integration

All summary creation procedures return a `task_id` for tracking AI processing progress:

```typescript
const trackSummaryProgress = async (taskId: string) => {
  const pollProgress = async (): Promise<void> => {
    try {
      const response = await fetch(`/api/progress/${taskId}`)
      const progress = await response.json()
      
      setProgress(progress.progress)
      setStage(progress.stage)
      
      if (progress.status === 'completed') {
        // Refresh summary data
        await utils.summary.getById.invalidate()
        setProgress(100)
      } else if (progress.status === 'processing') {
        setTimeout(pollProgress, 2000)
      } else if (progress.status === 'error') {
        throw new Error(progress.stage)
      }
    } catch (error) {
      console.error('Progress tracking failed:', error)
    }
  }
  
  return pollProgress()
}
```

## tRPC Error Handling Patterns

```typescript
const createSummaryWithErrorHandling = async (url: string) => {
  try {
    return await api.summary.create.mutate({ url })
  } catch (error) {
    if (error.data?.code === 'FORBIDDEN') {
      if (error.message.includes('limit')) {
        return showUpgradeModal()
      }
      if (error.message.includes('anonymous')) {
        return showSignUpModal()
      }
    }
    
    if (error.data?.code === 'BAD_REQUEST') {
      toast.error('Invalid YouTube URL or video unavailable')
      return
    }
    
    // Generic error
    toast.error('Failed to create summary. Please try again.')
    console.error('Summary creation error:', error)
  }
}
```

---

# Part III: FastAPI Reference

## Summarization Endpoints

**High-performance AI processing endpoints for video summarization**

### `POST /api/summarize`

Main video summarization endpoint with real-time progress tracking.

**URL**: `/api/summarize`  
**Method**: `POST`  
**Authentication**: Required (JWT Bearer token)

**Request Body**:

```json
{
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "userId": "user_123",
  "options": {
    "includeKeyMoments": true,
    "includeTranscript": false
  }
}
```

**Request Schema**:

```python
class SummarizeRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL")
    userId: str = Field(..., description="User ID from authentication")
    options: Optional[SummarizeOptions] = None

class SummarizeOptions(BaseModel):
    includeKeyMoments: bool = True
    includeTranscript: bool = False
```

**Response**:

```json
{
  "video_id": "dQw4w9WgXcQ",
  "video_url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "video_title": "Rick Astley - Never Gonna Give You Up",
  "channel_name": "Rick Astley",
  "channel_id": "UC_example",
  "duration": 213,
  "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "summary": {
    "content": "# TL;DR\n\nRick Astley performs his hit song...",
    "key_points": [
      "Classic 80s music video production",
      "Iconic dance moves and vocals",
      "Cultural internet phenomenon"
    ],
    "key_moments": "0:00 - Song introduction...",
    "frameworks": [],
    "playbooks": [],
    "tools": [],
    "sentiment": "positive",
    "novelty_score": 5
  },
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "processing_time": 23.5,
    "model": "gpt-4o-mini",
    "transcript_length": 1240
  }
}
```

**Processing Stages**:

1. `Initializing...` (5%)
2. `Connecting to YouTube...` (10%)
3. `Fetching video information...` (25%)
4. `Downloading transcript...` (40%)
5. `Analyzing content with AI...` (60%)
6. `Generating your summary...` (80%)
7. `Summary ready!` (100%)

**Example Implementation**:

```python
@app.post("/api/summarize")
async def create_summary(
    request: SummarizeRequest,
    user_id: str = Depends(verify_token),
    background_tasks: BackgroundTasks
):
    # Generate unique task ID
    task_id = str(uuid.uuid4())
    
    # Initialize progress tracking
    progress_service.start_task(task_id, "Initializing...")
    
    # Start background processing
    background_tasks.add_task(
        process_summary_async,
        request.url,
        user_id,
        task_id,
        request.options
    )
    
    # Return immediate response with task ID
    return {
        "task_id": task_id,
        "status": "processing",
        "message": "Summary generation started"
    }
```

**Error Responses**:

```json
{
  "error": "Could not retrieve transcript for this video",
  "detail": "The video may not have captions available or is restricted",
  "status_code": 400,
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "error_code": "TRANSCRIPT_UNAVAILABLE"
}
```

**Common Error Codes**:

- `INVALID_URL`: URL is not a valid YouTube video link
- `VIDEO_UNAVAILABLE`: Video is private, deleted, or geo-restricted
- `TRANSCRIPT_UNAVAILABLE`: No transcript available for the video
- `PROCESSING_FAILED`: AI processing encountered an error
- `QUOTA_EXCEEDED`: OpenAI API quota exceeded

### `POST /api/test-summarize`

Testing endpoint for API validation (development only).

**URL**: `/api/test-summarize`  
**Method**: `POST`  
**Authentication**: None (development only)

**Request Body**:

```json
{
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response**:

```json
{
  "status": "test_success",
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "message": "Test endpoint working",
  "environment": "development"
}
```

## Progress Tracking API

**Real-time progress tracking API for long-running AI summarization tasks**

### Key Features

- **UUID-based Task Tracking**: Each summarization request receives a unique task identifier
- **Real-time Progress Updates**: Granular progress percentages (0-100%) with descriptive stage messages
- **Non-blocking Processing**: Frontend can poll progress without blocking user interaction
- **Automatic Cleanup**: Completed tasks are automatically cleaned up to prevent memory leaks
- **Error State Management**: Comprehensive error handling with retry guidance

### `GET /api/progress/{task_id}`

Retrieve current progress status for a specific task.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string | Yes | Unique UUID identifying the processing task |

**Response Schema**:

```json
{
  "progress": 85,
  "stage": "Generating your summary...",
  "status": "processing",
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Fields**:

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `progress` | integer | 0-100 | Completion percentage |
| `stage` | string | - | Human-readable description of current processing stage |
| `status` | string | `processing`, `completed`, `error` | Task execution state |
| `task_id` | string | UUID | Task identifier for reference |
| `error` | string | - | Error message (only present when status is `error`) |

**Processing Stages**:

| Progress % | Stage | Description |
|------------|-------|-------------|
| 0-5% | "Starting..." | Initial task setup and validation |
| 5-10% | "Initializing..." | Service initialization and configuration |
| 10-25% | "Connecting to YouTube..." | Establishing connection to video service |
| 25-40% | "Fetching video information..." | Retrieving video metadata and validation |
| 40-60% | "Downloading transcript..." | Extracting video transcript via multiple fallback services |
| 60-80% | "Analyzing content with AI..." | AI model processing and content analysis |
| 80-95% | "Generating your summary..." | Final summary generation and formatting |
| 95-100% | "Summary ready!" | Task completion and result preparation |

**HTTP Status Codes**:

- **200 OK**: Progress retrieved successfully
- **404 Not Found**: Task ID not found or expired
- **500 Internal Server Error**: Server processing error

**Response Examples**:

**Active Processing**:

```json
{
  "progress": 45,
  "stage": "Downloading transcript...",
  "status": "processing",
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Completion**:

```json
{
  "progress": 100,
  "stage": "Summary ready!",
  "status": "completed",
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error State**:

```json
{
  "progress": 0,
  "stage": "Error: Invalid YouTube URL",
  "status": "error",
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### `DELETE /api/progress/{task_id}`

Clean up completed or failed progress data to prevent memory leaks.

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string | Yes | Unique UUID of the task to clean up |

**Response Schema**:

```json
{
  "status": "cleaned"
}
```

**Response Values**:

- `"cleaned"`: Task data successfully removed
- `"not_found"`: Task ID was not found (already cleaned or never existed)

**HTTP Status Codes**:

- **200 OK**: Cleanup operation completed
- **500 Internal Server Error**: Server processing error

## Health Check Endpoints

**System health monitoring and status verification API for Sightline FastAPI backend**

### Key Features

- **Lightweight Response**: Minimal processing overhead for high-frequency checks
- **System Status Verification**: Basic service availability confirmation
- **Load Balancer Integration**: Standard health check format for infrastructure components
- **Monitoring Integration**: Sentry monitoring with filtered health check events
- **Zero Authentication**: Public endpoint for operational monitoring

### `GET /api/health`

Verify basic system availability and service status.

**Request**:

No parameters required. This endpoint accepts simple GET requests.

```bash
curl -X GET https://api.sightline.ai/api/health
```

**Response Schema**:

```json
{
  "status": "healthy",
  "service": "sightline-api"
}
```

**Response Fields**:

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `status` | string | `healthy`, `degraded`, `unhealthy` | Overall system health status |
| `service` | string | `sightline-api` | Service identifier for multi-service deployments |

**HTTP Status Codes**:

- **200 OK**: Service is healthy and operational
- **503 Service Unavailable**: Service is temporarily unavailable
- **500 Internal Server Error**: Critical system failure

**Response Examples**:

**Healthy Service**:

```json
{
  "status": "healthy",
  "service": "sightline-api"
}
```

**Service Degraded** (Future Enhancement):

```json
{
  "status": "degraded",
  "service": "sightline-api",
  "warnings": [
    "High memory usage (85%)",
    "External API response time elevated"
  ]
}
```

**Service Unhealthy** (Future Enhancement):

```json
{
  "status": "unhealthy",
  "service": "sightline-api",
  "errors": [
    "Database connection failed",
    "Critical dependency unavailable"
  ]
}
```

## Processing Pipeline

### Transcript Acquisition

```python
async def get_video_transcript(video_url: str) -> str:
    """Multi-service transcript acquisition with fallback chain"""
    
    # Service priority order
    services = [
        youtube_transcript_service,  # Primary
        gumloop_service,            # Enhanced processing
        ytdlp_service,              # Fallback
        oxylabs_service             # Proxy-based
    ]
    
    for service in services:
        try:
            transcript = await service.get_transcript(video_url)
            if transcript:
                return transcript
        except Exception as e:
            logger.warning(f"{service.name} failed: {e}")
            continue
    
    raise TranscriptUnavailableError("No transcript service succeeded")
```

### AI Processing

```python
async def process_with_openai(transcript: str, video_metadata: dict) -> dict:
    """Process transcript with OpenAI for structured summary"""
    
    # Use structured output for consistent format
    completion = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
            {"role": "user", "content": f"Video: {video_metadata['title']}\n\n{transcript}"}
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "video_summary",
                "schema": VIDEO_SUMMARY_SCHEMA
            }
        }
    )
    
    return json.loads(completion.choices[0].message.content)
```

### Smart Collections Integration

```python
async def classify_content(summary: dict) -> dict:
    """Extract entities and categories using OpenAI classification"""
    
    classification = await openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": CLASSIFICATION_SYSTEM_PROMPT},
            {"role": "user", "content": summary["content"]}
        ],
        response_format={
            "type": "json_schema", 
            "json_schema": {"schema": CLASSIFICATION_SCHEMA}
        }
    )
    
    result = json.loads(classification.choices[0].message.content)
    
    # Store tags and categories in database
    await store_classifications(summary["id"], result)
    
    return result
```

---

# Part IV: Implementation Examples

## Frontend Progress Tracking

### React Hook for Progress Tracking

```typescript
import { useState, useEffect, useCallback } from 'react'

interface ProgressState {
  progress: number
  stage: string
  status: 'processing' | 'completed' | 'error'
  error?: string
}

export function useProgressTracking(taskId: string | null) {
  const [progressState, setProgressState] = useState<ProgressState>({
    progress: 0,
    stage: 'Initializing...',
    status: 'processing'
  })

  const pollProgress = useCallback(async () => {
    if (!taskId) return

    try {
      const response = await fetch(`/api/progress/${taskId}`)
      const data = await response.json()

      setProgressState({
        progress: data.progress,
        stage: data.stage,
        status: data.status,
        error: data.error
      })

      // Continue polling if still processing
      if (data.status === 'processing' && data.progress < 100) {
        setTimeout(pollProgress, 2000) // Poll every 2 seconds
      }
    } catch (error) {
      console.error('Progress polling failed:', error)
      setProgressState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to track progress'
      }))
    }
  }, [taskId])

  useEffect(() => {
    if (taskId) {
      pollProgress()
    }
  }, [taskId, pollProgress])

  return progressState
}
```

### Progress UI Component

```typescript
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProgressTrackerProps {
  taskId: string | null
  onComplete?: (result: any) => void
}

export function ProgressTracker({ taskId, onComplete }: ProgressTrackerProps) {
  const { progress, stage, status, error } = useProgressTracking(taskId)

  // Handle completion
  useEffect(() => {
    if (status === 'completed' && onComplete) {
      onComplete({ progress, stage })
    }
  }, [status, onComplete, progress, stage])

  if (status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error || 'Processing failed. Please try again.'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Progress value={progress} className="w-full" />
      <div className="text-sm text-muted-foreground text-center">
        {stage}
      </div>
      {progress < 100 && (
        <div className="text-xs text-center">
          {progress}% complete
        </div>
      )}
    </div>
  )
}
```

### Integration with Summary Creation

```typescript
export function CreateSummaryForm() {
  const [taskId, setTaskId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const createSummary = api.summary.create.useMutation({
    onSuccess: (data) => {
      setTaskId(data.task_id)
      setIsProcessing(true)
    },
    onError: (error) => {
      toast.error(`Failed to create summary: ${error.message}`)
    }
  })

  const handleProgressComplete = useCallback(async () => {
    setIsProcessing(false)
    
    // Refresh summary data from tRPC
    await utils.summary.getById.invalidate()
    await utils.library.getAll.invalidate()
    
    toast.success('Summary created successfully!')
    
    // Navigate to summary page
    router.push(`/library/${summaryId}`)
  }, [summaryId, utils, router])

  const handleSubmit = async (url: string) => {
    try {
      await createSummary.mutateAsync({ url })
    } catch (error) {
      // Error handling in mutation callback
    }
  }

  return (
    <div className="space-y-6">
      <URLInput 
        onSubmit={handleSubmit}
        disabled={isProcessing}
      />
      
      {isProcessing && (
        <ProgressTracker 
          taskId={taskId}
          onComplete={handleProgressComplete}
        />
      )}
    </div>
  )
}
```

## Backend Processing Examples

### FastAPI Progress Service

```python
import asyncio
from typing import Dict, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ProgressState:
    progress: int
    stage: str
    status: str
    task_id: str
    updated_at: datetime
    error: Optional[str] = None

class ProgressService:
    def __init__(self):
        self._tasks: Dict[str, ProgressState] = {}
        self._cleanup_interval = 3600  # 1 hour
        
    async def start_task(self, task_id: str, initial_stage: str = "Initializing..."):
        """Initialize progress tracking for a new task"""
        self._tasks[task_id] = ProgressState(
            progress=0,
            stage=initial_stage,
            status="processing",
            task_id=task_id,
            updated_at=datetime.utcnow()
        )
        
    async def update_progress(
        self, 
        task_id: str, 
        progress: int, 
        stage: str,
        status: str = "processing"
    ):
        """Update progress for an existing task"""
        if task_id in self._tasks:
            self._tasks[task_id].progress = progress
            self._tasks[task_id].stage = stage
            self._tasks[task_id].status = status
            self._tasks[task_id].updated_at = datetime.utcnow()
            
    async def set_error(self, task_id: str, error_message: str):
        """Mark task as failed with error message"""
        if task_id in self._tasks:
            self._tasks[task_id].status = "error"
            self._tasks[task_id].error = error_message
            self._tasks[task_id].updated_at = datetime.utcnow()
            
    async def get_progress(self, task_id: str) -> Optional[ProgressState]:
        """Get current progress state for a task"""
        return self._tasks.get(task_id)
        
    async def cleanup_completed(self):
        """Remove old completed/failed tasks to prevent memory leaks"""
        cutoff = datetime.utcnow().timestamp() - self._cleanup_interval
        
        to_remove = [
            task_id for task_id, state in self._tasks.items()
            if state.updated_at.timestamp() < cutoff
            and state.status in ["completed", "error"]
        ]
        
        for task_id in to_remove:
            del self._tasks[task_id]

# Global progress service instance
progress_service = ProgressService()
```

### Integration in Processing Pipeline

```python
async def process_summary_with_progress(
    url: str, 
    user_id: str, 
    task_id: str
):
    """Complete summary processing with progress updates"""
    
    try:
        # Stage 1: Initialize
        await progress_service.update_progress(
            task_id, 5, "Connecting to YouTube..."
        )
        
        # Stage 2: Get video metadata
        video_metadata = await get_video_metadata(url)
        await progress_service.update_progress(
            task_id, 25, "Fetching video information..."
        )
        
        # Stage 3: Download transcript
        transcript = await get_video_transcript(url)
        await progress_service.update_progress(
            task_id, 40, "Downloading transcript..."
        )
        
        # Stage 4: AI processing
        await progress_service.update_progress(
            task_id, 60, "Analyzing content with AI..."
        )
        summary = await process_with_openai(transcript, video_metadata)
        
        # Stage 5: Generate final summary
        await progress_service.update_progress(
            task_id, 80, "Generating your summary..."
        )
        
        # Stage 6: Store in database
        stored_summary = await store_summary(user_id, summary, video_metadata)
        
        # Stage 7: Complete
        await progress_service.update_progress(
            task_id, 100, "Summary ready!", "completed"
        )
        
        return stored_summary
        
    except Exception as e:
        await progress_service.set_error(task_id, str(e))
        raise
```

## Error Handling Patterns

### Frontend Error Recovery

```typescript
export function useProgressTrackingWithRetry(taskId: string | null) {
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  
  const pollProgressWithRetry = useCallback(async () => {
    try {
      const response = await fetch(`/api/progress/${taskId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      // Reset retry count on successful request
      setRetryCount(0)
      
      return data
    } catch (error) {
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1)
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        return pollProgressWithRetry()
      } else {
        throw error
      }
    }
  }, [taskId, retryCount, maxRetries])

  // ... rest of implementation
}
```

### Backend Error Recovery

```python
async def process_with_error_recovery(task_id: str, url: str):
    """Process summary with automatic error recovery"""
    
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            return await process_summary_with_progress(url, task_id)
        except TransientError as e:
            retry_count += 1
            wait_time = 2 ** retry_count  # Exponential backoff
            
            await progress_service.update_progress(
                task_id, 
                -1,  # Indicate retry
                f"Retrying... ({retry_count}/{max_retries})"
            )
            
            await asyncio.sleep(wait_time)
            
        except PermanentError as e:
            await progress_service.set_error(task_id, str(e))
            raise
    
    # All retries exhausted
    await progress_service.set_error(task_id, "Maximum retries exceeded")
    raise Exception("Processing failed after multiple attempts")
```

## Testing Strategies

### Frontend Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useProgressTracking } from '@/hooks/useProgressTracking'

// Mock fetch
global.fetch = jest.fn()

describe('useProgressTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should poll progress and update state', async () => {
    const mockResponses = [
      { progress: 25, stage: 'Processing...', status: 'processing' },
      { progress: 100, stage: 'Complete!', status: 'completed' }
    ]
    
    let callCount = 0
    ;(fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockResponses[callCount++])
      })
    )

    const { result } = renderHook(() => useProgressTracking('task-123'))

    await waitFor(() => {
      expect(result.current.progress).toBe(100)
      expect(result.current.status).toBe('completed')
    })

    expect(fetch).toHaveBeenCalledWith('/api/progress/task-123')
  })
})
```

### Backend Testing

```python
import pytest
from unittest.mock import AsyncMock
from api.services.progress_service import ProgressService

@pytest.fixture
async def progress_service():
    return ProgressService()

@pytest.mark.asyncio
async def test_progress_tracking(progress_service):
    task_id = "test-task-123"
    
    # Start task
    await progress_service.start_task(task_id, "Starting...")
    
    # Update progress
    await progress_service.update_progress(task_id, 50, "Halfway done")
    
    # Get progress
    state = await progress_service.get_progress(task_id)
    
    assert state.progress == 50
    assert state.stage == "Halfway done"
    assert state.status == "processing"
```

---

# Part V: Operations & Monitoring

## Load Balancer Configuration

### AWS Application Load Balancer (ALB)

```yaml
HealthCheck:
  Path: /api/health
  Protocol: HTTP
  Port: 8000
  IntervalSeconds: 30
  TimeoutSeconds: 5
  HealthyThresholdCount: 2
  UnhealthyThresholdCount: 3
  Matcher:
    HttpCode: 200
```

### Google Cloud Load Balancer

```yaml
healthCheck:
  type: HTTP
  httpHealthCheck:
    port: 8000
    requestPath: /api/health
    checkIntervalSec: 30
    timeoutSec: 5
    healthyThreshold: 2
    unhealthyThreshold: 3
```

### NGINX Upstream Health Checks

```nginx
upstream sightline_backend {
    server backend1.sightline.ai:8000 max_fails=3 fail_timeout=30s;
    server backend2.sightline.ai:8000 max_fails=3 fail_timeout=30s;
}

location /api/health {
    access_log off;  # Don't log health checks
    proxy_pass http://sightline_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_connect_timeout 5s;
    proxy_read_timeout 5s;
}
```

## Kubernetes Integration

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 8000
    scheme: HTTP
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1
```

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /api/health
    port: 8000
    scheme: HTTP
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
  successThreshold: 1
```

### Combined Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sightline-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: sightline-api
  template:
    metadata:
      labels:
        app: sightline-api
    spec:
      containers:
      - name: sightline-api
        image: sightline/api:latest
        ports:
        - containerPort: 8000
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Performance Optimization

### Caching Strategy

```python
from functools import lru_cache
import redis

redis_client = redis.Redis(host='localhost', port=6379, db=0)

@lru_cache(maxsize=100)
def get_video_metadata(video_id: str) -> dict:
    """Cache video metadata to reduce YouTube API calls"""
    cached = redis_client.get(f"video_meta:{video_id}")
    if cached:
        return json.loads(cached)
    
    metadata = youtube_service.get_metadata(video_id)
    redis_client.setex(f"video_meta:{video_id}", 3600, json.dumps(metadata))
    return metadata
```

### Async Processing

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def process_summary_async(
    url: str,
    user_id: str,
    task_id: str,
    options: SummarizeOptions
):
    """Async summary processing with progress updates"""
    
    try:
        # Update progress: Fetching video info
        await progress_service.update_progress(task_id, 25, "Fetching video information...")
        
        # Parallel processing where possible
        video_metadata, transcript = await asyncio.gather(
            get_video_metadata_async(url),
            get_video_transcript_async(url)
        )
        
        # Update progress: AI processing
        await progress_service.update_progress(task_id, 60, "Analyzing content with AI...")
        
        # AI processing (CPU-intensive, run in thread pool)
        with ThreadPoolExecutor() as executor:
            summary = await asyncio.get_event_loop().run_in_executor(
                executor,
                process_with_openai,
                transcript,
                video_metadata
            )
        
        # Final steps
        await progress_service.update_progress(task_id, 100, "Summary ready!")
        
        # Store in database
        await store_summary(user_id, summary, video_metadata)
        
    except Exception as e:
        await progress_service.update_progress(
            task_id, -1, f"Error: {str(e)}", status="error"
        )
        raise
```

## Security Considerations

### Public Endpoint Security

**No Authentication Required**: The health check endpoint is intentionally public to allow monitoring systems and load balancers to verify service status without authentication overhead.

**Rate Limiting**: Consider implementing light rate limiting to prevent abuse:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/health")
@limiter.limit("100/minute")  # Allow 100 health checks per minute per IP
async def health_check(request: Request):
    return {"status": "healthy", "service": "sightline-api"}
```

### Information Disclosure

**Minimal Information**: The basic health check returns minimal information to prevent information disclosure while providing operational value.

**Detailed Health Checks**: Future enhanced health endpoints should be protected:

```python
from api.dependencies import verify_admin_access

@app.get("/api/health/detailed")
async def detailed_health_check(admin_user: str = Depends(verify_admin_access)):
    """Detailed health check - admin access required."""
    # ... comprehensive health check logic ...
```

---

## Development Tools

### tRPC DevTools

```typescript
// Enable in development
import { unstable_httpBatchStreamLink } from '@trpc/client'

const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchStreamLink({ url: '/api/trpc' }),
      ],
    }
  }
})
```

### FastAPI Interactive Docs

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

### Testing

#### tRPC Testing

```typescript
import { createInnerTRPCContext } from '@/server/api/trpc'
import { appRouter } from '@/server/api/root'

const ctx = createInnerTRPCContext({ user: mockUser })
const caller = appRouter.createCaller(ctx)

const summary = await caller.summary.create({ 
  url: 'https://youtube.com/watch?v=test' 
})
```

#### FastAPI Testing

```python
from fastapi.testclient import TestClient
from api.index import app

client = TestClient(app)

def test_create_summary():
    response = client.post(
        "/api/summarize",
        json={"url": "https://youtube.com/watch?v=test", "userId": "test"},
        headers={"Authorization": "Bearer test-token"}
    )
    assert response.status_code == 200
```

---

*Last Updated: January 9, 2025 | Version: 2.0*  
*Unified API documentation consolidating tRPC, FastAPI, examples, and operational guidance*

**📞 API Support**: For technical integration questions, refer to the relevant sections above or contact the development team.
