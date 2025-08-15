import { TRPCError } from '@trpc/server'
import { t } from '@/server/api/trpc'
import type { PrismaClient, Plan } from '@prisma/client'
import { logger } from '@/lib/logger'
import { monitoring } from '@/lib/monitoring'

export const ANONYMOUS_USER_ID = 'ANONYMOUS_USER'

// Plan limits configuration
const PLAN_LIMITS = {
  FREE: 3,        // 3 summaries total (lifetime)
  PRO: 25,        // 25 summaries per month
  ENTERPRISE: -1, // Unlimited
} as const

interface UsageCheckResult {
  allowed: boolean
  reason?: string
  currentUsage?: number
  limit?: number
  userType: 'anonymous' | 'authenticated'
  plan?: Plan
}

/**
 * Extract anonymous fingerprint and IP from request headers
 */
function extractAnonymousIdentifiers(headers: Headers): { fingerprint: string | null; clientIP: string } {
  // Extract fingerprint from custom header
  const fingerprint = headers.get('x-anon-fp')
  
  // Extract client IP (prioritize forwarded headers)
  const clientIP = headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   headers.get('x-real-ip') || 
                   'unknown'
  
  return { fingerprint, clientIP }
}

/**
 * Check anonymous user usage limit
 */
async function checkAnonymousUsage(
  prisma: PrismaClient,
  fingerprint: string | null,
  clientIP: string
): Promise<UsageCheckResult> {
  // If no fingerprint provided, we can't track properly
  if (!fingerprint) {
    return {
      allowed: false,
      reason: 'Anonymous usage requires browser fingerprint',
      userType: 'anonymous',
    }
  }

  // Check UsageEvent records
  const existingUsage = await prisma.usageEvent.findFirst({
    where: {
      userId: ANONYMOUS_USER_ID,
      eventType: 'summary_created',
      OR: [
        {
          metadata: {
            path: ['browserFingerprint'],
            equals: fingerprint,
          },
        },
        {
          metadata: {
            path: ['clientIP'],
            equals: clientIP,
          },
        },
      ],
    },
  })

  if (existingUsage) {
    return {
      allowed: false,
      reason: 'Welcome back! You\'ve already used your free trial. Sign up now to get 3 free summaries!',
      currentUsage: 1,
      limit: 1,
      userType: 'anonymous',
    }
  }

  // Also check Summary records as backup
  const existingSummary = await prisma.summary.findFirst({
    where: {
      userId: ANONYMOUS_USER_ID,
      OR: [
        {
          metadata: {
            path: ['browserFingerprint'],
            equals: fingerprint,
          },
        },
        {
          metadata: {
            path: ['clientIP'],
            equals: clientIP,
          },
        },
      ],
    },
  })

  if (existingSummary) {
    return {
      allowed: false,
      reason: 'You\'ve already used your free trial. Sign up now to get 3 free summaries!',
      currentUsage: 1,
      limit: 1,
      userType: 'anonymous',
    }
  }

  return {
    allowed: true,
    currentUsage: 0,
    limit: 1,
    userType: 'anonymous',
  }
}

/**
 * Check authenticated user usage limit
 */
async function checkAuthenticatedUsage(
  prisma: PrismaClient,
  userId: string
): Promise<UsageCheckResult> {
  // Get user plan and limits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      summariesLimit: true,
    },
  })

  if (!user) {
    return {
      allowed: false,
      reason: 'User not found',
      userType: 'authenticated',
    }
  }

  // Get effective limit based on plan
  const effectiveLimit = user.summariesLimit > 0 
    ? user.summariesLimit 
    : PLAN_LIMITS[user.plan]

  // Unlimited plan
  if (effectiveLimit < 0) {
    return {
      allowed: true,
      userType: 'authenticated',
      plan: user.plan,
      limit: -1,
    }
  }

  let currentUsage: number

  if (user.plan === 'FREE') {
    // FREE plan: Count all summaries ever created
    currentUsage = await prisma.usageEvent.count({
      where: {
        userId: userId,
        eventType: 'summary_created',
      },
    })
  } else {
    // PRO/ENTERPRISE: Count summaries this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    currentUsage = await prisma.usageEvent.count({
      where: {
        userId: userId,
        eventType: 'summary_created',
        createdAt: {
          gte: startOfMonth,
        },
      },
    })
  }

  if (currentUsage >= effectiveLimit) {
    const resetInfo = user.plan === 'FREE'
      ? ''
      : ' Your limit resets on the 1st of next month.'
    
    const upgradeMessage = user.plan === 'FREE'
      ? ' Upgrade to Pro for 25 summaries per month!'
      : user.plan === 'PRO'
      ? ' Upgrade to Enterprise for unlimited summaries!'
      : ''

    return {
      allowed: false,
      reason: `You've reached your ${user.plan === 'FREE' ? 'lifetime' : 'monthly'} limit of ${effectiveLimit} summaries.${resetInfo}${upgradeMessage}`,
      currentUsage,
      limit: effectiveLimit,
      userType: 'authenticated',
      plan: user.plan,
    }
  }

  return {
    allowed: true,
    currentUsage,
    limit: effectiveLimit,
    userType: 'authenticated',
    plan: user.plan,
  }
}

/**
 * Record usage event after successful summary creation
 */
export async function recordUsageEvent(
  prisma: PrismaClient,
  userId: string,
  summaryId: string,
  videoId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await prisma.usageEvent.create({
    data: {
      userId,
      eventType: 'summary_created',
      summaryId,
      videoId,
      metadata: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    },
  })
}

/**
 * Record anonymous usage event
 */
export async function recordAnonymousUsageEvent(
  prisma: PrismaClient,
  fingerprint: string,
  clientIP: string,
  summaryId: string,
  videoId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await prisma.usageEvent.create({
    data: {
      userId: ANONYMOUS_USER_ID,
      eventType: 'summary_created',
      summaryId,
      videoId,
      metadata: {
        browserFingerprint: fingerprint,
        clientIP,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    },
  })
}

/**
 * Main usage enforcement function
 */
export async function ensureUsageAllowed(
  prisma: PrismaClient,
  userId: string | null,
  headers: Headers
): Promise<UsageCheckResult> {
  if (!userId || userId === ANONYMOUS_USER_ID) {
    // Anonymous user
    const { fingerprint, clientIP } = extractAnonymousIdentifiers(headers)
    return checkAnonymousUsage(prisma, fingerprint, clientIP)
  } else {
    // Authenticated user
    return checkAuthenticatedUsage(prisma, userId)
  }
}

/**
 * Middleware for enforcing usage limits
 */
export const usageGuardMiddleware = t.middleware(async ({ ctx, next, path }) => {
  // Skip for non-summary creation endpoints
  if (!path.includes('summary.create')) {
    return next()
  }

  const startTime = Date.now()
  
  try {
    // Check usage limits
    const usageCheck = await ensureUsageAllowed(
      ctx.prisma,
      ctx.userId,
      ctx.headers
    )

    if (!usageCheck.allowed) {
      // Log blocked attempt
      logger.warn('Usage limit exceeded', {
        userId: ctx.userId || 'anonymous',
        reason: usageCheck.reason,
        currentUsage: usageCheck.currentUsage,
        limit: usageCheck.limit,
        userType: usageCheck.userType,
        plan: usageCheck.plan,
      })

      // Track metric
      monitoring.logBusinessMetric('usage_limit_exceeded', 1, {
        userType: usageCheck.userType,
        plan: usageCheck.plan || 'anonymous',
        currentUsage: usageCheck.currentUsage,
        limit: usageCheck.limit,
      })

      throw new TRPCError({
        code: 'FORBIDDEN',
        message: usageCheck.reason || 'Usage limit exceeded',
      })
    }

    // Log allowed usage
    logger.info('Usage check passed', {
      userId: ctx.userId || 'anonymous',
      currentUsage: usageCheck.currentUsage,
      limit: usageCheck.limit,
      userType: usageCheck.userType,
      plan: usageCheck.plan,
    })

    // Add usage check result to context for downstream use
    const result = await next({
      ctx: {
        ...ctx,
        usageCheck,
      },
    })

    // Track successful usage check
    const duration = Date.now() - startTime
    monitoring.logBusinessMetric('usage_check_duration', duration, {
      userType: usageCheck.userType,
      plan: usageCheck.plan || 'anonymous',
      allowed: true,
    })

    return result
  } catch (error) {
    // Re-throw TRPC errors
    if (error instanceof TRPCError) {
      throw error
    }

    // Log unexpected errors
    logger.error('Usage guard middleware error', error as Error, {
      userId: ctx.userId || 'anonymous',
      path,
    })

    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to check usage limits',
    })
  }
})

/**
 * Create a procedure with usage guard
 */
export const usageProtectedProcedure = t.procedure.use(usageGuardMiddleware)