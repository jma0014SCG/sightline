# API Documentation

**Schema-first API documentation for Sightline.ai platform**

## API Architecture Overview

Sightline.ai uses a dual API architecture optimized for different use cases:

```text
Frontend ──→ tRPC API ──→ Database (User Operations)
            ↘         ↙
              FastAPI ──→ AI Processing
```

## API Layers

### tRPC API (TypeScript)
**Purpose**: Type-safe frontend-backend communication  
**Base URL**: `/api/trpc` (development: `http://localhost:3000/api/trpc`)  
**Authentication**: Clerk JWT tokens  

**Key Features**:
- End-to-end type safety with automatic TypeScript inference
- Real-time optimistic updates
- Built-in error handling with structured error codes
- Automatic request/response validation with Zod schemas

### FastAPI (Python)  
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

## Documentation Structure

```text
API/
├── README.md              # This overview
├── trpc/                  # tRPC API documentation
│   ├── summary.md        # Video summarization procedures
│   ├── library.md        # Personal library management
│   ├── auth.md           # User authentication and profiles
│   ├── billing.md        # Stripe payment integration
│   └── share.md          # Public sharing functionality
├── fastapi/               # FastAPI endpoint documentation  
│   ├── summarization.md  # AI processing endpoints
│   ├── progress.md       # Progress tracking system
│   └── health.md         # Health monitoring endpoints
└── examples/              # Code examples and integration guides
    ├── authentication.md # Auth implementation examples
    ├── error-handling.md # Error handling patterns
    └── progress-tracking.md # Real-time progress implementation
```

## Schema Definitions

### Core Data Types

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
- **Complete Plan**: Unlimited summaries

### Rate Limit Headers

```http
X-RateLimit-Limit: 25
X-RateLimit-Remaining: 18
X-RateLimit-Reset: 1704412800
X-RateLimit-Window: month
```

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

## Testing

### tRPC Testing

```typescript
import { createInnerTRPCContext } from '@/server/api/trpc'
import { appRouter } from '@/server/api/root'

const ctx = createInnerTRPCContext({ user: mockUser })
const caller = appRouter.createCaller(ctx)

const summary = await caller.summary.create({ 
  url: 'https://youtube.com/watch?v=test' 
})
```

### FastAPI Testing

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

**Need more details?** See specific API documentation:
- [tRPC Procedures](trpc/) - Type-safe frontend API
- [FastAPI Endpoints](fastapi/) - AI processing API  
- [Integration Examples](examples/) - Implementation patterns