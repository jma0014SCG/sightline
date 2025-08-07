# Test Improvement Roadmap - Sightline.ai

**Current Coverage**: 2.05% → **Target Coverage**: 80%  
**Timeline**: 3 months  
**Estimated Effort**: 40-60 hours

## Phase 1: Critical Foundation (Week 1-2) 🚨
**Goal**: Address highest risk areas and establish testing patterns  
**Target Coverage**: 15-20%

### 1.1 Fix Configuration Issues
```bash
# Fix Jest configuration warning
# File: jest.config.js - Change moduleNameMapping to moduleNameMapping
moduleNameMapping → moduleNameMapping
```

### 1.2 API Route Testing (Priority 1)
**Files to Create**:
- `src/app/api/health/__tests__/route.test.ts`
- `src/app/api/webhooks/clerk/__tests__/route.test.ts` 
- `src/app/api/webhooks/stripe/__tests__/route.test.ts`

**Implementation Pattern**:
```typescript
import { GET } from '../route'
import { NextRequest } from 'next/server'

describe('/api/health', () => {
  it('should return healthy status with database check', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()
    
    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.checks.database.status).toBe('up')
  })
})
```

### 1.3 Core tRPC Procedures (Priority 1)
**Files to Create**:
- `src/server/api/routers/__tests__/summary.test.ts`
- `src/server/api/routers/__tests__/auth.test.ts`
- `src/server/api/routers/__tests__/billing.test.ts`

**Setup Requirements**:
- Mock Prisma database calls
- Mock external API services (OpenAI, Clerk, Stripe)
- Test both success and error scenarios

### 1.4 Payment Processing (Critical)
**Test Scenarios**:
- Subscription creation and updates
- Payment method handling
- Webhook processing
- Billing cycle management
- Error scenarios (failed payments, invalid cards)

**Estimated Effort**: 12-15 hours

## Phase 2: Core Business Logic (Week 3-4) ⚡
**Goal**: Test video summarization and user management  
**Target Coverage**: 35-45%

### 2.1 Video Summarization Pipeline
**File**: `src/server/api/routers/__tests__/summary.test.ts`

**Key Test Scenarios**:
- Anonymous user summary creation
- Authenticated user summary creation  
- Summary limit enforcement by plan
- Error handling for invalid YouTube URLs
- Progress tracking functionality
- Database persistence

### 2.2 Smart Collections Testing
**File**: `src/lib/__tests__/classificationService.test.ts`

**Test Coverage**:
- AI classification service mocking
- Tag and category extraction
- Error handling when OpenAI unavailable
- Database tag/category creation
- Fallback behavior

### 2.3 Authentication & Authorization
**File**: `src/server/api/routers/__tests__/auth.test.ts`

**Test Scenarios**:
- User profile updates
- Notification preferences
- Data export functionality
- Plan enforcement
- Anonymous user handling

**Estimated Effort**: 15-18 hours

## Phase 3: Service Layer & Caching (Week 5-6) 🔧
**Goal**: Test performance-critical systems  
**Target Coverage**: 55-65%

### 3.1 Caching System
**File**: `src/lib/__tests__/cache.test.ts`

**Test Coverage**:
- Redis connection and fallback to memory
- Cache hit/miss scenarios
- TTL expiration
- Cache invalidation
- Performance wrapper functions

### 3.2 Performance Monitoring
**File**: `src/lib/__tests__/monitoring.test.ts`

**Test Coverage**:
- Error tracking integration
- Performance metrics collection
- Alerting thresholds
- Custom error handling

### 3.3 Library Management
**File**: `src/server/api/routers/__tests__/library.test.ts`

**Test Coverage**:
- Summary filtering and pagination
- Category and tag-based filtering
- Search functionality
- Summary sharing functionality

**Estimated Effort**: 12-15 hours

## Phase 4: Component & Hook Testing (Week 7-8) 🎨
**Goal**: Test React components and custom hooks  
**Target Coverage**: 70-80%

### 4.1 Critical React Components
**Priority Components to Test**:
- `URLInput` - Core user interaction
- `SummaryCard` - Data display and actions
- `LibraryControls` - Filtering and search
- `SummaryViewer` - Complex content display

**Setup Requirements**:
```bash
# Additional testing dependencies
pnpm add -D @testing-library/user-event msw
```

### 4.2 Custom Hooks Testing
**Files to Create**:
- `src/lib/hooks/__tests__/useProgressTracking.test.ts`
- `src/lib/hooks/__tests__/useAuth.test.ts`
- `src/hooks/__tests__/useToast.test.ts`

**Testing Pattern**:
```typescript
import { renderHook, act } from '@testing-library/react'
import { useProgressTracking } from '../useProgressTracking'

describe('useProgressTracking', () => {
  it('should track progress updates', () => {
    const { result } = renderHook(() => useProgressTracking('task123'))
    
    expect(result.current.progress).toBe(0)
    expect(result.current.status).toBe('pending')
  })
})
```

### 4.3 Provider Components
**Files to Test**:
- `TRPCProvider` - API client configuration
- `ToastProvider` - Notification system
- `MonitoringProvider` - Error tracking

**Estimated Effort**: 15-20 hours

## Phase 5: Integration & E2E Testing (Week 9-12) 🌐
**Goal**: End-to-end user journey testing  
**Target Coverage**: 80%+

### 5.1 Python Test Integration
**Tasks**:
- Install pytest in Python environment
- Convert existing test files to pytest format
- Integrate with main test pipeline
- Add coverage reporting for Python code

### 5.2 End-to-End Testing Setup
**Tool**: Playwright for browser automation

**Critical User Journeys**:
- Anonymous user creates summary
- User signs up and claims anonymous summary
- Paid user creates and manages summaries
- Subscription upgrade/downgrade flow
- Sharing functionality

### 5.3 Database Integration Testing
**Setup**: Test database with realistic data

**Test Scenarios**:
- Database migration testing
- Data integrity constraints
- Performance under load
- Backup and recovery scenarios

**Estimated Effort**: 20-25 hours

## Implementation Guidelines 📋

### Testing Patterns to Follow

#### 1. API Route Testing Pattern
```typescript
// Mock external dependencies
jest.mock('@/lib/db/prisma')
jest.mock('@clerk/nextjs/server')

describe('API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle success case', async () => {
    // Arrange: Setup mocks and data
    // Act: Call the API route
    // Assert: Verify response and side effects
  })

  it('should handle error scenarios', async () => {
    // Test error conditions and proper error responses
  })
})
```

#### 2. tRPC Procedure Testing Pattern
```typescript
import { appRouter } from '@/server/api/root'
import { createTRPCMsw } from 'msw-trpc'

const trpcMsw = createTRPCMsw(appRouter)

describe('tRPC Procedures', () => {
  it('should create summary with valid input', async () => {
    const caller = appRouter.createCaller(mockContext)
    
    const result = await caller.summary.create({
      url: 'https://youtube.com/watch?v=test',
      title: 'Test Video'
    })

    expect(result).toMatchObject({
      id: expect.any(String),
      title: 'Test Video'
    })
  })
})
```

#### 3. Component Testing Pattern
```typescript
import { render, screen, userEvent } from '@testing-library/react'
import { URLInput } from '../URLInput'

describe('URLInput', () => {
  it('should validate YouTube URLs', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    
    render(<URLInput onSubmit={onSubmit} />)
    
    const input = screen.getByPlaceholderText(/youtube url/i)
    await user.type(input, 'invalid-url')
    
    expect(screen.getByText(/please enter a valid/i)).toBeInTheDocument()
  })
})
```

### Mock Strategy

#### External Services
```typescript
// Clerk Authentication
jest.mock('@clerk/nextjs/server', () => ({
  currentUser: jest.fn(),
  auth: jest.fn()
}))

// OpenAI API
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    }
  }))
}))

// Stripe
jest.mock('stripe', () => ({
  Stripe: jest.fn().mockImplementation(() => ({
    customers: { create: jest.fn() },
    subscriptions: { create: jest.fn() }
  }))
}))
```

#### Database Mocking
```typescript
// Prisma Client Mock
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  summary: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn()
  }
}

jest.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma
}))
```

## Quality Gates & CI Integration

### Coverage Thresholds
```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  // Per-file thresholds for critical files
  './src/server/api/routers/summary.ts': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  }
}
```

### GitHub Actions Integration
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests with coverage
        run: pnpm test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

## Success Metrics & Monitoring

### Weekly Targets
- **Week 1-2**: 20% coverage, API routes tested
- **Week 3-4**: 45% coverage, business logic tested  
- **Week 5-6**: 65% coverage, services tested
- **Week 7-8**: 80% coverage, components tested
- **Week 9-12**: 80%+ coverage, E2E testing complete

### Quality Indicators
- Test execution time < 30 seconds
- No flaky tests (95%+ reliability)
- All critical user journeys covered
- Error scenarios comprehensively tested
- Documentation updated with testing guidelines

---

**Total Estimated Effort**: 74-93 hours  
**Recommended Timeline**: 12 weeks  
**Resource Requirements**: 1 developer, 6-8 hours/week  
**Success Criteria**: 80% test coverage with comprehensive business logic testing