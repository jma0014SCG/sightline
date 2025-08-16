# Authentication Map

Generated: 2025-01-16

Analysis of authentication boundaries, Clerk integration, and tRPC protected procedures.

## Executive Summary

- **Total Protected Procedures**: 14 procedures across 4 routers
- **auth.getCurrentUser Usage**: 2 client components, 3 API references  
- **Clerk Server Helpers**: Used in 3 locations (trpc.ts, billing.ts, planSync.ts)
- **Clerk Environment Variables**: 3 keys (SECRET, PUBLISHABLE, WEBHOOK)
- **Client Component Risk**: LOW - No direct server API calls from client components
- **Authentication Pattern**: Clerk + tRPC context-based auth

## 1. tRPC Protected Procedures

### auth.ts Router (4 procedures)

| Procedure | Type | Purpose | Line |
|-----------|------|---------|------|
| `getCurrentUser` | query | Get authenticated user details | 25 |
| `getSecretMessage` | query | Test authentication works | 32 |
| `getNotificationPreferences` | query | Get user notification settings | 94 |
| `exportUserData` | query | Export all user data (GDPR) | 130 |
| `updateProfile` | mutation | Update user profile info | 65 |
| `updateNotificationPreferences` | mutation | Update notification settings | 87 |
| `deleteAccount` | mutation | Delete user account (GDPR) | 207 |

### billing.ts Router (3 procedures)

| Procedure | Type | Purpose | Line |
|-----------|------|---------|------|
| `getSubscription` | query | Get current subscription status | 10 |
| `getUsageStats` | query | Get usage statistics | 131 |
| `createCheckoutSession` | mutation | Create Stripe checkout | 46 |
| `createCustomerPortal` | mutation | Access Stripe portal | 108 |

### library.ts Router (4 procedures)

| Procedure | Type | Purpose | Line |
|-----------|------|---------|------|
| `list` | query/mutation | List user's summaries | 496 |
| `getStats` | query | Get library statistics | 220 |
| `getTags` | query | Get user's tags | 269 |
| `getCategories` | query | Get user's categories | 299 |

### share.ts Router (3 procedures)

| Procedure | Type | Purpose | Line |
|-----------|------|---------|------|
| `create` | mutation | Create shareable link | 13 |
| `revoke` | mutation | Revoke share link | 203 |
| `updatePrivacy` | mutation | Update summary privacy | 231 |

### summary.ts Router (5 authenticated mutations)

| Procedure | Type | Purpose | Line |
|-----------|------|---------|------|
| `update` | mutation | Update summary content | 990 |
| `delete` | mutation | Delete summary | 1037 |
| `claim` | mutation | Claim anonymous summary | 1087 |
| `classifySummary` | mutation | Run Smart Collections | 1253 |
| `classifyMultiple` | mutation | Bulk classification | 1394 |

## 2. auth.getCurrentUser Usage

### Client Components (Safe - Using tRPC)

```typescript
// src/app/(dashboard)/settings/page.tsx:25
const { data: user, isLoading: userLoading } = api.auth.getCurrentUser.useQuery()

// src/components/providers/MonitoringProvider.tsx:15
const { data: dbUser } = api.auth.getCurrentUser.useQuery(undefined, {
  enabled: !!user && typeof window !== "undefined",
})
```

### API Documentation Examples

- `patches/02-add-jsdoc-comments.patch:394` - JSDoc example
- `Docs/archive/obsolete-root-docs/API_DOCUMENTATION.md:50` - Usage example
- `src/server/api/routers/auth.ts:16` - Implementation

### E2E Test Mocks

```typescript
// e2e/helpers/api-mocks.ts:136
await page.route("**/api/trpc/auth.getCurrentUser*", ...)
```

## 3. Clerk Server-Side Helper Usage

### Primary Authentication Context

```typescript
// src/server/api/trpc.ts:2
import { auth } from '@clerk/nextjs/server'

// Creates tRPC context with auth (lines 30-50)
const createInnerTRPCContext = async (opts: CreateContextOptions) => {
  const session = await auth()
  const userId = session?.userId || null
  // ...
}
```

### Billing Integration

```typescript
// src/server/api/routers/billing.ts:6
import { currentUser } from '@clerk/nextjs/server'
// Used to get Clerk user data for Stripe integration
```

### Plan Synchronization Service

```typescript
// src/lib/stripe/planSync.ts:1
import { clerkClient } from '@clerk/nextjs/server'
// Syncs subscription plans between Stripe and Clerk metadata
```

### Webhook Handler

```typescript
// src/app/api/webhooks/clerk/route.ts:3
import { WebhookEvent } from '@clerk/nextjs/server'
// Handles Clerk webhook events for user sync
```

### Middleware

```typescript
// src/middleware.ts:1
import { clerkMiddleware } from "@clerk/nextjs/server";
// Protects routes and handles authentication
```

## 4. Clerk Environment Variables

### Required Keys

| Variable | Usage | Validation | Risk |
|----------|-------|------------|------|
| `CLERK_SECRET_KEY` | Server-side auth | Must start with `sk_` | HIGH - Server only |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client-side SDK | Must start with `pk_` | LOW - Public key |
| `CLERK_WEBHOOK_SECRET` | Webhook verification | Must start with `whsec_` | HIGH - Server only |

### Key References

```typescript
// src/lib/env.ts:8-10
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
CLERK_SECRET_KEY: z.string().startsWith('sk_'),
CLERK_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

// src/app/api/webhooks/clerk/route.ts:25
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

// src/app/api/health/route.ts:60
status: process.env.CLERK_SECRET_KEY ? 'up' : 'not_configured'
```

## 5. Client Components Analysis

### Client Components with "use client" Directive

Total: 11 components identified

#### Safe Components (Type-Only Imports)
- `SummaryViewer.tsx` - Only imports Summary type from Prisma
- `MainContentColumn.tsx` - No server API calls
- `URLInput.tsx` - Uses tRPC hooks (safe)
- `MonitoringProvider.tsx` - Uses Clerk hooks + tRPC (safe)
- `LearningHubTabs.tsx` - No server calls
- `InsightEnrichment.tsx` - No server calls

#### Sentry Debug Pages (Test Only)
- `sentry-debug/page.tsx` - Debug page
- `sentry-quick-test/page.tsx` - Test page
- `sentry-test/page.tsx` - Test page
- `global-error.tsx` - Error boundary

### Server Actions

```typescript
// src/app/actions/smart-tagging-debug.ts
"use server";
import { prisma } from '@/lib/db/prisma';
```
- Properly marked with `"use server"`
- Server-only execution guaranteed

## 6. Authentication Flow

### Request Flow

1. **Middleware** (`src/middleware.ts`)
   - Uses `clerkMiddleware()` 
   - Protects routes at edge

2. **tRPC Context** (`src/server/api/trpc.ts`)
   - `auth()` from Clerk gets session
   - Creates context with `userId`
   - Available to all procedures

3. **Protected Procedures**
   - Use `protectedProcedure` base
   - Automatically check `ctx.userId`
   - Throw if unauthorized

4. **Public Procedures**
   - Use `publicProcedure` base
   - Optional auth via `ctx.userId`
   - Support anonymous users

### Authentication Boundaries

```
┌─────────────────────────────────────────┐
│          Browser (Client)               │
│  - useUser() hook from Clerk           │
│  - api.auth.getCurrentUser.useQuery()  │
│  - Public components                    │
└──────────────┬──────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────┐
│         Edge Middleware                 │
│  - clerkMiddleware()                   │
│  - Route protection                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│       tRPC Server Context              │
│  - auth() from Clerk                   │
│  - Creates userId context              │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Protected Procedures              │
│  - Requires ctx.userId                 │
│  - Throws if unauthorized              │
└─────────────────────────────────────────┘
```

## 7. Security Assessment

### ✅ Good Practices

1. **Proper Server/Client Separation**
   - Server components use server-side Clerk helpers
   - Client components use client-side hooks
   - No direct database access from client

2. **Type-Safe Authentication**
   - tRPC ensures type safety
   - Protected procedures enforce auth
   - Context propagation is automatic

3. **Environment Variable Security**
   - Secret keys validated with prefixes
   - Public keys properly marked
   - Webhook secrets for verification

4. **No Client→Server Direct Calls**
   - All client components use tRPC
   - No direct API route calls
   - Proper abstraction layers

### ⚠️ Areas for Attention

1. **Anonymous User Handling**
   - Special "ANONYMOUS_USER" in database
   - Browser fingerprinting for tracking
   - Consider privacy implications

2. **Webhook Security**
   - Webhook secret is optional in env validation
   - Should be required in production

3. **Rate Limiting**
   - Not visible in auth procedures
   - Consider adding for sensitive operations

## 8. Recommendations

### Immediate Actions

1. **Make Webhook Secret Required**
   ```typescript
   // src/lib/env.ts:10
   CLERK_WEBHOOK_SECRET: z.string().startsWith('whsec_'), // Remove .optional()
   ```

2. **Add Rate Limiting to Sensitive Operations**
   - `deleteAccount` mutation
   - `exportUserData` query
   - `createCheckoutSession` mutation

3. **Audit Anonymous User Access**
   - Review fingerprinting implementation
   - Ensure GDPR compliance
   - Add clear data retention policies

### Long-term Improvements

1. **Implement Session Management**
   - Add session invalidation
   - Device management
   - Activity logging

2. **Enhanced Monitoring**
   - Track failed auth attempts
   - Monitor unusual patterns
   - Alert on security events

3. **Zero-Trust Enhancements**
   - Add request signing
   - Implement API versioning
   - Add field-level permissions

## Conclusion

The authentication system is well-architected with proper boundaries:
- ✅ Clear server/client separation
- ✅ Type-safe tRPC procedures
- ✅ Proper Clerk integration
- ✅ No unsafe client→server calls
- ⚠️ Minor improvements needed for production hardening

The main risk areas are around anonymous user handling and optional security configurations that should be required in production environments.