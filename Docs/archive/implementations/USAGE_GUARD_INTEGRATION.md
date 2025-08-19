# Usage Guard Middleware Integration Guide

## Overview
This document shows how to integrate the new `usageGuard` middleware into the existing summary router.

## Files Created
1. `src/server/api/middleware/usageGuard.ts` - Main middleware implementation
2. `src/server/api/routers/summary/enhanced.example.ts` - Integration example

## Key Changes Required

### 1. Update tRPC Context (`src/server/api/trpc.ts`)
```diff
export const createTRPCContext = async () => {
  const { userId } = await auth()
  const headersList = headers()
  
  const correlationId = getCorrelationId(Object.fromEntries(headersList.entries()))
  const requestId = generateCorrelationId('trpc')

  return {
    prisma,
    userId,
    headers: headersList,
    correlationId,
    requestId,
+   usageCheck: null, // Will be populated by middleware
    logger: createLogger({
      component: 'trpc',
      correlationId,
      requestId,
      userId: userId || undefined,
    }),
  }
}
```

### 2. Update Summary Router (`src/server/api/routers/summary.ts`)

#### Import the middleware
```diff
+ import { 
+   ensureUsageAllowed,
+   recordUsageEvent,
+   recordAnonymousUsageEvent,
+   ANONYMOUS_USER_ID as ANON_ID
+ } from '@/server/api/middleware/usageGuard'
- import { 
-   enforceAnonymousUsageLimit, 
-   recordAnonymousUsage,
-   ANONYMOUS_USER_ID 
- } from './summary/guards'
```

#### Update createAnonymous procedure
```diff
createAnonymous: publicProcedure
  .input(/* ... */)
  .mutation(async ({ ctx, input }) => {
    const headersList = await ctx.headers
-   const clientIP = headersList.get('x-forwarded-for')?.split(',')[0].trim() || 
-                   headersList.get('x-real-ip') || 
-                   'unknown'
+   // Extract fingerprint from header if not in input
+   const fingerprint = input.browserFingerprint || 
+                      headersList.get('x-anon-fp') || 
+                      'unknown'
+   const clientIP = headersList.get('x-forwarded-for')?.split(',')[0].trim() || 
+                   headersList.get('x-real-ip') || 
+                   'unknown'
    
-   // Use the new guard to check and enforce usage limits
-   await enforceAnonymousUsageLimit(ctx.prisma, input.browserFingerprint, clientIP)
+   // Manual usage check for anonymous users
+   const usageCheck = await ensureUsageAllowed(
+     ctx.prisma,
+     null, // anonymous user
+     headersList
+   )
+   
+   if (!usageCheck.allowed) {
+     throw new TRPCError({
+       code: 'FORBIDDEN',
+       message: usageCheck.reason!,
+     })
+   }

    // ... rest of the creation logic ...

    // After successful creation:
-   await recordAnonymousUsage(
+   await recordAnonymousUsageEvent(
      ctx.prisma,
-     input.browserFingerprint,
+     fingerprint,
      clientIP,
      summary.id,
+     summary.videoId,
      {
        plan: 'ANONYMOUS',
        videoTitle: summary.videoTitle,
        channelName: summary.channelName,
        duration: summary.duration,
-       videoId: summary.videoId,
      }
    )
```

#### Update create procedure for authenticated users
```diff
create: protectedProcedure
  .input(/* ... */)
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.userId
    
-   // Check usage limits
-   const user = await ctx.prisma.user.findUnique({
-     where: { id: userId },
-     select: {
-       plan: true,
-       summariesLimit: true,
-       summariesUsed: true,
-     },
-   })
-   
-   // ... existing limit checking logic ...
+   // Use the new usage guard
+   const usageCheck = await ensureUsageAllowed(
+     ctx.prisma,
+     userId,
+     ctx.headers
+   )
+   
+   if (!usageCheck.allowed) {
+     throw new TRPCError({
+       code: 'FORBIDDEN',
+       message: usageCheck.reason!,
+     })
+   }

    // ... rest of the creation logic ...

    // After successful creation:
-   await ctx.prisma.usageEvent.create({
-     data: {
-       userId: userId,
-       eventType: 'summary_created',
-       summaryId: summary.id,
-       videoId: summary.videoId,
-       metadata: {
-         plan: user.plan,
-         videoTitle: summary.videoTitle,
-         channelName: summary.channelName,
-         duration: summary.duration,
-         timestamp: new Date().toISOString(),
-       },
-     },
-   })
+   await recordUsageEvent(
+     ctx.prisma,
+     userId,
+     summary.id,
+     summary.videoId,
+     {
+       plan: usageCheck.plan,
+       videoTitle: summary.videoTitle,
+       channelName: summary.channelName,
+       duration: summary.duration,
+     }
+   )
```

### 3. Update Frontend to Send Fingerprint Header (Optional)

#### Update API client (`src/lib/api/client.ts` or similar)
```diff
const createSummary = async (url: string, fingerprint?: string) => {
  const response = await fetch('/api/trpc/summary.createAnonymous', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
+     ...(fingerprint && { 'x-anon-fp': fingerprint }),
    },
    body: JSON.stringify({
      url,
-     browserFingerprint: fingerprint,
+     browserFingerprint: fingerprint, // Keep for backward compatibility
    }),
  })
  // ...
}
```

## Benefits of This Approach

1. **Centralized Logic**: All usage limit enforcement in one place
2. **Consistent Enforcement**: Same logic for anonymous and authenticated users
3. **Better Error Messages**: Clear, actionable messages for users
4. **Improved Tracking**: Comprehensive UsageEvent recording
5. **Header Support**: Can pass fingerprint via header for better security
6. **Plan Flexibility**: Easy to adjust limits per plan
7. **Middleware Option**: Can use as middleware or manual checks

## Testing the Integration

```typescript
// Test anonymous limit
const testAnonymous = async () => {
  const response = await fetch('/api/trpc/summary.createAnonymous', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-anon-fp': 'test-fingerprint-123',
    },
    body: JSON.stringify({
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    }),
  })
  
  if (!response.ok) {
    console.log('Limit enforced:', await response.json())
  }
}

// Test authenticated limit
const testAuthenticated = async () => {
  // Assumes user is logged in
  const response = await api.summary.create.mutate({
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  })
  // Check response
}
```

## Migration Notes

1. The old `guards.ts` file can be deprecated after migration
2. Existing UsageEvent records are compatible with the new system
3. The middleware approach is optional - you can use manual checks if preferred
4. Header-based fingerprint is optional - input-based still works

## Next Steps

1. Update the actual summary router with these changes
2. Test with different user types and plans
3. Monitor UsageEvent creation
4. Consider adding rate limiting on top of usage limits
5. Add metrics dashboard for usage tracking