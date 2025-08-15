import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@prisma/client'

export const ANONYMOUS_USER_ID = 'ANONYMOUS_USER'

/**
 * Check if an anonymous user has exceeded their usage limit
 * 
 * Checks both UsageEvent records and existing Summary records
 * for the given fingerprint and IP address combination.
 * 
 * @param prisma - Prisma client instance
 * @param fingerprint - The browser fingerprint from the client
 * @param clientIP - The client's IP address
 * @returns boolean - true if limit exceeded, false otherwise
 */
export async function checkAnonymousUsageLimit(
  prisma: PrismaClient,
  fingerprint: string,
  clientIP: string
): Promise<boolean> {
  // Check UsageEvent records for this fingerprint
  const existingUsageByFingerprint = await prisma.usageEvent.findFirst({
    where: {
      userId: ANONYMOUS_USER_ID,
      eventType: 'summary_created',
      metadata: {
        path: ['browserFingerprint'],
        equals: fingerprint,
      },
    },
  })

  if (existingUsageByFingerprint) {
    return true
  }

  // Check UsageEvent records for this IP
  const existingUsageByIP = await prisma.usageEvent.findFirst({
    where: {
      userId: ANONYMOUS_USER_ID,
      eventType: 'summary_created',
      metadata: {
        path: ['clientIP'],
        equals: clientIP,
      },
    },
  })

  if (existingUsageByIP) {
    return true
  }

  // Also check Summary records as a backup
  // This handles cases where summaries were created before UsageEvent tracking
  const existingSummaryByFingerprint = await prisma.summary.findFirst({
    where: {
      userId: ANONYMOUS_USER_ID,
      metadata: {
        path: ['browserFingerprint'],
        equals: fingerprint,
      },
    },
  })

  if (existingSummaryByFingerprint) {
    return true
  }

  // Check Summary records by IP
  const existingSummaryByIP = await prisma.summary.findFirst({
    where: {
      userId: ANONYMOUS_USER_ID,
      metadata: {
        path: ['clientIP'],
        equals: clientIP,
      },
    },
  })

  if (existingSummaryByIP) {
    return true
  }

  return false
}

/**
 * Enforce anonymous usage limit
 * 
 * Throws a FORBIDDEN error if the user has exceeded their limit
 * 
 * @param prisma - Prisma client instance
 * @param fingerprint - The browser fingerprint from the client
 * @param clientIP - The client's IP address
 * @throws TRPCError with FORBIDDEN code if limit exceeded
 */
export async function enforceAnonymousUsageLimit(
  prisma: PrismaClient,
  fingerprint: string,
  clientIP: string
): Promise<void> {
  const hasExceededLimit = await checkAnonymousUsageLimit(prisma, fingerprint, clientIP)
  
  if (hasExceededLimit) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Welcome back! You\'ve already used your free trial. Sign up now to get 1 free summary every month!',
    })
  }
}

/**
 * Record anonymous usage event
 * 
 * Creates a UsageEvent record to track anonymous summary creation
 * 
 * @param prisma - Prisma client instance
 * @param fingerprint - The browser fingerprint from the client
 * @param clientIP - The client's IP address
 * @param summaryId - The ID of the created summary
 * @param metadata - Additional metadata to store
 */
export async function recordAnonymousUsage(
  prisma: PrismaClient,
  fingerprint: string,
  clientIP: string,
  summaryId: string,
  metadata?: Record<string, any>
): Promise<void> {
  await prisma.usageEvent.create({
    data: {
      userId: ANONYMOUS_USER_ID,
      eventType: 'summary_created',
      metadata: {
        browserFingerprint: fingerprint,
        clientIP,
        summaryId,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    },
  })
}

/**
 * Get anonymous usage count for a fingerprint/IP combination
 * 
 * Returns the total number of summaries created by this anonymous user
 * 
 * @param prisma - Prisma client instance
 * @param fingerprint - The browser fingerprint from the client
 * @param clientIP - The client's IP address
 * @returns number - The count of summaries created
 */
export async function getAnonymousUsageCount(
  prisma: PrismaClient,
  fingerprint: string,
  clientIP: string
): Promise<number> {
  const [usageEventCount, summaryCount] = await Promise.all([
    // Count UsageEvents
    prisma.usageEvent.count({
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
    }),
    // Count Summaries
    prisma.summary.count({
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
    }),
  ])

  // Return the maximum count from either source
  return Math.max(usageEventCount, summaryCount)
}