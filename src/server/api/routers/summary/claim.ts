import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@prisma/client'

/**
 * Claim an anonymous summary after user signs up
 * 
 * Transfers ownership of an anonymous summary to the authenticated user.
 * This allows users to save summaries they created before signing up.
 * 
 * @param prisma - Prisma client instance
 * @param userId - The authenticated user's ID
 * @param summaryId - The ID of the anonymous summary to claim
 * @returns The updated summary with new ownership
 */
export async function claimAnonymousSummary(
  prisma: PrismaClient,
  userId: string,
  summaryId: string
) {
  // Find the anonymous summary
  const summary = await prisma.summary.findUnique({
    where: { id: summaryId },
    select: {
      id: true,
      userId: true,
      metadata: true,
      videoId: true,
      videoTitle: true
    }
  })

  if (!summary) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Summary not found'
    })
  }

  // Check if it's actually an anonymous summary
  if (summary.userId !== null) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This summary has already been claimed'
    })
  }

  // Check if the metadata indicates it's anonymous
  const metadata = summary.metadata as any
  if (!metadata?.isAnonymous) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This is not an anonymous summary'
    })
  }

  // Check if user already has this video summarized
  const existingSummary = await prisma.summary.findFirst({
    where: {
      userId: userId,
      videoId: summary.videoId
    }
  })

  if (existingSummary) {
    // User already has this video, just delete the anonymous one
    await prisma.summary.delete({
      where: { id: summaryId }
    })
    
    return existingSummary
  }

  // Transfer ownership to the user
  const updatedSummary = await prisma.summary.update({
    where: { id: summaryId },
    data: {
      userId: userId,
      metadata: {
        ...metadata,
        claimedAt: new Date().toISOString(),
        wasAnonymous: true,
        isAnonymous: false,
        // Remove sensitive anonymous tracking data
        browserFingerprint: undefined,
        clientIP: undefined
      }
    }
  })

  // Create a usage event for tracking
  await prisma.usageEvent.create({
    data: {
      userId: userId,
      eventType: 'anonymous_summary_claimed',
      metadata: {
        summaryId: summaryId,
        videoTitle: summary.videoTitle,
        claimedAt: new Date().toISOString()
      }
    }
  })

  return updatedSummary
}

/**
 * Auto-claim pending anonymous summaries after sign-up
 * 
 * Called after user completes sign-up to automatically claim any
 * summaries they created anonymously before signing up.
 * 
 * @param prisma - Prisma client instance
 * @param userId - The newly authenticated user's ID
 * @param fingerprint - The browser fingerprint to match anonymous summaries
 * @returns Array of claimed summary IDs
 */
export async function autoClaimAnonymousSummaries(
  prisma: PrismaClient,
  userId: string,
  fingerprint?: string
) {
  if (!fingerprint) {
    return []
  }

  // Find all anonymous summaries with matching fingerprint
  const anonymousSummaries = await prisma.summary.findMany({
    where: {
      userId: null,
      metadata: {
        path: ['browserFingerprint'],
        equals: fingerprint
      }
    },
    select: {
      id: true,
      videoId: true
    }
  })

  const claimedIds: string[] = []

  // Claim each summary
  for (const summary of anonymousSummaries) {
    try {
      // Check if user already has this video
      const existingSummary = await prisma.summary.findFirst({
        where: {
          userId: userId,
          videoId: summary.videoId
        }
      })

      if (!existingSummary) {
        await claimAnonymousSummary(prisma, userId, summary.id)
        claimedIds.push(summary.id)
      } else {
        // Delete the anonymous duplicate
        await prisma.summary.delete({
          where: { id: summary.id }
        })
      }
    } catch (error) {
      // Log but continue with other summaries
      console.error(`Failed to claim summary ${summary.id}:`, error)
    }
  }

  return claimedIds
}