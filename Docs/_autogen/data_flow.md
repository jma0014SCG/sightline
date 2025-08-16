# Data Flow Analysis - Sightline.ai

Generated: 2025-08-15

## Request Flow: Landing Page → Summary Creation → Display

### 1. Landing Page URL Input
**File**: [`src/app/page.tsx`](../../src/app/page.tsx) (Lines 100-250)

User enters YouTube URL → URLInput component → triggers summarization

```
User Action: Enter URL
    ↓
Component: URLInput [src/components/molecules/URLInput/URLInput.tsx:50-150]
    ↓
Hook: useMutation [api.summary.createAnonymous or api.summary.create]
```

### 2. tRPC Router Processing
**File**: [`src/server/api/routers/summary.ts`](../../src/server/api/routers/summary.ts)

#### Anonymous User Flow (Lines 416-800)
```
Procedure: createAnonymous
    ↓
1. Browser fingerprint check [Lines 430-450]
2. Anonymous user lookup/creation [Lines 460-490]
3. Usage limit validation [Lines 500-520]
4. Call Python API [Lines 550-650]
5. Store summary in DB [Lines 700-780]
```

#### Authenticated User Flow (Lines 104-400)
```
Procedure: create
    ↓
1. User authentication check [Lines 110-120]
2. Usage limit validation [Lines 130-180]
3. Duplicate check [Lines 190-210]
4. Call Python API [Lines 250-350]
5. Store summary in DB [Lines 360-390]
```

### 3. Python FastAPI Processing
**File**: [`api/index.py`](../../api/index.py)

#### Main Summarization Endpoint (Lines 131-290)
```
POST /api/summarize
    ↓
1. Task ID generation [Lines 135-140]
2. Progress initialization [Lines 142-150]
3. Transcript extraction [Lines 160-200]
    → Fallback chain:
      a. YouTube API [api/services/youtube_service.py]
      b. YT-DLP [api/services/ytdlp_service.py]
      c. Oxylabs [api/services/oxylabs_service.py]
      d. Gumloop [api/services/gumloop_service.py]
4. AI Summarization [Lines 210-250]
    → LangChain + OpenAI [api/services/langchain_service.py]
5. Progress updates [Lines 260-280]
6. Return response [Lines 285-290]
```

#### Progress Tracking (Lines 64-90)
```
GET /api/progress/{task_id}
    ↓
1. Retrieve from memory store [Lines 70-75]
2. Return progress data [Lines 80-90]
```

### 4. Progress Monitoring
**File**: [`src/lib/hooks/useProgressTracking.ts`](../../src/lib/hooks/useProgressTracking.ts) (Lines 20-120)

```
Hook: useProgressTracking
    ↓
1. Poll /api/progress/{taskId} [Lines 40-60]
2. Update UI with progress [Lines 70-90]
3. Handle completion/error [Lines 100-120]
```

### 5. Database Storage
**File**: [`prisma/schema.prisma`](../../prisma/schema.prisma)

#### Summary Model (Lines 44-115)
```
Summary Table:
- Core fields [Lines 45-56]: id, userId, videoId, content
- YouTube metadata [Lines 59-63]: viewCount, likeCount, uploadDate
- Rich content [Lines 70-82]: keyMoments, frameworks, playbooks
- User interaction [Lines 89-93]: notes, rating, favorite
```

### 6. Summary Display
**File**: [`src/app/(dashboard)/library/[id]/page.tsx`](../../src/app/(dashboard)/library/[id]/page.tsx) (Lines 20-150)

```
Page: Summary Detail
    ↓
1. Fetch summary by ID [Lines 30-40]
2. Render SummaryViewer [Lines 100-140]
```

**File**: [`src/components/organisms/SummaryViewer/SummaryViewer.tsx`](../../src/components/organisms/SummaryViewer/SummaryViewer.tsx) (Lines 100-800)

```
Component: SummaryViewer
    ↓
1. Parse content sections [Lines 150-250]
2. Render MainContentColumn [Lines 400-500]
3. Render KeyMomentsSidebar [Lines 510-550]
4. Render ActionsSidebar [Lines 560-600]
5. Render LearningHubTabs [Lines 610-700]
```

## API Communication Flow

### Frontend → tRPC → Backend

```
Browser
    ↓
[TRPCProvider] src/components/providers/TRPCProvider.tsx
    ↓
[tRPC Client] src/lib/api/trpc.ts:20-50
    ↓
[HTTP Request] POST /api/trpc/summary.create
    ↓
[tRPC Route Handler] src/app/api/trpc/[trpc]/route.ts:10-30
    ↓
[tRPC Router] src/server/api/routers/summary.ts
    ↓
[Fetch to Python] fetch("http://localhost:8000/api/summarize")
    ↓
[FastAPI] api/index.py:131-290
    ↓
[AI Processing] api/services/langchain_service.py
    ↓
[Response] Back through the chain
```

## Authentication Flow

### Clerk Integration

```
User Action: Sign In
    ↓
[SignInModal] src/components/modals/SignInModal.tsx:20-100
    ↓
[Clerk Provider] src/app/layout.tsx:50-60
    ↓
[Webhook] src/app/api/webhooks/clerk/route.ts:20-80
    ↓
[User Sync] Create/Update user in database
    ↓
[Session] JWT stored in cookies
    ↓
[Protected Routes] src/server/api/trpc.ts:80-120
```

## Payment Flow

### Stripe Subscription

```
User Action: Upgrade
    ↓
[Upgrade Page] src/app/upgrade/page.tsx:50-200
    ↓
[tRPC] api.billing.createCheckoutSession
    ↓
[Stripe Checkout] Redirect to Stripe
    ↓
[Webhook] src/app/api/webhooks/stripe/route.ts:30-150
    ↓
[Database Update] Update user plan & limits
    ↓
[Success Page] src/app/upgrade/success/page.tsx
```

## Share Flow

### Public Summary Sharing

```
Create Share Link:
[Summary Page] → [ShareModal] → api.share.create → [Database]
    ↓
Generate unique slug
    ↓
Store in ShareLink table

Access Shared Summary:
[Public URL] /share/[slug]
    ↓
[Share Page] src/app/share/[slug]/page.tsx:20-100
    ↓
api.share.getBySlug (public procedure)
    ↓
Render SummaryViewer (read-only mode)
```

## Error Handling Flow

### Multi-Layer Error Handling

```
1. Frontend Try-Catch
   [Component] → try/catch → Toast notification

2. tRPC Error Handling
   [Router] → TRPCError → Formatted response

3. Python API Fallbacks
   [Service A] → fail → [Service B] → fail → [Service C]

4. Sentry Integration
   [Any Error] → Sentry.captureException → Dashboard
```

## Performance Optimization Points

### Caching Layers

```
1. Browser Cache
   - TanStack Query cache (5 minutes default)
   - localStorage for preferences

2. API Response Cache
   - tRPC response caching
   - Vercel Edge caching

3. Database Query Optimization
   - Indexed queries (userId, videoId)
   - Pagination for large lists

4. CDN Assets
   - Static files on Vercel CDN
   - Image optimization via Next.js
```

## Security Checkpoints

### Request Validation

```
1. Input Validation
   [Zod Schema] → Validate → Process

2. Authentication
   [Clerk JWT] → Verify → Allow/Deny

3. Rate Limiting
   [IP + Fingerprint] → Check limits → Allow/Deny

4. CORS & CSP
   [Next.js Headers] → Security policies

5. Webhook Verification
   [Signature Check] → Verify source → Process
```

## Data Transformation Pipeline

### YouTube URL → Rich Summary

```
Input: https://youtube.com/watch?v=xyz
    ↓
1. Extract Video ID: "xyz"
    ↓
2. Fetch Metadata:
   - Title, channel, duration
   - View count, upload date
    ↓
3. Extract Transcript:
   - Try multiple services
   - Clean and format text
    ↓
4. AI Processing:
   - Generate TL;DR
   - Extract key points
   - Identify frameworks
   - Create learning materials
    ↓
5. Smart Collections:
   - Extract entities (people, companies)
   - Assign categories
   - Generate tags
    ↓
6. Store in Database:
   - Structured data
   - Searchable fields
   - Rich content JSON
    ↓
Output: Complete Summary Object
```

## Real-time Progress Updates

### WebSocket-like Polling

```
Frontend:
1. Start polling on task creation
2. Poll every 2 seconds
3. Update UI with progress

Backend:
1. Store progress in memory
2. Update at each stage:
   - Initializing (0%)
   - Fetching metadata (20%)
   - Extracting transcript (40%)
   - Analyzing content (60%)
   - Generating summary (80%)
   - Finalizing (100%)
3. Auto-cleanup after 4 hours
```

## Anonymous User Journey

### Browser Fingerprint → Claimed Summaries

```
1. First Visit (Anonymous):
   - Generate browser fingerprint
   - Create ANONYMOUS_USER entry
   - Allow 1 free summary
   - Store with anonymous userId

2. Sign Up:
   - Create real user account
   - Maintain fingerprint association

3. Claim Process:
   - Match fingerprint
   - Transfer summaries to real user
   - Update userId in database
```