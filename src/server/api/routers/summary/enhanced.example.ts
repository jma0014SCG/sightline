/**
 * Example integration of the usageGuard middleware with the summary router
 * This shows how to refactor the existing summary.ts to use the new middleware
 */

import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { 
  usageProtectedProcedure,
  recordUsageEvent,
  recordAnonymousUsageEvent,
  extractAnonymousIdentifiers,
  ANONYMOUS_USER_ID
} from '@/server/api/middleware/usageGuard'

export const enhancedSummaryRouter = createTRPCRouter({
  /**
   * Enhanced createAnonymous with middleware
   * The middleware automatically checks usage limits before execution
   */
  createAnonymous: usageProtectedProcedure
    .input(z.object({
      url: z.string().url(),
      // Note: browserFingerprint can now be passed via x-anon-fp header
      browserFingerprint: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Extract identifiers from headers or input
      const headersList = ctx.headers
      const { fingerprint: headerFp, clientIP } = extractAnonymousIdentifiers(headersList)
      const fingerprint = input.browserFingerprint || headerFp || 'unknown'
      
      // Usage check already performed by middleware
      // ctx.usageCheck contains the result
      console.log('Usage check result:', ctx.usageCheck)
      
      try {
        // ... existing summary creation logic ...
        
        // Create summary
        const summary = await ctx.prisma.summary.create({
          data: {
            userId: ANONYMOUS_USER_ID,
            // ... other fields ...
            metadata: {
              browserFingerprint: fingerprint,
              clientIP,
              isAnonymous: true,
              // ... other metadata ...
            },
          },
        })
        
        // Record usage event (moved to separate function)
        await recordAnonymousUsageEvent(
          ctx.prisma,
          fingerprint,
          clientIP,
          summary.id,
          summary.videoId,
          {
            plan: 'ANONYMOUS',
            videoTitle: summary.videoTitle,
            channelName: summary.channelName,
            duration: summary.duration,
          }
        )
        
        return summary
      } catch (error) {
        // Error handling
        throw error
      }
    }),

  /**
   * Enhanced create for authenticated users with middleware
   */
  create: usageProtectedProcedure
    .input(z.object({
      url: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Usage check already performed by middleware
      const { usageCheck } = ctx
      
      console.log('Authenticated usage check:', {
        plan: usageCheck.plan,
        currentUsage: usageCheck.currentUsage,
        limit: usageCheck.limit,
      })
      
      try {
        // ... existing summary creation logic ...
        
        // Create summary
        const summary = await ctx.prisma.summary.create({
          data: {
            userId: ctx.userId!,
            // ... other fields ...
          },
        })
        
        // Record usage event
        await recordUsageEvent(
          ctx.prisma,
          ctx.userId!,
          summary.id,
          summary.videoId,
          {
            plan: usageCheck.plan,
            videoTitle: summary.videoTitle,
            channelName: summary.channelName,
            duration: summary.duration,
          }
        )
        
        return summary
      } catch (error) {
        // Error handling
        throw error
      }
    }),
})

/**
 * Alternative: Manual usage checking without middleware
 * Use when you need more control over the flow
 */
import { ensureUsageAllowed } from '@/server/api/middleware/usageGuard'

export const manualCheckExample = publicProcedure
  .input(z.object({ url: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Manual usage check
    const usageCheck = await ensureUsageAllowed(
      ctx.prisma,
      ctx.userId,
      ctx.headers
    )
    
    if (!usageCheck.allowed) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: usageCheck.reason!,
      })
    }
    
    // Proceed with summary creation
    // ...
  })