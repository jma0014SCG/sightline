---
title: "System Architecture"
description: "Technical architecture, data flow patterns, and system dependencies for Sightline.ai platform"
type: "reference"
canonical_url: "/architecture"
version: "1.2"
last_updated: "2025-01-09"
authors: ["Architecture Team"]
reviewers: ["Lead Developer"]
tags: ["architecture", "system-design", "technical-reference", "data-flow", "dependencies"]
audience: ["developers", "architects", "contributors"]
complexity: "advanced"
---

## Architecture Overview

**Technical architecture, data flow patterns, and system dependencies for Sightline.ai platform**

## Table of Contents

- [System Overview](#system-overview) - High-level architecture diagram
- [Data Flow](#data-flow) - User interaction and processing flows
- [Core Components](#core-components) - Frontend, backend, and database layers
- [External Dependencies](#external-dependencies) - Third-party services and APIs
- [Security Architecture](#security) - Authentication, authorization, and protection
- [Performance Characteristics](#performance) - Scaling and optimization patterns
- [Development Architecture](#development-architecture) - Developer tools and workflows
- [ADR Reference](#adrs-reference) - Links to architectural decisions
- [Summary](#architecture-summary) - Key takeaways

---

## System Overview {#system-overview}

Sightline.ai implements a modern full-stack architecture following Next.js 14 App Router patterns,
tRPC type-safe APIs, and FastAPI async patterns for optimal performance and developer experience.

```text
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │  Next.js 14 │    │    tRPC     │    │ PostgreSQL  │
│             ├────┤  Frontend   ├────┤     API     ├────┤  Database   │
│   React     │    │             │    │             │    │   (Neon)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
                                    ┌─────────────┐    ┌─────────────┐
                                    │  FastAPI    │    │   OpenAI    │
                                    │  Backend    ├────┤     API     │
                                    │  (Python)   │    │             │
                                    └─────────────┘    └─────────────┘
```

### Architecture Principles

- **Type Safety**: End-to-end TypeScript with tRPC providing compile-time API validation and Zod schemas
- **Performance**: Next.js 14 App Router with Server Components, streaming, and edge deployment
- **Scalability**: Serverless-first FastAPI with async processing and horizontal scaling
- **Reliability**: React Error Boundaries, graceful degradation, and comprehensive error handling
- **Security**: JWT validation with Clerk, CORS policies, rate limiting, and input sanitization
- **Developer Experience**: Type inference, hot reloading, and comprehensive tooling integration

## Data Flow {#data-flow}

### 1. User Summary Creation

```text
User Input (YouTube URL) 
    ↓
Next.js Frontend Validation
    ↓
tRPC API (summary.create/createAnonymous)
    ↓
Usage Limit Validation & Browser Fingerprinting
    ↓
FastAPI Backend (/api/summarize) → Returns task_id
    ↓
Progress Tracking Initialization (5%)
    ↓
Multi-Service Transcript Acquisition (25%)
    ↓ 
OpenAI Processing (LangChain + GPT-4) (60%)
    ↓
Smart Collections Classification
    ↓
PostgreSQL Storage
    ↓
Progress Completion (100%)
    ↓
Real-time Progress Updates (via /api/progress/{task_id})
    ↓
Frontend Display with useProgressTracking Hook
```

### 2. Authentication Flow

```text
Anonymous User
    ↓
Browser Fingerprinting (clientside)
    ↓
Anonymous Summary Creation (1 limit)
    ↓
Clerk Modal Authentication (optional)
    ↓
Account Creation & Verification
    ↓
Summary Claiming & Library Access
    ↓
Plan-based Usage Limits
```

### 3. Smart Collections Processing

Smart Collections automatically analyze and categorize video summaries using AI, enabling users to filter
and organize their content library intelligently. The system uses OpenAI's API to extract entities,
topics, and themes from video content.

**Data Flow Pipeline**:

```text
Video Content Analysis
    ↓
OpenAI Entity Extraction (GPT-4)
    ↓
7 Entity Types Classification:
├── PERSON (individuals, experts)
├── COMPANY (organizations, brands)
├── TECHNOLOGY (programming languages, platforms)
├── PRODUCT (specific products, apps)
├── CONCEPT (methodologies, principles)
├── FRAMEWORK (libraries, systems)
└── TOOL (software, applications)
    ↓
Category Assignment (14 predefined categories)
    ↓
Database Association & UI Display
```

#### Core Features

- **Automatic Classification**: New summaries are automatically analyzed and tagged
- **7 Tag Types**: PERSON, COMPANY, TECHNOLOGY, PRODUCT, CONCEPT, FRAMEWORK, TOOL
- **Predefined Categories**: Productivity, Technology, Business, Marketing, Finance, Health, etc.
- **Smart Filtering**: Filter library by tags and categories with visual counts
- **Color-Coded Tags**: Each tag type has a distinct color for easy recognition
- **Graceful Fallbacks**: Works even if OpenAI API is unavailable

#### Architecture Components

##### 1. Classification Service (`/src/lib/classificationService.ts`)

- **OpenAI Integration**: Uses GPT-4 for content analysis with structured JSON output
- **Lazy Loading**: OpenAI client initialized only when needed to prevent module failures  
- **Entity Extraction**: Identifies people, companies, technologies, concepts, etc.
- **Category Assignment**: Maps content to predefined categories
- **Database Integration**: Automatically creates and associates tags/categories
- **Error Resilience**: Classification failures don't break summary creation

##### 2. Database Schema Extensions

```prisma
model Category {
  id        String    @id @default(cuid())
  name      String    @unique
  summaries Summary[] @relation("SummaryCategories")
}

model Tag {
  id        String    @id @default(cuid())
  name      String    @unique
  type      String    // PERSON, COMPANY, TECHNOLOGY, etc.
  summaries Summary[] @relation("SummaryTags")
}
```

##### 3. Enhanced UI Components

- **LibraryControls**: Smart filtering sidebar with tag/category counts
- **SummaryCard**: Color-coded tag badges with overflow handling
- **Smart Filtering**: Real-time filter updates with preserved state

##### 4. API Integration Patterns

- **Summary Router**: Automatic classification during summary creation
- **Library Router**: Tag and category queries for filtering
- **Fire-and-Forget**: Classification runs asynchronously to not block UX

#### Usage Workflow

1. **User creates summary** → Video content is processed
2. **Classification triggered** → OpenAI analyzes content and generates tags/categories  
3. **Database updated** → Tags and categories are created and associated
4. **UI displays results** → Colored badges appear on summary cards
5. **Filtering enabled** → Users can filter by tags/categories in sidebar

#### Tag Type System

- **PERSON**: Blue badges - Individual people, influencers, experts
- **COMPANY**: Green badges - Organizations, businesses, brands  
- **TECHNOLOGY**: Orange badges - Technologies, programming languages, platforms
- **PRODUCT**: Pink badges - Specific products, apps, services
- **CONCEPT**: Indigo badges - Abstract concepts, methodologies, principles
- **FRAMEWORK**: Yellow badges - Frameworks, libraries, systems
- **TOOL**: Teal badges - Tools, software, applications

#### Performance Characteristics

- **Classification Time**: 2-5 seconds per summary (non-blocking)
- **Accuracy Rate**: ~85% entity extraction accuracy
- **API Usage**: ~500-1000 tokens per classification
- **Caching Strategy**: Common entities cached to reduce API calls
- **Parallel Processing**: Runs alongside summary generation when possible

#### Error Handling and Resilience

- **OpenAI API Failures**: Logged but don't break summary creation
- **Missing API Key**: Service gracefully skips classification
- **Database Errors**: Individual classification failures are isolated
- **UI Fallbacks**: Components handle missing classification data gracefully
- **Retry Logic**: Automatic retry for transient failures
- **Degraded Mode**: System operates without classification if service unavailable

## Core Components {#core-components}

### Frontend Architecture (Next.js 14 + App Router)

**Technology Stack**:

- **Next.js 14**: App Router with Server Components and Client Components
- **TypeScript**: Strict type checking with comprehensive interfaces
- **Tailwind CSS + shadcn/ui**: Utility-first CSS with accessible components
- **TanStack Query + tRPC**: Type-safe data fetching with optimistic updates
- **Clerk**: Modal-based authentication with social providers

#### Next.js 14 App Router Best Practices

**Server vs Client Component Strategy**:

```typescript
// Server Component (default) - runs on server, no hydration
export default async function LibraryPage() {
  // Direct database/API calls allowed
  const summaries = await api.library.getAll()
  return <SummaryList summaries={summaries} />
}

// Client Component - requires 'use client' directive
'use client'
export default function InteractiveComponent() {
  const [state, setState] = useState()
  const { data, mutate } = api.summary.create.useMutation()
  // Client-side features: hooks, event handlers, state
  return <InteractiveUI />
}
```

**File Structure Conventions**:

```text
src/app/
├── (auth)/                    # Route Groups (organizational only)
│   ├── login/page.tsx        # Route: /login
│   └── signup/page.tsx       # Route: /signup
├── _components/              # Private Folder (not routed)
│   └── shared-components/
├── api/                      # API Routes
│   ├── trpc/[trpc]/route.ts # tRPC handler
│   └── webhooks/            # Webhook endpoints
├── library/
│   ├── [id]/
│   │   ├── page.tsx         # Dynamic route: /library/[id]
│   │   ├── edit/page.tsx    # Nested route: /library/[id]/edit
│   │   ├── loading.tsx      # Loading UI for this segment
│   │   └── error.tsx        # Error boundary for this segment
│   ├── layout.tsx           # Nested layout for library section
│   └── page.tsx             # Route: /library
├── globals.css              # Global styles
├── layout.tsx               # Root layout (required)
└── page.tsx                 # Route: / (home page)
```

**Error Boundaries Implementation**:

```typescript
// app/error.tsx - Segment-level error boundary
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error boundary caught:', error)
  }, [error])

  return (
    <div className="error-container">
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )
}

// app/global-error.tsx - Application-level error boundary
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Application Error</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  )
}
```

**Performance Optimization Techniques**:

```typescript
// Dynamic imports for code splitting
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
})

// Image optimization
import Image from 'next/image'

export default function OptimizedImage() {
  return (
    <Image
      src="/image.jpg"
      alt="Description"
      width={800}
      height={600}
      priority // For LCP images
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  )
}

// Metadata API for SEO
export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Page description',
  openGraph: {
    title: 'OG Title',
    description: 'OG Description',
  },
}
```

**Component Hierarchy**:

```text
App Router Layout
├── Providers (tRPC, Clerk, Toast, Monitoring)
├── Pages (Server Components by default)
│   ├── Landing (/) - Static generation
│   ├── Library (/library) - Dynamic with caching
│   ├── Summary View (/library/[id]) - Dynamic routes
│   └── Settings (/settings) - Protected routes
├── Components (Atomic Design)
│   ├── Atoms (Button, Input, Skeleton)
│   ├── Molecules (URLInput, SummaryCard, LibraryControls)
│   └── Organisms (SummaryViewer, PricingPlans)
└── Modals (SignIn, AuthPrompt) - Client Components
```

**State Management Strategy**:

- **Server State**: TanStack Query with tRPC for API data
- **Client State**: React Context for UI state (modals, progress)
- **Form State**: React Hook Form with Zod validation
- **Optimistic Updates**: tRPC mutations with automatic rollback
- **URL State**: Next.js searchParams for filter/pagination state

### Backend Architecture

#### tRPC API Layer (TypeScript)

**tRPC Setup with Next.js 14 App Router**:

```typescript
// src/server/api/trpc.ts - Core tRPC configuration
import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '@clerk/nextjs/server'
import superjson from 'superjson'
import { ZodError } from 'zod'

// Context creation for each request
export const createTRPCContext = async () => {
  const { userId } = await auth()
  return {
    prisma,
    userId,
    headers: headers(),
  }
}

// Initialize tRPC with SuperJSON transformer
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

// Performance monitoring middleware
const performanceMonitoring = t.middleware(async ({ ctx, next, path, type }) => {
  const startTime = performance.now()
  const endpoint = `${type}:${path}`
  
  try {
    const result = await next()
    const duration = performance.now() - startTime
    monitoring.logApiPerformance(endpoint, duration, 200)
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    monitoring.logApiPerformance(endpoint, duration, 500)
    throw error
  }
})

// Auth middleware with user validation
const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  // Ensure user exists in database
  let user = await ctx.prisma.user.findUnique({
    where: { id: ctx.userId }
  })

  if (!user) {
    user = await ctx.prisma.user.create({
      data: {
        id: ctx.userId,
        email: `temp_${ctx.userId}@placeholder.com`,
      },
    })
  }

  return next({
    ctx: {
      userId: ctx.userId as string,
      user,
      prisma: ctx.prisma,
      headers: ctx.headers,
    },
  })
})

// Procedure definitions
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure.use(performanceMonitoring)
export const protectedProcedure = t.procedure
  .use(performanceMonitoring)
  .use(enforceUserIsAuthed)
```

**Type-Safe Router Implementation**:

```typescript
// src/server/api/routers/summary.ts
import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc'

const createSummarySchema = z.object({
  videoUrl: z.string().url(),
  videoTitle: z.string().optional(),
})

export const summaryRouter = createTRPCRouter({
  // Public procedure for anonymous users
  createAnonymous: publicProcedure
    .input(createSummarySchema)
    .mutation(async ({ input, ctx }) => {
      // Implementation with input validation
      return await createSummary({ ...input, userId: null })
    }),

  // Protected procedure for authenticated users
  create: protectedProcedure
    .input(createSummarySchema)
    .mutation(async ({ input, ctx }) => {
      // Full type safety - ctx.userId is guaranteed to exist
      return await createSummary({ ...input, userId: ctx.userId })
    }),

  // Query with caching
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return ctx.prisma.summary.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: { tags: true, categories: true }
      })
    }),
})
```

**Client-Side Usage Patterns**:

```typescript
// Client Components
'use client'
import { api } from '@/lib/api/trpc'

export default function SummaryForm() {
  const createSummary = api.summary.create.useMutation({
    onSuccess: (data) => {
      // Optimistic updates handled automatically
      router.push(`/library/${data.id}`)
    },
    onError: (error) => {
      // Type-safe error handling
      if (error.data?.zodError) {
        setFieldErrors(error.data.zodError.fieldErrors)
      }
    },
  })

  const { data: summaries, isLoading } = api.library.getAll.useQuery(
    { limit: 10 },
    { staleTime: 1000 * 60 * 5 } // 5 minutes
  )

  return (
    <form onSubmit={(e) => {
      e.preventDefault()
      createSummary.mutate({ videoUrl: url })
    }}>
      {/* Form implementation */}
    </form>
  )
}

// Server Components
export default async function ServerSummaryPage({ params }: { params: { id: string } }) {
  // Direct server-side tRPC calls
  const summary = await api.summary.getById({ id: params.id })
  
  if (!summary) {
    notFound()
  }
  
  return <SummaryDisplay summary={summary} />
}
```

**Router Organization**:

```text
src/server/api/routers/
├── summary.ts - Video summarization endpoints
│   ├── create/createAnonymous - Summary creation
│   ├── getById/getAll - Retrieval with pagination
│   ├── update/delete - Modification operations
│   └── share - Public sharing functionality
├── library.ts - Personal library management
│   ├── getAll - Filtered summary lists
│   ├── getStats - Usage statistics
│   ├── getTags/getCategories - Smart collections
│   └── search - Content search
├── auth.ts - User profile management
│   ├── getCurrentUser - Profile data
│   ├── updateProfile - Settings updates
│   ├── exportData - GDPR compliance
│   └── deleteAccount - Account deletion
├── billing.ts - Stripe integration
│   ├── getSubscription - Plan details
│   ├── createCheckout - Payment sessions
│   └── createPortal - Customer portal
└── share.ts - Public sharing
    ├── create - Generate share links
    ├── getBySlug - Public access
    └── updateViews - Analytics tracking
```

#### FastAPI Processing Layer (Python)

**Async FastAPI Setup with Best Practices**:

```python
# api/index.py - Main application configuration
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import asyncio

# Async lifespan manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logging.info("FastAPI application starting up")
    yield
    # Shutdown
    logging.info("FastAPI application shutting down")

# Create FastAPI app with async lifespan
app = FastAPI(
    title="Sightline AI Processing API",
    description="High-performance AI video summarization backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration with explicit origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://sightline.ai",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

**Async Processing Patterns with LangChain**:

```python
# services/summarization_service.py
import asyncio
from langchain.llms import OpenAI
from langchain.chains import LLMChain
from langchain.schema import BaseOutputParser
from typing import Dict, List, Optional

class AsyncSummarizationService:
    def __init__(self):
        self.llm = OpenAI(
            temperature=0.3,
            max_tokens=2000,
            request_timeout=60
        )
    
    async def create_summary(
        self,
        transcript: str,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, any]:
        """Async summary creation with progress tracking."""
        
        try:
            # Stage 1: Content analysis
            if progress_callback:
                await progress_callback(20, "Analyzing content structure...")
            
            content_analysis = await self._analyze_content_async(transcript)
            
            # Stage 2: Key insights extraction  
            if progress_callback:
                await progress_callback(50, "Extracting key insights...")
            
            insights = await self._extract_insights_async(transcript)
            
            # Stage 3: Summary generation
            if progress_callback:
                await progress_callback(80, "Generating comprehensive summary...")
            
            summary = await self._generate_summary_async(
                transcript, content_analysis, insights
            )
            
            # Stage 4: Classification (non-blocking)
            if progress_callback:
                await progress_callback(95, "Finalizing classification...")
            
            # Run classification in background
            classification_task = asyncio.create_task(
                self._classify_content_async(summary)
            )
            
            return {
                "summary": summary,
                "insights": insights,
                "classification": await classification_task
            }
            
        except Exception as e:
            logging.error(f"Summary creation failed: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def _analyze_content_async(self, transcript: str) -> Dict:
        """Non-blocking content analysis."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self._analyze_content_sync, transcript
        )
    
    async def _extract_insights_async(self, transcript: str) -> List[Dict]:
        """Async insights extraction with batching."""
        # Process in chunks to avoid timeout
        chunks = self._chunk_transcript(transcript, max_tokens=1500)
        
        tasks = [
            self._process_chunk_async(chunk) 
            for chunk in chunks
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions and combine results
        valid_results = [r for r in results if not isinstance(r, Exception)]
        return self._combine_insights(valid_results)
```

**Background Tasks and Progress Tracking**:

```python
# routers/summarize.py
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, HttpUrl
import uuid
import asyncio

router = APIRouter()

# Global progress storage (in production, use Redis)
progress_storage: Dict[str, Dict] = {}

class SummarizeRequest(BaseModel):
    video_url: HttpUrl
    user_id: Optional[str] = None

@router.post("/summarize")
async def create_summary(
    request: SummarizeRequest,
    background_tasks: BackgroundTasks
):
    """Create video summary with real-time progress tracking."""
    
    task_id = str(uuid.uuid4())
    
    # Initialize progress
    progress_storage[task_id] = {
        "progress": 0,
        "stage": "Starting processing...",
        "status": "processing",
        "task_id": task_id
    }
    
    # Start background processing
    background_tasks.add_task(
        process_video_summary,
        task_id,
        request.video_url,
        request.user_id
    )
    
    return {"task_id": task_id, "status": "started"}

async def process_video_summary(
    task_id: str,
    video_url: str,
    user_id: Optional[str]
):
    """Background task for video processing."""
    
    async def update_progress(progress: int, stage: str):
        progress_storage[task_id] = {
            "progress": progress,
            "stage": stage,
            "status": "processing",
            "task_id": task_id
        }
    
    try:
        # Stage 1: Transcript acquisition
        await update_progress(10, "Acquiring video transcript...")
        transcript = await transcript_service.get_transcript(video_url)
        
        # Stage 2: AI processing
        await update_progress(30, "Processing with AI...")
        summary = await summarization_service.create_summary(
            transcript, progress_callback=update_progress
        )
        
        # Stage 3: Database storage
        await update_progress(98, "Saving results...")
        result = await save_summary_to_db(summary, user_id)
        
        # Complete
        progress_storage[task_id] = {
            "progress": 100,
            "stage": "Complete!",
            "status": "completed",
            "task_id": task_id,
            "result": result
        }
        
    except Exception as e:
        progress_storage[task_id] = {
            "progress": 0,
            "stage": f"Error: {str(e)}",
            "status": "failed",
            "task_id": task_id,
            "error": str(e)
        }

@router.get("/progress/{task_id}")
async def get_progress(task_id: str):
    """Get real-time progress for a task."""
    return progress_storage.get(task_id, {
        "progress": 0,
        "stage": "Task not found",
        "status": "unknown",
        "task_id": task_id
    })
```

**Error Handling and Logging**:

```python
# middleware/error_handler.py
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import logging
import traceback

@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except HTTPException as e:
        return JSONResponse(
            status_code=e.status_code,
            content={"error": e.detail, "type": "http_exception"}
        )
    except Exception as e:
        # Log the full traceback
        logging.error(f"Unhandled exception: {traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "type": "server_error",
                "request_id": str(uuid.uuid4())
            }
        )

# Custom exception handlers
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"error": str(exc), "type": "validation_error"}
    )
```

**Project Structure**:

```text
api/
├── index.py - FastAPI app with CORS and middleware
├── routers/
│   ├── summarize.py - Main summarization endpoints
│   ├── transcript.py - Transcript acquisition
│   └── health.py - Health checks and monitoring
├── services/
│   ├── youtube_service.py - YouTube API integration
│   ├── transcript_service.py - Multi-provider transcript fallback
│   ├── summarization_service.py - LangChain + OpenAI processing
│   ├── classification_service.py - Smart tagging
│   └── progress_service.py - Real-time progress tracking
├── models/
│   ├── requests.py - Pydantic request models
│   ├── responses.py - Pydantic response models
│   └── database.py - Database models (if using SQLAlchemy)
├── middleware/
│   ├── error_handler.py - Global error handling
│   ├── rate_limiter.py - Request rate limiting
│   └── logging.py - Request/response logging
└── utils/
    ├── validators.py - Custom validation functions
    ├── helpers.py - Utility functions
    └── constants.py - Application constants
```

### Database Schema

**Core Entities**:

```sql
User {
  id: String (Clerk user ID)
  email: String
  plan: Enum (FREE, PRO, COMPLETE)
  subscriptionStatus: String
  createdAt: DateTime
}

Summary {
  id: String (CUID)
  userId: String (FK -> User.id)
  videoTitle: String
  videoUrl: String
  content: Text (structured AI output)
  keyMoments: Text?
  createdAt: DateTime
}

Tag {
  id: String (CUID)
  name: String (unique)
  type: Enum (PERSON, COMPANY, TECHNOLOGY, etc.)
}

Category {
  id: String (CUID)  
  name: String (unique, predefined set)
}

UsageEvent {
  id: String (CUID)
  userId: String (FK)
  eventType: Enum (SUMMARY_CREATED, SUMMARY_DELETED)
  metadata: Json
  createdAt: DateTime
}
```

**Relationships**:

- User → Summary (1:many)
- Summary ↔ Tag (many:many)
- Summary ↔ Category (many:many)
- User → UsageEvent (1:many)

## External Dependencies {#external-dependencies}

### Required Services

**Authentication & User Management**:

- **Clerk**: JWT-based authentication with social providers
  - Handles: User registration, login, profile management
  - Integration: Webhooks for user creation/updates
  - Security: JWT validation in API middleware

**AI Processing**:

- **OpenAI API**: GPT-4 model for summarization and Smart Collections classification
  - Endpoints: Chat completions, structured outputs
  - Usage: Video content analysis, entity extraction, automatic categorization
  - Smart Collections: 7 entity types + 14 predefined categories
  - Rate Limits: Managed through LangChain
  - Performance: ~500-1000 tokens per classification, 85% accuracy rate

**Payments & Billing**:

- **Stripe**: Subscription management and payment processing
  - Products: Pro Plan ($9.99/month), Complete Plan (future)
  - Webhooks: Subscription status updates
  - Customer Portal: Self-service subscription management

**Infrastructure & Hosting**:

- **Vercel**: Frontend hosting with edge functions
  - Features: Automatic deployments, preview URLs, analytics
  - Performance: Edge caching, global CDN
  - Integration: GitHub-based deployments

**Database & Storage**:

- **Neon (Vercel Postgres)**: Serverless PostgreSQL
  - Features: Automatic scaling, connection pooling
  - Backup: Automated daily backups
  - Security: Encrypted at rest and in transit

### Optional Services

**Monitoring & Analytics**:

- **Sentry**: Error tracking and performance monitoring
- **PostHog**: User analytics and feature flags
- **Upstash Redis**: Caching layer for performance optimization

**Video Processing**:

- **YouTube Data API**: Video metadata extraction
- **Oxylabs**: Proxy service for transcript acquisition
- **YT-DLP**: Fallback transcript service
- **Gumloop**: Enhanced transcript processing

## Security Architecture {#security}

### Authentication & Authorization Patterns

#### JWT Authentication with Clerk Integration

```text
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │    │    Clerk    │    │    tRPC     │    │   FastAPI   │
│             │    │    Auth     │    │     API     │    │   Backend   │
│   JWT       ├────┤   Service   ├────┤  Middleware ├────┤   (OAuth2)  │
│   Token     │    │             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Next.js Middleware Security**:

```typescript
// src/middleware.ts - Request-level security
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  '/library(.*)',
  '/settings(.*)',
  '/billing(.*)'
]);

const isPublicApiRoute = createRouteMatcher([
  '/api/health',
  '/api/webhooks/(.*)'
]);

export default clerkMiddleware((auth, req) => {
  // Apply security headers
  const response = NextResponse.next({
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'origin-when-cross-origin',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    },
  });

  // Protect routes that require authentication
  if (isProtectedRoute(req)) {
    auth().protect();
  }

  // Rate limiting for API routes
  if (req.nextUrl.pathname.startsWith('/api/') && !isPublicApiRoute(req)) {
    return rateLimitMiddleware(req, response);
  }

  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

**JWT Validation Patterns**:

```typescript
// tRPC middleware with comprehensive auth validation
const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'Authentication required' 
    });
  }

  // Validate JWT claims
  const { sessionClaims } = auth();
  
  // Check for required permissions
  if (sessionClaims?.banned) {
    throw new TRPCError({ 
      code: 'FORBIDDEN',
      message: 'Account suspended' 
    });
  }

  // Rate limiting per user
  const rateLimitKey = `api_calls:${ctx.userId}`;
  const rateLimitResult = await checkRateLimit(rateLimitKey, 100, 3600); // 100 req/hour
  
  if (!rateLimitResult.allowed) {
    throw new TRPCError({ 
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter}s` 
    });
  }

  return next({
    ctx: {
      userId: ctx.userId,
      sessionClaims,
      prisma: ctx.prisma,
      headers: ctx.headers,
    },
  });
});
```

**FastAPI Security with OAuth2 Bearer**:

```python
# FastAPI JWT validation for cross-service calls
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import JWTError

security = HTTPBearer(auto_error=False)

async def verify_jwt_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Verify JWT token from Clerk."""
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Verify token with Clerk public key
        payload = jwt.decode(
            credentials.credentials,
            CLERK_PEM_PUBLIC_KEY,
            algorithms=["RS256"],
            audience=CLERK_AUDIENCE
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims"
            )
        
        return {
            "user_id": user_id,
            "session_id": payload.get("sid"),
            "email": payload.get("email"),
        }
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}"
        )

# Protected endpoint example
@router.post("/secure-endpoint")
async def secure_operation(
    request: SecureRequest,
    user: dict = Depends(verify_jwt_token)
):
    # User is authenticated, proceed with operation
    return await process_secure_operation(request, user["user_id"])
```

### CORS & Request Security

**Next.js CORS Configuration**:

```typescript
// api/cors-config.ts
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://sightline.ai', 'https://app.sightline.ai']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
  ],
  maxAge: 86400, // 24 hours
};
```

**FastAPI CORS with Security Headers**:

```python
# Enhanced CORS middleware with security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["sightline.ai", "*.sightline.ai", "localhost:3000"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sightline.ai",
        "https://app.sightline.ai",
        "http://localhost:3000" if DEBUG else None
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Rate-Limit-Remaining"]
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response
```

### Rate Limiting Architecture

**Multi-Layer Rate Limiting**:

```typescript
// src/lib/rateLimit.ts - Intelligent rate limiting
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Different limits for different operations
export const rateLimiters = {
  // General API calls
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 h"),
    analytics: true,
  }),
  
  // Summary creation (expensive operation)
  createSummary: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
  }),
  
  // Authentication attempts
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: true,
  }),
  
  // Anonymous users (stricter limits)
  anonymous: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    analytics: true,
  }),
};

export async function checkRateLimit(
  identifier: string,
  operation: keyof typeof rateLimiters
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const ratelimiter = rateLimiters[operation];
  const { success, limit, reset, remaining } = await ratelimiter.limit(identifier);
  
  return {
    allowed: success,
    remaining,
    retryAfter: success ? undefined : Math.round((reset - Date.now()) / 1000),
  };
}

// Usage in tRPC procedures
export const rateLimitedProcedure = publicProcedure.use(async ({ ctx, next, path }) => {
  const identifier = ctx.userId || getClientIP(ctx.headers);
  const operation = path.includes('create') ? 'createSummary' : 'api';
  
  const rateLimitResult = await checkRateLimit(identifier, operation);
  
  if (!rateLimitResult.allowed) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. ${rateLimitResult.retryAfter}s remaining.`,
    });
  }
  
  return next();
});
```

**FastAPI Rate Limiting**:

```python
# middleware/rate_limiter.py
import asyncio
import time
from collections import defaultdict
from fastapi import Request, HTTPException
import redis.asyncio as redis

class AsyncRateLimiter:
    def __init__(self, redis_url: str = None):
        self.redis = redis.from_url(redis_url) if redis_url else None
        self.local_storage = defaultdict(list)  # Fallback for development
    
    async def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> dict:
        now = time.time()
        window_start = now - window_seconds
        
        if self.redis:
            # Use Redis sliding window
            pipe = self.redis.pipeline()
            await pipe.zremrangebyscore(key, 0, window_start)
            await pipe.zadd(key, {str(now): now})
            await pipe.zcount(key, window_start, now)
            await pipe.expire(key, window_seconds)
            results = await pipe.execute()
            
            current_requests = results[2]
            allowed = current_requests <= limit
            remaining = max(0, limit - current_requests)
        else:
            # Local fallback
            timestamps = self.local_storage[key]
            self.local_storage[key] = [t for t in timestamps if t > window_start]
            self.local_storage[key].append(now)
            
            current_requests = len(self.local_storage[key])
            allowed = current_requests <= limit
            remaining = max(0, limit - current_requests)
        
        return {
            "allowed": allowed,
            "remaining": remaining,
            "reset_time": window_start + window_seconds,
            "retry_after": max(0, current_requests - limit) * (window_seconds / limit)
        }

rate_limiter = AsyncRateLimiter(os.getenv("REDIS_URL"))

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Skip rate limiting for health checks
    if request.url.path in ["/api/health", "/api"]:
        return await call_next(request)
    
    # Get client identifier
    client_ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    if not client_ip:
        client_ip = request.headers.get("x-real-ip", request.client.host)
    
    # Different limits for different endpoints
    if request.url.path.startswith("/api/summarize"):
        limit, window = 5, 3600  # 5 requests per hour for summarization
    else:
        limit, window = 100, 3600  # 100 requests per hour for other endpoints
    
    rate_limit_key = f"rate_limit:{client_ip}:{request.url.path}"
    result = await rate_limiter.check_rate_limit(rate_limit_key, limit, window)
    
    if not result["allowed"]:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "Rate limit exceeded",
                "retry_after": result["retry_after"],
                "limit": limit,
                "window": window
            }
        )
    
    # Add rate limit headers
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Remaining"] = str(result["remaining"])
    response.headers["X-RateLimit-Reset"] = str(int(result["reset_time"]))
    
    return response
```

### Input Validation & Sanitization

**Comprehensive Input Validation**:

```typescript
// src/lib/security.ts - Enhanced input validation
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const window = new JSDOM('').window
const purify = DOMPurify(window as any)

export function sanitizeHtml(content: string): string {
  return purify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'title'],
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  })
}

export function validateVideoUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    const allowedDomains = [
      'youtube.com',
      'www.youtube.com',
      'youtu.be',
      'm.youtube.com'
    ]
    
    return allowedDomains.includes(parsedUrl.hostname.toLowerCase())
  } catch {
    return false
  }
}

// Advanced content analysis
export function detectSuspiciousPatterns(content: string): {
  isSuspicious: boolean;
  patterns: string[];
  riskScore: number;
} {
  const suspiciousPatterns = [
    { pattern: /<script/i, weight: 10, name: 'script_tag' },
    { pattern: /javascript:/i, weight: 8, name: 'javascript_protocol' },
    { pattern: /on\w+\s*=/i, weight: 7, name: 'event_handler' },
    { pattern: /data:text\/html/i, weight: 6, name: 'data_uri' },
    { pattern: /vbscript:/i, weight: 9, name: 'vbscript_protocol' },
    { pattern: /expression\s*\(/i, weight: 8, name: 'css_expression' },
  ]
  
  let riskScore = 0
  const foundPatterns: string[] = []
  
  for (const { pattern, weight, name } of suspiciousPatterns) {
    if (pattern.test(content)) {
      riskScore += weight
      foundPatterns.push(name)
    }
  }
  
  return {
    isSuspicious: riskScore > 5,
    patterns: foundPatterns,
    riskScore
  }
}
```

**Zod Schema Validation**:

```typescript
// Enhanced Zod schemas with security validations
import { z } from 'zod'

const secureStringSchema = z.string()
  .trim()
  .refine(
    (val) => !containsSuspiciousContent(val),
    { message: 'Content contains suspicious patterns' }
  )
  .transform(sanitizeText)

const youtubeUrlSchema = z.string()
  .url({ message: 'Must be a valid URL' })
  .refine(
    validateVideoUrl,
    { message: 'Must be a valid YouTube URL' }
  )
  .transform(sanitizeUrl)

export const createSummarySchema = z.object({
  videoUrl: youtubeUrlSchema,
  videoTitle: secureStringSchema.max(200).optional(),
  customNotes: secureStringSchema.max(1000).optional(),
})

export const updateProfileSchema = z.object({
  name: secureStringSchema.min(1).max(100),
  email: z.string().email().toLowerCase(),
  preferences: z.object({
    emailNotifications: z.boolean(),
    publicProfile: z.boolean(),
  }).strict(),
})
```

### Data Protection & Privacy

**Encryption at Rest and Transit**:

```typescript
// src/lib/encryption.ts - Data encryption utilities
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!
const ALGORITHM = 'aes-256-gcm'

export function encryptSensitiveData(text: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

export function decryptSensitiveData(encryptedData: {
  encrypted: string;
  iv: string;
  tag: string;
}): string {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// PII data handling
export function redactPII(data: any): any {
  const sensitiveFields = ['email', 'phone', 'ssn', 'creditCard']
  
  if (typeof data === 'object' && data !== null) {
    const redacted = { ...data }
    
    for (const field of sensitiveFields) {
      if (field in redacted) {
        redacted[field] = redacted[field]
          ? `${redacted[field].slice(0, 2)}***${redacted[field].slice(-2)}`
          : null
      }
    }
    
    return redacted
  }
  
  return data
}
```

**GDPR Compliance Patterns**:

```typescript
// Data export and deletion utilities
export async function exportUserData(userId: string) {
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      summaries: {
        include: {
          tags: true,
          categories: true,
        }
      },
      usageEvents: true,
    }
  })
  
  // Redact sensitive internal data
  return {
    profile: redactPII(userData),
    summaries: userData?.summaries.map(summary => ({
      ...summary,
      internalNotes: undefined, // Remove internal fields
      processingLogs: undefined,
    })),
    usageStatistics: userData?.usageEvents,
    exportedAt: new Date().toISOString(),
  }
}

export async function deleteUserData(userId: string) {
  // Soft delete with data anonymization
  await prisma.$transaction([
    // Anonymize summaries instead of deleting (for analytics)
    prisma.summary.updateMany({
      where: { userId },
      data: {
        userId: 'DELETED_USER',
        videoUrl: 'https://deleted.example.com',
        videoTitle: 'Deleted Content',
      }
    }),
    
    // Delete usage events (personal data)
    prisma.usageEvent.deleteMany({
      where: { userId }
    }),
    
    // Delete user profile
    prisma.user.delete({
      where: { id: userId }
    }),
  ])
}
```

## Performance Characteristics {#performance}

### Response Times

- **Static Pages**: <100ms (Vercel Edge)
- **API Requests**: <200ms (tRPC with database)
- **AI Processing**: 15-45 seconds (FastAPI + OpenAI)
- **Real-time Updates**: <2s polling interval

### Scalability

**Horizontal Scaling**:

- **Frontend**: Automatic edge scaling via Vercel
- **tRPC API**: Serverless functions with auto-scaling
- **FastAPI**: Containerized deployment with load balancing
- **Database**: Connection pooling with automatic scaling

**Resource Optimization**:

- **Caching Strategy**: Browser cache, CDN cache, database query cache
- **Bundle Optimization**: Code splitting, tree shaking, lazy loading
- **Database Optimization**: Indexed queries, connection pooling
- **AI Optimization**: Prompt optimization, streaming responses

## Development Architecture {#development-architecture}

### Environment Separation

```text
Development  ──→  Staging  ──→  Production
     │              │             │
     ▼              ▼             ▼
Local DB      Preview DB    Production DB
Test APIs     Test APIs     Production APIs
Mock Data     Seed Data     Real Data
```

**Configuration Management**:

- **Environment Variables**: Secure secret management via Vercel
- **Feature Flags**: PostHog integration for gradual rollouts
- **Database Migrations**: Prisma-managed schema evolution
- **Deployment Pipeline**: GitHub Actions with automated testing

### Quality Assurance

**Testing Strategy**:

- **Unit Tests**: Jest + React Testing Library (70% coverage target)
- **E2E Tests**: Playwright cross-browser testing
- **API Tests**: Python test suite with pytest
- **Performance Tests**: Core Web Vitals monitoring

**Code Quality**:

- **TypeScript**: Strict mode with comprehensive type checking
- **ESLint**: Custom rules for consistency and best practices
- **Prettier**: Automated code formatting
- **Husky**: Pre-commit hooks for quality gates

## Architectural Decision Records (ADRs) {#adrs-reference}

### Key Design Decisions and Rationales

#### 1. Next.js 14 App Router vs Pages Router

**Decision**: Use App Router for new development
**Rationale**:

- Server Components reduce client-side bundle size by 40-60%
- Better SEO with built-in metadata API
- Improved developer experience with co-located loading/error states
- Future-proof architecture aligned with React 18+ features

#### 2. tRPC vs REST API

**Decision**: tRPC for internal APIs, REST for external integrations
**Rationale**:

- End-to-end type safety eliminates runtime errors
- 30-50% reduction in API development time
- Automatic client generation from server schemas
- Better developer experience with autocompletion

#### 3. Dual Backend Architecture (tRPC + FastAPI)

**Decision**: Separate TypeScript and Python backends
**Rationale**:

- tRPC handles CRUD operations with type safety
- FastAPI optimized for AI/ML workloads with async processing
- Language-specific optimizations (TypeScript for web, Python for AI)
- Clear separation of concerns

#### 4. Prisma ORM vs Raw SQL

**Decision**: Prisma for database operations
**Rationale**:

- Type-safe database queries prevent runtime errors
- Excellent migration system with versioning
- Built-in connection pooling and query optimization
- Great developer experience with auto-completion

#### 5. Clerk vs NextAuth.js

**Decision**: Clerk for authentication
**Rationale**:

- Production-ready with minimal configuration
- Built-in security features (rate limiting, attack protection)
- Excellent Next.js integration with middleware support
- Social providers and enterprise features included

#### 6. Server Components vs Client Components Strategy

**Decision**: Server Components by default, Client Components for interactivity
**Rationale**:

- Reduced bundle size and improved initial page load
- Better SEO and Core Web Vitals scores
- Simplified data fetching without loading states
- Selective hydration only where needed

### Performance Optimization Strategies

#### Bundle Optimization

```typescript
// next.config.js - Production optimizations
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@clerk/nextjs', '@trpc/client'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ]
  },
}
```

#### Database Query Optimization

```typescript
// Optimized queries with selective includes
const optimizedSummaryQuery = {
  select: {
    id: true,
    title: true,
    createdAt: true,
    // Only load needed fields
  },
  where: {
    userId,
    // Indexed fields for fast lookups
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 20, // Pagination
}

// Use connection pooling
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
  log: ['query', 'error'],
}).$extends({
  name: 'performance-monitoring',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = Date.now()
        const result = await query(args)
        const end = Date.now()
        
        if (end - start > 1000) {
          console.warn(`Slow query detected: ${model}.${operation} took ${end - start}ms`)
        }
        
        return result
      },
    },
  },
})
```

#### Caching Strategy

```typescript
// Multi-layer caching approach
export async function getCachedSummary(id: string) {
  // 1. In-memory cache (fastest)
  const memoryCache = getFromMemoryCache(`summary:${id}`)
  if (memoryCache) return memoryCache

  // 2. Redis cache (fast)
  const redisCache = await redis.get(`summary:${id}`)
  if (redisCache) {
    setMemoryCache(`summary:${id}`, redisCache, 300) // 5 minutes
    return redisCache
  }

  // 3. Database (slower)
  const summary = await prisma.summary.findUnique({ where: { id } })
  if (summary) {
    await redis.setex(`summary:${id}`, 3600, JSON.stringify(summary)) // 1 hour
    setMemoryCache(`summary:${id}`, summary, 300)
  }

  return summary
}
```

### Monitoring and Observability

#### Performance Monitoring

```typescript
// Built-in performance monitoring
export const performanceMonitor = {
  trackPageLoad: (pageName: string, loadTime: number) => {
    if (loadTime > 3000) {
      console.warn(`Slow page load: ${pageName} took ${loadTime}ms`)
      // Send to monitoring service
    }
  },
  
  trackApiCall: (endpoint: string, duration: number, status: number) => {
    const isSlowApi = duration > 1000
    const isErrorStatus = status >= 400
    
    if (isSlowApi || isErrorStatus) {
      // Alert on performance degradation
      monitoring.alert('api_performance', {
        endpoint,
        duration,
        status,
        severity: isErrorStatus ? 'high' : 'medium'
      })
    }
  }
}
```

#### Error Tracking Patterns

```typescript
// Comprehensive error boundary
export class ErrorBoundaryWithReporting extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error reporting
    const errorReport = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: getCurrentUserId(),
      timestamp: new Date().toISOString(),
    }
    
    // Send to monitoring service
    monitoring.reportError(errorReport)
    
    // For critical errors, show user-friendly message
    if (this.isCriticalError(error)) {
      this.setState({ shouldShowFallback: true })
    }
  }
  
  private isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      /chunk load failed/i,
      /network error/i,
      /unauthorized/i,
    ]
    
    return criticalPatterns.some(pattern => pattern.test(error.message))
  }
}
```

### Deployment & DevOps Patterns

#### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run type checking
        run: pnpm typecheck
      
      - name: Run tests
        run: pnpm test:ci
      
      - name: Build application
        run: pnpm build
        
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

#### Environment Configuration

```typescript
// src/lib/env.ts - Environment validation
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  CLERK_SECRET_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

export const env = envSchema.parse(process.env)

// Runtime environment validation
if (typeof window === 'undefined') {
  try {
    envSchema.parse(process.env)
  } catch (error) {
    console.error('Invalid environment variables:', error)
    process.exit(1)
  }
}
```

---

## Summary {#architecture-summary}

This architecture implements modern full-stack best practices with:

- **Type Safety**: End-to-end TypeScript with compile-time validation
- **Performance**: Server Components, intelligent caching, and optimized bundles  
- **Security**: Multi-layer authentication, rate limiting, and input sanitization
- **Scalability**: Serverless architecture with horizontal scaling capabilities
- **Reliability**: Comprehensive error boundaries and graceful degradation
- **Developer Experience**: tRPC for type-safe APIs, comprehensive tooling

The architecture supports current requirements while providing flexibility for future enhancements
including advanced AI features, enterprise functionality, and global scaling. All patterns follow
industry best practices from 2024 and are optimized for production deployment.
