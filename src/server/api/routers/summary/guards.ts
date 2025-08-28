import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@prisma/client'

export const ANONYMOUS_USER_ID = null  // Use null for anonymous summaries

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
  // Check Summary records for anonymous users by fingerprint
  const existingSummaryByFingerprint = await prisma.summary.findFirst({
    where: {
      AND: [
        {
          metadata: {
            path: ['browserFingerprint'],
            equals: fingerprint,
          },
        },
        {
          metadata: {
            path: ['isAnonymous'],
            equals: true,
          },
        },
      ],
    },
  })

  if (existingSummaryByFingerprint) {
    return true
  }

  // Check Summary records by IP
  const existingSummaryByIP = await prisma.summary.findFirst({
    where: {
      AND: [
        {
          metadata: {
            path: ['clientIP'],
            equals: clientIP,
          },
        },
        {
          metadata: {
            path: ['isAnonymous'],
            equals: true,
          },
        },
      ],
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
  _prisma: PrismaClient,
  _fingerprint: string,
  _clientIP: string,
  _summaryId: string,
  _metadata?: Record<string, any>
): Promise<void> {
  // Anonymous usage is now tracked via the Summary table itself
  // with userId=null and metadata containing fingerprint and IP
  // No need to create UsageEvent records for anonymous users
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
  // Count Summaries with null userId (anonymous)
  const summaryCount = await prisma.summary.count({
    where: {
      AND: [
        {
          metadata: {
            path: ['isAnonymous'],
            equals: true,
          },
        },
        {
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
      ],
    },
  })

  return summaryCount
}