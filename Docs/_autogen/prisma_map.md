# Prisma Client Initialization Map

Generated: 2025-01-16

Analysis of all Prisma Client initializations, environment variable reads, and potential browser bundle risks.

## Executive Summary

- **Total Files with Prisma Imports**: 31 files
- **Actual PrismaClient Instantiations**: 9 locations
- **Primary Singleton Pattern**: `src/lib/db/prisma.ts`
- **DATABASE_URL References**: 55 occurrences across documentation and code
- **Browser Bundle Risk**: LOW - Only type imports in client components

## 1. Primary Prisma Singleton Pattern

### Main Instance: `src/lib/db/prisma.ts`

```typescript
// Line 1-70
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? [/* verbose logging */]
      : [{ level: 'error', emit: 'event' }],
  })
  // Event handlers in development...
  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Environment Variables**: 
- Reads `NODE_ENV` for logging configuration
- DATABASE_URL read by Prisma internally from `prisma/schema.prisma:10`

**Pattern**: Global singleton to prevent multiple instances in development with hot reload

## 2. Direct PrismaClient Instantiations

### Scripts (Node.js Context - Safe)

| File | Line | Context | ENV Vars |
|------|------|---------|----------|
| `scripts/init-anonymous-user.js` | 4 | `new PrismaClient()` | DATABASE_URL (implicit) |
| `scripts/create-test-user.js` | 10 | `new PrismaClient()` | DATABASE_URL (implicit) |
| `scripts/test-db.js` | 4 | `new PrismaClient()` | DATABASE_URL (implicit) |
| `scripts/backfill-usage-events.ts` | 18 | `new PrismaClient()` | DATABASE_URL (implicit) |

### E2E Test Helpers

| File | Line | Context | ENV Vars |
|------|------|---------|----------|
| `e2e/helpers/database-manager.ts` | 7 | `static prisma = new PrismaClient()` | DATABASE_URL |
| `e2e/helpers/global-teardown.ts` | 31 | `new PrismaClient()` | DATABASE_URL (checked at line 16) |
| `e2e/helpers/global-setup.ts` | - | References DATABASE_URL | Checks at line 19 |

## 3. Server-Side Imports (Safe)

### API Routes & tRPC

| File | Import Source | Usage |
|------|--------------|-------|
| `src/server/api/trpc.ts:5` | `@/lib/db/prisma` | Context creation |
| `src/app/api/webhooks/clerk/route.ts:4` | `@/lib/db/prisma` | User sync webhook |
| `src/app/api/webhooks/stripe/route.ts:5` | `@/lib/db/prisma` | Payment webhook |
| `src/app/api/stripe/webhook/route.ts:6` | `@/lib/db/prisma` | Stripe events |

### Server Actions

| File | Import Source | Usage |
|------|--------------|-------|
| `src/app/actions/smart-tagging-debug.ts:3` | `@/lib/db/prisma` | Server action (use server) |

### Services

| File | Import Source | Usage |
|------|--------------|-------|
| `src/lib/classificationService.ts:2` | `@/lib/db/prisma` | AI classification |
| `src/lib/stripe/planSync.ts:2` | `@/lib/db/prisma` | Subscription sync |

## 4. Type-Only Imports (Browser-Safe)

### Client Components with Type Imports

These files have `"use client"` directive but only import **types**, not the actual PrismaClient:

| File | Import | Risk |
|------|--------|------|
| `src/components/molecules/ActionsSidebar/ActionsSidebar.tsx` | `type { Summary }` | ✅ Safe |
| `src/components/molecules/SummaryCard/SummaryCard.tsx` | `type { Summary, Category, Tag }` | ✅ Safe |
| `src/components/molecules/SummaryHeader/SummaryHeader.tsx` | `type { Summary, Category, Tag }` | ✅ Safe |
| `src/components/organisms/SummaryViewer/SummaryViewer.tsx` | `type { Summary }` | ✅ Safe |

### Test Files with Type Imports

| File | Import |
|------|--------|
| `src/server/api/routers/__tests__/*.test.ts` | `type { PrismaClient }` |
| `src/server/api/middleware/usageGuard.ts:3` | `type { PrismaClient, Plan }` |
| `src/server/api/routers/summary/guards.ts:2` | `type { PrismaClient }` |
| `src/test-utils/db.ts:1` | `type { PrismaClient }` |

## 5. DATABASE_URL Environment Variable

### Schema Configuration

```prisma
// prisma/schema.prisma:10
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Environment Validation

```typescript
// src/lib/env.ts:5
// scripts/validate-env.js:6
DATABASE_URL: z.string().url()
```

### Python Backend Usage

```python
# api/services/progress_storage.py:35
self.db_url = os.getenv("DATABASE_URL", "")
```

### Test Environment Setup

```javascript
// jest.setup.js:131
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// .github/workflows/e2e-tests.yml:59,66
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/sightline_test
```

## 6. Browser Bundle Risk Assessment

### ✅ **LOW RISK** - Properly Isolated

1. **Main Singleton** (`src/lib/db/prisma.ts`):
   - Only imported by server-side code
   - Never imported in client components
   - Protected by module boundaries

2. **Client Components**:
   - Only import Prisma **types** (TypeScript interfaces)
   - Types are compile-time only, not included in bundles
   - No actual PrismaClient code reaches the browser

3. **Server Actions**:
   - `src/app/actions/smart-tagging-debug.ts` uses `"use server"` directive
   - Properly isolated from client bundle

4. **API Routes**:
   - All in `app/api/` directory
   - Run only on server/edge runtime
   - No risk of client bundling

## 7. Potential Improvements

### Current Good Practices ✅
- Singleton pattern prevents connection exhaustion
- Type-only imports in client components
- Environment variable validation
- Proper server/client separation

### Recommendations for Enhancement

1. **Consolidate Script Instances**:
   ```typescript
   // Create scripts/lib/prisma.ts
   import { prisma } from '@/lib/db/prisma'
   export { prisma }
   ```
   Use singleton in scripts instead of creating new instances

2. **Add Connection Pool Configuration**:
   ```typescript
   new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
     connectionLimit: 10, // Add explicit limits
   })
   ```

3. **Add Explicit Runtime Checks**:
   ```typescript
   // In src/lib/db/prisma.ts
   if (typeof window !== 'undefined') {
     throw new Error('Prisma client cannot be used in the browser')
   }
   ```

4. **Environment Variable Safety**:
   ```typescript
   // Add to src/lib/db/prisma.ts
   if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
     throw new Error('DATABASE_URL is required in production')
   }
   ```

## 8. Files by Category

### Production Code (11 files)
- `src/lib/db/prisma.ts` - Main singleton
- `src/server/api/trpc.ts` - tRPC context
- `src/app/api/webhooks/*/route.ts` - Webhook handlers
- `src/app/actions/*.ts` - Server actions
- `src/lib/*/planSync.ts` - Services

### Scripts (4 files)
- `scripts/*.js` - Database utilities
- `scripts/*.ts` - Migration scripts

### Tests (11 files)
- `src/**/__tests__/*.ts` - Unit tests
- `e2e/helpers/*.ts` - E2E helpers
- `src/test-utils/*.ts` - Test utilities

### Type-Only Imports (5 files)
- `src/components/**/*.tsx` - React components
- Type imports only, no runtime code

## Conclusion

The Prisma setup follows best practices:
- ✅ Centralized singleton pattern
- ✅ No PrismaClient in browser bundles
- ✅ Type-only imports in client components
- ✅ Proper environment variable handling
- ✅ Server-side isolation

The main area for improvement is consolidating the script instantiations to use the singleton pattern, but this is low priority as scripts run in isolated Node.js contexts.