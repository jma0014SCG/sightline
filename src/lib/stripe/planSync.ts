import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import type { Plan } from '@prisma/client'

/**
 * Sync user plan between Clerk publicMetadata and Prisma database
 * This ensures consistency across both systems
 */
export async function syncUserPlan(
  userId: string,
  plan: Plan,
  stripeCustomerId?: string | null,
  stripeSubscriptionId?: string | null
) {
  try {
    // Update Clerk user's publicMetadata
    const clerk = await clerkClient()
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        plan: plan,
        stripeCustomerId: stripeCustomerId || undefined,
      },
    })
    
    logger.info(`Updated Clerk publicMetadata for user ${userId} to plan ${plan}`)
    
    // Update Prisma user record
    const summariesLimit = plan === 'FREE' ? 3 : plan === 'PRO' ? 25 : -1
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        summariesLimit,
        stripeCustomerId: stripeCustomerId || undefined,
        stripeSubscriptionId: stripeSubscriptionId || undefined,
      },
    })
    
    logger.info(`Updated Prisma record for user ${userId} to plan ${plan}`)
    
    return { success: true }
  } catch (error) {
    logger.error('Failed to sync user plan:', error)
    throw error
  }
}

/**
 * Get or create Stripe customer ID for a user
 */
export async function ensureStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  })
  
  if (user?.stripeCustomerId) {
    return user.stripeCustomerId
  }
  
  // Create new Stripe customer
  const { stripe } = await import('@/lib/stripe')
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  })
  
  // Save customer ID to database
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  })
  
  logger.info(`Created Stripe customer ${customer.id} for user ${userId}`)
  
  return customer.id
}