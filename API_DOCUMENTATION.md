# API Documentation

Complete API reference for Sightline.ai platform covering both tRPC procedures (frontend-backend communication) and FastAPI endpoints (AI processing backend).

## 📚 Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [tRPC API Reference](#trpc-api-reference)
  - [Summary Router](#summary-router)
  - [Library Router](#library-router)
  - [Auth Router](#auth-router)
  - [Billing Router](#billing-router)
  - [Share Router](#share-router)
- [FastAPI Reference](#fastapi-reference)
  - [Summarization Endpoints](#summarization-endpoints)
  - [Progress Tracking](#progress-tracking)
  - [Health Monitoring](#health-monitoring)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)

## Overview

The Sightline.ai platform uses a dual API architecture:

1. **tRPC Layer**: Type-safe API for frontend-backend communication (database operations, user management)
2. **FastAPI Layer**: High-performance Python backend for AI processing and video analysis

### Architecture Flow

```text
Frontend → tRPC Router → Database (User Data)
Frontend → tRPC Router → FastAPI → AI Services → Database (Summary Content)
```

### Base URLs

- **Development**: `http://localhost:3000` (tRPC), `http://localhost:8000` (FastAPI)
- **Production**: `https://sightline.ai` (tRPC), `https://sightline.ai/api` (FastAPI)

## Authentication

### tRPC Authentication

tRPC uses Clerk for authentication with JWT tokens:

```typescript
// Protected procedures require authentication
const user = await api.auth.getCurrentUser.useQuery()

// Public procedures (anonymous access)
const summary = await api.summary.createAnonymous.mutate({
  url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
  browserFingerprint: "fp_abc123"
})
```

### FastAPI Authentication

FastAPI endpoints use JWT validation for protected routes:

```python
# Headers for authenticated requests
headers = {
    "Authorization": f"Bearer {jwt_token}",
    "Content-Type": "application/json"
}
```

---

# tRPC API Reference

Type-safe API procedures for frontend-backend communication with automatic TypeScript inference.

## Summary Router

Handles video summarization operations with anonymous and authenticated access patterns.

### `createAnonymous`

Create video summary for anonymous users without authentication.

```typescript
api.summary.createAnonymous.mutate(input)
```

**Input Schema:**
```typescript
{
  url: string              // YouTube URL (validated, max 2048 chars)
  browserFingerprint: string  // Browser fingerprint for anonymous tracking
}
```

**Response:**
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

**Example:**
```typescript
const { data } = await api.summary.createAnonymous.useMutation()

const summary = await data.mutateAsync({
  url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  browserFingerprint: 'fp_' + Math.random().toString(36)
})

console.log(summary.task_id) // Use for progress tracking
```

**Error Codes:**
- `FORBIDDEN`: User already created anonymous summary
- `BAD_REQUEST`: Invalid YouTube URL or suspicious content
- `INTERNAL_SERVER_ERROR`: Backend processing failure

### `create`

Create video summary for authenticated users.

```typescript
api.summary.create.mutate(input)
```

**Input Schema:**
```typescript
{
  url: string          // YouTube URL (validated)
  title?: string       // Optional custom title
  isPublic?: boolean   // Public sharing (default: false)
}
```

**Response:**
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

**Usage Limits:**
- Free Plan: 3 summaries total (lifetime)
- Pro Plan: 25 summaries/month
- Complete Plan: Unlimited

### `getById`

Retrieve specific summary by ID with access control.

```typescript
api.summary.getById.useQuery({ id: string })
```

**Response:**
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

### `update`

Update summary metadata (title, public status).

```typescript
api.summary.update.mutate(input)
```

**Input Schema:**
```typescript
{
  id: string
  title?: string
  isPublic?: boolean
}
```

### `delete`

Delete user's summary with cascading cleanup.

```typescript
api.summary.delete.mutate({ id: string })
```

**Response:**
```typescript
{
  success: true
  deletedId: string
}
```

---

## Library Router

Personal library management with advanced filtering and Smart Collections integration.

### `getAll`

Get user's summaries with comprehensive filtering and pagination.

```typescript
api.library.getAll.useQuery(input)
```

**Input Schema:**
```typescript
{
  limit?: number        // 1-100, default: 20
  cursor?: string       // Pagination cursor
  search?: string       // Search title, channel, content
  sortBy?: 'date' | 'title' | 'duration' | 'channel'  // default: 'date'
  sortOrder?: 'asc' | 'desc'  // default: 'desc'
  dateRange?: 'day' | 'week' | 'month' | 'year'
  durationRange?: 'short' | 'medium' | 'long'
  categories?: string[] // Smart Collections categories
  tags?: string[]       // Smart Collections tags
}
```

**Response:**
```typescript
{
  items: Summary[]
  nextCursor?: string   // For pagination
  totalCount: number
}
```

**Example with Smart Collections:**
```typescript
const { data } = await api.library.getAll.useQuery({
  categories: ['Technology', 'Programming'],
  tags: ['React', 'TypeScript'],
  sortBy: 'date',
  limit: 10
})

// Pagination
const nextPage = await api.library.getAll.useQuery({
  cursor: data.nextCursor,
  limit: 10
})
```

### `getStats`

Get user's library statistics and usage metrics.

```typescript
api.library.getStats.useQuery()
```

**Response:**
```typescript
{
  totalSummaries: number
  summariesThisMonth: number
  planLimit: number | null  // null for unlimited
  remainingThisMonth: number
  topCategories: Array<{
    name: string
    count: number
  }>
  topTags: Array<{
    name: string
    type: string
    count: number
  }>
}
```

### `getTags`

Get all tags for Smart Collections filtering.

```typescript
api.library.getTags.useQuery()
```

**Response:**
```typescript
Array<{
  id: string
  name: string
  type: 'PERSON' | 'COMPANY' | 'TECHNOLOGY' | 'PRODUCT' | 'CONCEPT' | 'FRAMEWORK' | 'TOOL'
  count: number        // Usage count in user's library
  color: string        // UI color code
}>
```

### `getCategories`

Get all categories for Smart Collections filtering.

```typescript
api.library.getCategories.useQuery()
```

**Response:**
```typescript
Array<{
  id: string
  name: string
  count: number        // Usage count in user's library
}>
```

---

## Auth Router

User management, profile settings, and account operations.

### `getCurrentUser`

Get current user profile and subscription status.

```typescript
api.auth.getCurrentUser.useQuery()
```

**Response:**
```typescript
{
  id: string
  email: string
  firstName?: string
  lastName?: string
  profileImageUrl?: string
  plan: 'FREE' | 'PRO' | 'COMPLETE'
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing'
  summaryCount: number
  planLimit: number | null
  createdAt: Date
}
```

### `updateProfile`

Update user profile information.

```typescript
api.auth.updateProfile.mutate(input)
```

**Input Schema:**
```typescript
{
  firstName?: string
  lastName?: string
  notificationPreferences?: {
    email: boolean
    summaryComplete: boolean
    weeklyDigest: boolean
  }
}
```

### `exportUserData`

Export all user data in JSON format (GDPR compliance).

```typescript
api.auth.exportUserData.mutate()
```

**Response:**
```typescript
{
  user: UserProfile
  summaries: Summary[]
  subscriptions: Subscription[]
  exportedAt: Date
  format: 'json'
}
```

### `deleteAccount`

Permanently delete user account and all associated data.

```typescript
api.auth.deleteAccount.mutate({ confirmation: 'DELETE_MY_ACCOUNT' })
```

**Response:**
```typescript
{
  success: true
  deletedAt: Date
  message: string
}
```

---

## Billing Router

Stripe integration for subscription management and payment processing.

### `getSubscription`

Get current subscription details and payment status.

```typescript
api.billing.getSubscription.useQuery()
```

**Response:**
```typescript
{
  id: string
  plan: 'FREE' | 'PRO' | 'COMPLETE'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  priceId: string
  amount: number        // Amount in cents
  interval: 'month' | 'year'
}
```

### `createCheckoutSession`

Create Stripe checkout session for subscription upgrade.

```typescript
api.billing.createCheckoutSession.mutate(input)
```

**Input Schema:**
```typescript
{
  priceId: string      // Stripe price ID
  successUrl: string   // Post-payment redirect URL
  cancelUrl: string    // Cancellation redirect URL
}
```

**Response:**
```typescript
{
  sessionId: string
  url: string          // Stripe checkout URL
}
```

**Example:**
```typescript
const { sessionId, url } = await createCheckoutSession({
  priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  successUrl: `${window.location.origin}/billing?success=true`,
  cancelUrl: `${window.location.origin}/billing?canceled=true`
})

// Redirect to Stripe Checkout
window.location.href = url
```

### `createPortalSession`

Create Stripe customer portal session for subscription management.

```typescript
api.billing.createPortalSession.mutate()
```

**Response:**
```typescript
{
  url: string          // Stripe portal URL
}
```

---

## Share Router

Public sharing functionality for summaries.

### `create`

Create public share link for summary.

```typescript
api.share.create.mutate(input)
```

**Input Schema:**
```typescript
{
  summaryId: string
  expiresAt?: Date     // Optional expiration
}
```

**Response:**
```typescript
{
  id: string
  slug: string         // Unique share identifier
  summaryId: string
  createdAt: Date
  expiresAt?: Date
  shareUrl: string     // Full public URL
}
```

### `getBySlug`

Get shared summary by public slug.

```typescript
api.share.getBySlug.useQuery({ slug: string })
```

**Response:**
```typescript
{
  summary: {
    videoTitle: string
    channelName: string
    content: string
    keyMoments?: string
    createdAt: Date
  }
  viewCount: number
  isExpired: boolean
}
```

---

# FastAPI Reference

High-performance Python backend for AI processing and video analysis.

## Summarization Endpoints

### `POST /api/summarize`

Main video summarization endpoint with real-time progress tracking.

**Request Body:**
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

**Response:**
```json
{
  "video_id": "dQw4w9WgXcQ",
  "video_url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "video_title": "Example Video Title",
  "channel_name": "Example Channel",
  "channel_id": "UC_example",
  "duration": 600,
  "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "summary": {
    "content": "Structured summary content...",
    "key_points": ["Point 1", "Point 2", "Point 3"],
    "key_moments": "Timestamped key moments...",
    "frameworks": [...],
    "playbooks": [...],
    "tools": [...],
    "sentiment": "positive",
    "novelty_score": 4
  },
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "metadata": {
    "processing_time": 23.5,
    "model": "gpt-4o-mini",
    "transcript_length": 15420
  }
}
```

**Processing Stages:**
1. `Initializing...` (5%)
2. `Connecting to YouTube...` (10%)
3. `Fetching video information...` (25%)
4. `Downloading transcript...` (40%)
5. `Analyzing content with AI...` (60%)
6. `Generating your summary...` (80%)
7. `Summary ready!` (100%)

**Error Responses:**
```json
{
  "error": "Could not retrieve transcript for this video",
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "details": "The video may not have captions available"
}
```

### `POST /api/test-summarize`

Testing endpoint for API validation (development only).

**Request Body:**
```json
{
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response:**
```json
{
  "status": "test_success",
  "url": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "message": "Test endpoint working"
}
```

---

## Progress Tracking

Real-time progress monitoring for long-running summarization tasks.

### `GET /api/progress/{task_id}`

Get current progress status for a task.

**Parameters:**
- `task_id`: UUID string from summarization request

**Response:**
```json
{
  "progress": 60,
  "stage": "Analyzing content with AI...",
  "status": "processing",
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Status Values:**
- `processing`: Task in progress
- `completed`: Task finished successfully
- `error`: Task failed with error

**Example Usage:**
```javascript
// Poll progress every 2 seconds
const pollProgress = async (taskId) => {
  const response = await fetch(`/api/progress/${taskId}`)
  const progress = await response.json()
  
  if (progress.status === 'completed') {
    console.log('Summary ready!')
    return progress
  } else if (progress.status === 'error') {
    console.error('Summarization failed:', progress.stage)
    return progress
  } else {
    console.log(`Progress: ${progress.progress}% - ${progress.stage}`)
    setTimeout(() => pollProgress(taskId), 2000)
  }
}
```

### `DELETE /api/progress/{task_id}`

Clean up completed progress data to prevent memory leaks.

**Response:**
```json
{
  "status": "cleaned"
}
```

---

## Health Monitoring

System health and status endpoints for monitoring and diagnostics.

### `GET /api/health`

Basic health check for API availability.

**Response:**
```json
{
  "status": "healthy",
  "service": "sightline-api",
  "timestamp": "2025-01-09T10:30:00Z",
  "version": "0.1.0"
}
```

### `GET /api`

API root endpoint with version information.

**Response:**
```json
{
  "message": "Sightline API",
  "version": "0.1.0",
  "docs_url": "/docs",
  "status": "operational"
}
```

---

# Error Handling

## tRPC Error Codes

tRPC uses standardized error codes with descriptive messages:

```typescript
try {
  const summary = await api.summary.create.mutate({ url: invalidUrl })
} catch (error) {
  if (error.data?.code === 'BAD_REQUEST') {
    console.error('Invalid input:', error.message)
  } else if (error.data?.code === 'UNAUTHORIZED') {
    console.error('Authentication required')
  } else if (error.data?.code === 'FORBIDDEN') {
    console.error('Plan limit exceeded')
  }
}
```

**Common Error Codes:**
- `BAD_REQUEST`: Invalid input parameters
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Access denied or limits exceeded
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource already exists
- `INTERNAL_SERVER_ERROR`: Server processing error

## FastAPI Error Responses

FastAPI returns structured error responses:

```json
{
  "error": "Invalid YouTube URL",
  "detail": "URL must be a valid YouTube video link",
  "status_code": 400,
  "task_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**HTTP Status Codes:**
- `400`: Bad Request (invalid input)
- `404`: Not Found (resource missing)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error (processing failure)

---

# Rate Limiting

## Anonymous Users
- **Limit**: 1 summary per browser fingerprint + IP address
- **Reset**: Never (lifetime limit)
- **Bypass**: User registration and authentication

## Authenticated Users

### Free Plan
- **Limit**: 3 summaries total (lifetime)
- **Reset**: Never
- **Upgrade**: Pro plan ($9.99/month)

### Pro Plan
- **Limit**: 25 summaries per month
- **Reset**: Monthly on billing cycle start
- **Overage**: Blocked until next cycle

### Complete Plan
- **Limit**: Unlimited summaries
- **Reset**: N/A

## Rate Limit Headers

Responses include rate limit information:

```http
X-RateLimit-Limit: 25
X-RateLimit-Remaining: 18
X-RateLimit-Reset: 1704412800
X-RateLimit-Window: month
```

---

# Examples

## Complete Summary Creation Flow

```typescript
import { api } from '@/lib/trpc'

// 1. Create summary for authenticated user
const createSummary = async (url: string) => {
  try {
    // Start summarization
    const summary = await api.summary.create.mutate({ url })
    console.log('Summary created:', summary.id)
    console.log('Task ID for tracking:', summary.task_id)
    
    // 2. Track progress
    const pollProgress = async () => {
      const progress = await fetch(`/api/progress/${summary.task_id}`)
        .then(r => r.json())
      
      console.log(`${progress.progress}% - ${progress.stage}`)
      
      if (progress.status === 'completed') {
        // 3. Fetch updated summary with AI content
        const updatedSummary = await api.summary.getById.useQuery({ 
          id: summary.id 
        })
        console.log('Summary ready:', updatedSummary)
        return updatedSummary
      } else if (progress.status === 'processing') {
        setTimeout(pollProgress, 2000)
      } else {
        throw new Error(progress.stage)
      }
    }
    
    return pollProgress()
    
  } catch (error) {
    console.error('Summarization failed:', error)
    throw error
  }
}

// Usage
createSummary('https://youtube.com/watch?v=dQw4w9WgXcQ')
  .then(summary => console.log('Complete!', summary))
  .catch(error => console.error('Error:', error))
```

## Library Management with Smart Collections

```typescript
// Get filtered library with Smart Collections
const { data: library } = await api.library.getAll.useQuery({
  categories: ['Technology', 'Programming'],
  tags: ['React', 'TypeScript'],
  search: 'hooks',
  sortBy: 'date',
  limit: 20
})

// Get available tags for filtering
const { data: tags } = await api.library.getTags.useQuery()
const reactTags = tags?.filter(tag => 
  tag.name.toLowerCase().includes('react')
)

// Get user statistics
const { data: stats } = await api.library.getStats.useQuery()
console.log(`Using ${stats.summariesThisMonth}/${stats.planLimit} summaries`)
```

## Anonymous User Flow

```typescript
// Generate browser fingerprint
const browserFingerprint = 'fp_' + btoa(
  navigator.userAgent + 
  screen.width + 
  screen.height + 
  new Date().getTimezoneOffset()
).slice(0, 16)

// Create anonymous summary
try {
  const summary = await api.summary.createAnonymous.mutate({
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    browserFingerprint
  })
  
  console.log('Anonymous summary created:', summary.id)
  console.log('Sign up to save this summary!')
  
} catch (error) {
  if (error.data?.code === 'FORBIDDEN') {
    console.log('You already used your free summary. Please sign up!')
  }
}
```

## Subscription Management

```typescript
// Check current subscription
const { data: subscription } = await api.billing.getSubscription.useQuery()

if (subscription.plan === 'FREE') {
  // Upgrade to Pro
  const { url } = await api.billing.createCheckoutSession.mutate({
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    successUrl: `${window.location.origin}/billing?success=true`,
    cancelUrl: `${window.location.origin}/billing`
  })
  
  // Redirect to Stripe Checkout
  window.location.href = url
}

// Manage existing subscription
if (subscription.plan === 'PRO') {
  const { url: portalUrl } = await api.billing.createPortalSession.mutate()
  window.open(portalUrl, '_blank')
}
```

---

## API Versioning

Current API version: **v1** (stable)

All endpoints include version information in responses. Breaking changes will increment the major version number with proper migration guides provided in the [CHANGELOG.md](CHANGELOG.md).

## Support

- **Bug Reports**: [Bug Tracking](Docs/Bug_tracking.md)
- **Feature Requests**: GitHub Issues
- **API Questions**: [GitHub Discussions](https://github.com/sightline-ai/sightline/discussions)
- **Security Issues**: security@sightline.ai

---

*Last Updated: January 9, 2025*