import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { incrementSummaryUsage } from './optimisticLock'
import { withLock } from './distributedLock'

/**
 * Creates a summary with atomic user usage update
 * Ensures consistency between summary creation and usage tracking
 */
export async function createSummaryAtomic(
  userId: string | null,
  summaryData: Prisma.SummaryCreateInput
): Promise<{
  summary: any
  user: any | null
}> {
  // For anonymous users, no transaction needed
  if (!userId) {
    const summary = await prisma.summary.create({
      data: summaryData
    })
    return { summary, user: null }
  }
  
  // Use distributed lock to prevent concurrent summary creation
  return withLock(
    `user:${userId}:summary-creation`,
    async () => {
      // Use transaction for atomic operation
      return prisma.$transaction(async (tx) => {
        // Check current usage within transaction
        const currentUser = await tx.user.findUnique({
          where: { id: userId }
        })
        
        if (!currentUser) {
          throw new Error('User not found')
        }
        
        // Check limits
        if (currentUser.summariesUsed >= currentUser.summariesLimit) {
          throw new Error('Summary limit exceeded')
        }
        
        // Create summary and update usage atomically
        const [summary, updatedUser] = await Promise.all([
          tx.summary.create({
            data: summaryData as any
          }),
          tx.user.update({
            where: {
              id: userId,
              version: currentUser.version // Optimistic lock
            },
            data: {
              summariesUsed: { increment: 1 },
              version: { increment: 1 }
            }
          })
        ])
        
        return { summary, user: updatedUser }
      }, {
        maxWait: 5000, // Max wait time for transaction slot
        timeout: 10000, // Transaction timeout
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable // Highest isolation
      })
    },
    { ttl: 10000, retries: 3 } // Lock options
  )
}

/**
 * Deletes a summary with atomic user usage update
 */
export async function deleteSummaryAtomic(
  summaryId: string,
  userId: string
): Promise<void> {
  return withLock(
    `user:${userId}:summary-deletion`,
    async () => {
      return prisma.$transaction(async (tx) => {
        // Verify ownership
        const summary = await tx.summary.findUnique({
          where: { id: summaryId }
        })
        
        if (!summary || summary.userId !== userId) {
          throw new Error('Summary not found or unauthorized')
        }
        
        // Delete summary and decrement usage atomically
        await Promise.all([
          tx.summary.delete({
            where: { id: summaryId }
          }),
          tx.user.update({
            where: { id: userId },
            data: {
              summariesUsed: { decrement: 1 },
              version: { increment: 1 }
            }
          })
        ])
      })
    }
  )
}

/**
 * Updates subscription with atomic plan changes
 */
export async function updateSubscriptionAtomic(
  userId: string,
  subscriptionData: {
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    stripePriceId?: string
    stripeCurrentPeriodEnd?: Date
    plan: 'FREE' | 'PRO' | 'ENTERPRISE'
  }
): Promise<any> {
  return prisma.$transaction(async (tx) => {
    const currentUser = await tx.user.findUnique({
      where: { id: userId }
    })
    
    if (!currentUser) {
      throw new Error('User not found')
    }
    
    // Determine new limits based on plan
    const summariesLimit = 
      subscriptionData.plan === 'ENTERPRISE' ? 999999 :
      subscriptionData.plan === 'PRO' ? 25 : 3
    
    // Update user with new subscription data
    const updatedUser = await tx.user.update({
      where: {
        id: userId,
        version: currentUser.version
      },
      data: {
        ...subscriptionData,
        summariesLimit,
        version: { increment: 1 }
      }
    })
    
    // Log the subscription change
    await tx.usageEvent.create({
      data: {
        userId,
        eventType: `subscription_${subscriptionData.plan.toLowerCase()}`,
        metadata: subscriptionData as any
      }
    })
    
    return updatedUser
  })
}

/**
 * Handles user signup with atomic operations
 * Creates user, initializes settings, and logs event
 */
export async function handleUserSignupAtomic(
  userData: {
    id: string
    email: string
    name?: string | null
    image?: string | null
    emailVerified?: Date | null
  }
): Promise<any> {
  return prisma.$transaction(async (tx) => {
    // Create or update user (upsert for idempotency)
    const user = await tx.user.upsert({
      where: { id: userData.id },
      update: {
        email: userData.email,
        name: userData.name,
        image: userData.image,
        emailVerified: userData.emailVerified,
        version: { increment: 1 }
      },
      create: {
        ...userData,
        plan: 'FREE',
        summariesUsed: 0,
        summariesLimit: 3,
        version: 0
      }
    })
    
    // Log signup event
    await tx.usageEvent.create({
      data: {
        userId: user.id,
        eventType: 'user_signup',
        metadata: { source: 'clerk_webhook' } as any
      }
    })
    
    return user
  })
}

/**
 * Resets monthly usage for all users atomically
 * Used in scheduled jobs
 */
export async function resetMonthlyUsageAtomic(): Promise<number> {
  const result = await prisma.user.updateMany({
    where: {
      summariesUsed: { gt: 0 },
      plan: { in: ['FREE', 'PRO'] } // Don't reset Enterprise users
    },
    data: {
      summariesUsed: 0,
      version: { increment: 1 }
    }
  })
  
  // Log reset event
  await prisma.usageEvent.create({
    data: {
      userId: 'system',
      eventType: 'monthly_reset',
      metadata: { 
        usersReset: result.count,
        timestamp: new Date().toISOString()
      } as any
    }
  })
  
  return result.count
}

/**
 * Creates share link with atomic operations
 */
export async function createShareLinkAtomic(
  summaryId: string,
  userId: string,
  slug: string
): Promise<any> {
  return prisma.$transaction(async (tx) => {
    // Verify ownership
    const summary = await tx.summary.findUnique({
      where: { id: summaryId }
    })
    
    if (!summary || summary.userId !== userId) {
      throw new Error('Summary not found or unauthorized')
    }
    
    // Create share link
    const shareLink = await tx.shareLink.create({
      data: {
        slug,
        summaryId,
        userId,
        isPublic: false,
        views: 0
      }
    })
    
    // Log share event
    await tx.usageEvent.create({
      data: {
        userId,
        eventType: 'share_created',
        metadata: { summaryId, slug } as any
      }
    })
    
    return shareLink
  })
}