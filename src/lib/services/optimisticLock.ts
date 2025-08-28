import { prisma } from '@/lib/db/prisma'
import { User } from '@prisma/client'

export class OptimisticLockError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OptimisticLockError'
  }
}

/**
 * Updates user with optimistic locking to prevent concurrent modifications
 * @param userId - User ID to update
 * @param updateFn - Function that returns the update data
 * @param maxRetries - Maximum number of retries on conflict (default: 3)
 */
export async function updateUserWithLock<T extends Partial<User>>(
  userId: string,
  updateFn: (currentUser: User) => T,
  maxRetries = 3
): Promise<User> {
  let attempts = 0
  
  while (attempts < maxRetries) {
    attempts++
    
    try {
      // Get current user state with version
      const currentUser = await prisma.user.findUnique({
        where: { id: userId }
      })
      
      if (!currentUser) {
        throw new Error(`User ${userId} not found`)
      }
      
      // Get update data from the function
      const updateData = updateFn(currentUser)
      
      // Attempt to update with version check
      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
          version: currentUser.version // Optimistic lock check
        },
        data: {
          ...updateData,
          version: { increment: 1 } // Always increment version
        } as any
      })
      
      return updatedUser
    } catch (error: any) {
      // Check if it's a version conflict (record not found due to version mismatch)
      if (
        error.code === 'P2025' && // Prisma "Record not found" error
        attempts < maxRetries
      ) {
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => 
          setTimeout(resolve, Math.min(100 * Math.pow(2, attempts - 1), 1000))
        )
        continue
      }
      
      // If we've exhausted retries or it's a different error, throw
      if (attempts >= maxRetries) {
        throw new OptimisticLockError(
          `Failed to update user ${userId} after ${maxRetries} attempts due to concurrent modifications`
        )
      }
      
      throw error
    }
  }
  
  throw new OptimisticLockError(`Failed to update user ${userId} after ${maxRetries} attempts`)
}

/**
 * Increments user's summary usage with optimistic locking
 */
export async function incrementSummaryUsage(userId: string): Promise<User> {
  return updateUserWithLock(
    userId,
    (currentUser) => ({
      summariesUsed: currentUser.summariesUsed + 1
    })
  )
}

/**
 * Updates user plan with optimistic locking
 */
export async function updateUserPlan(
  userId: string,
  plan: 'FREE' | 'PRO' | 'ENTERPRISE',
  summariesLimit: number
): Promise<User> {
  return updateUserWithLock(
    userId,
    () => ({
      plan,
      summariesLimit
    })
  )
}

/**
 * Resets monthly usage with optimistic locking
 */
export async function resetMonthlyUsage(userId: string): Promise<User> {
  return updateUserWithLock(
    userId,
    () => ({
      summariesUsed: 0
    })
  )
}

/**
 * Batch updates multiple users with optimistic locking
 * Uses transactions to ensure atomicity
 */
export async function batchUpdateUsersWithLock(
  updates: Array<{
    userId: string
    updateFn: (currentUser: User) => Partial<User>
  }>
): Promise<User[]> {
  return prisma.$transaction(async (tx) => {
    const results: User[] = []
    
    for (const { userId, updateFn } of updates) {
      const currentUser = await tx.user.findUnique({
        where: { id: userId }
      })
      
      if (!currentUser) {
        throw new Error(`User ${userId} not found`)
      }
      
      const updateData = updateFn(currentUser)
      
      const updatedUser = await tx.user.update({
        where: {
          id: userId,
          version: currentUser.version
        },
        data: {
          ...updateData,
          version: { increment: 1 }
        }
      })
      
      results.push(updatedUser)
    }
    
    return results
  })
}