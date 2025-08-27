import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '@clerk/nextjs/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { headers } from 'next/headers'
import { monitoring } from '@/lib/monitoring'
import { getCorrelationId, generateCorrelationId } from '@/lib/api/correlation'
import { createLogger } from '@/lib/logger'
import { userCache } from '@/lib/cache/memory-cache'
import type { User } from '@prisma/client'

/**
 * Create context for each request
 */
export const createTRPCContext = async () => {
  const { userId } = await auth()
  const headersList = headers()
  
  // Extract or generate correlation ID
  const correlationId = getCorrelationId(Object.fromEntries(headersList.entries()))
  const requestId = generateCorrelationId('trpc')

  return {
    prisma,
    userId,
    headers: headersList,
    correlationId,
    requestId,
    userCache: new Map<string, User>(), // Per-request user cache
    logger: createLogger({
      component: 'trpc',
      correlationId,
      requestId,
      userId: userId || undefined,
    }),
  }
}

/**
 * Initialize tRPC
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * Performance monitoring middleware - tracks API call performance with correlation ID
 */
const performanceMonitoring = t.middleware(async ({ ctx, next, path, type }) => {
  const startTime = performance.now()
  const endpoint = `${type}:${path}`
  
  // Log request start
  ctx.logger.info(`API Request: ${endpoint}`, {
    endpoint,
    type,
    userId: ctx.userId || 'anonymous',
  })
  
  try {
    const result = await next()
    const duration = performance.now() - startTime
    
    // Log successful completion
    ctx.logger.info(`API Response: ${endpoint}`, {
      endpoint,
      duration: Math.round(duration),
      status: 'success',
    })
    
    // Track successful API call
    monitoring.logApiPerformance(endpoint, duration, 200)
    
    // Track API usage metrics with correlation ID
    monitoring.logUserAction('api_call', {
      endpoint,
      duration: Math.round(duration),
      status: 'success',
      type,
      userId: ctx.userId || 'anonymous',
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
    })
    
    return result
  } catch (error) {
    const duration = performance.now() - startTime
    
    // Log error with structured format
    ctx.logger.error(`API Error: ${endpoint}`, error instanceof Error ? error : undefined, {
      endpoint,
      duration: Math.round(duration),
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    
    // Track failed API call
    monitoring.logApiPerformance(endpoint, duration, 500)
    
    // Track API error metrics with correlation ID
    monitoring.logUserAction('api_call', {
      endpoint,
      duration: Math.round(duration),
      status: 'error',
      type,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: ctx.userId || 'anonymous',
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
    })
    
    // Log the error for monitoring
    monitoring.logError({
      error: error instanceof Error ? error : new Error('Unknown API error'),
      context: {
        endpoint,
        duration: Math.round(duration),
        type,
        userId: ctx.userId || 'anonymous',
        correlationId: ctx.correlationId,
        requestId: ctx.requestId,
      },
    })
    
    throw error
  }
})

/**
 * Create router and procedure helpers
 */
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure.use(performanceMonitoring)

/**
 * Protected procedure - requires authentication and ensures user exists in database
 */
const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  // Check per-request cache first
  let user = ctx.userCache.get(ctx.userId)
  
  if (!user) {
    // Check global cache
    const cacheKey = `user:${ctx.userId}`
    user = userCache.get(cacheKey)
    
    if (!user) {
      // Fetch from database
      const dbUser = await ctx.prisma.user.findUnique({
        where: { id: ctx.userId }
      })
      user = dbUser || undefined

      // If user doesn't exist, create them with minimal data
      // The webhook will update with full data when it fires
      if (!user) {
        try {
          user = await ctx.prisma.user.create({
            data: {
              id: ctx.userId,
              email: `temp_${ctx.userId}@placeholder.com`, // Temporary email, webhook will update
              name: null,
              image: null,
              emailVerified: null,
            },
          })
          
          console.log(`Auto-created minimal user in database: ${ctx.userId}`)
        } catch (error) {
          console.error('Failed to create user in database:', error)
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: 'Failed to initialize user account' 
          })
        }
      }
      
      // Cache the user data
      if (user) {
        userCache.set(cacheKey, user, 60) // Cache for 1 minute
      }
    }
    
    // Store in per-request cache
    if (user) {
      ctx.userCache.set(ctx.userId, user)
    }
  }

  return next({
    ctx: {
      // infers the `userId` as non-nullable
      userId: ctx.userId as string,
      user: user!,
      prisma: ctx.prisma,
      headers: ctx.headers,
      correlationId: ctx.correlationId,
      requestId: ctx.requestId,
      userCache: ctx.userCache,
      logger: ctx.logger.child({ userId: ctx.userId }),
    },
  })
})

export const protectedProcedure = t.procedure.use(performanceMonitoring).use(enforceUserIsAuthed)