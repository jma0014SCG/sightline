/**
 * Test suite for authentication security improvements
 */

import { prisma } from '@/lib/db/prisma'
import { acquireLock, releaseLock, withLock, isLocked } from '@/lib/services/distributedLock'
import { 
  updateUserWithLock, 
  incrementSummaryUsage,
  OptimisticLockError 
} from '@/lib/services/optimisticLock'
import {
  createSummaryAtomic,
  updateSubscriptionAtomic,
  handleUserSignupAtomic
} from '@/lib/services/atomicTransactions'
import {
  enqueueWebhook,
  processWebhookQueue,
  getWebhookQueueStats
} from '@/lib/services/webhookQueue'
import {
  invalidateUserCache,
  refreshUserCache,
  CacheInvalidationEvent,
  validateCacheConsistency
} from '@/lib/services/cacheInvalidation'
import { userCache } from '@/lib/cache/memory-cache'

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn()
    },
    summary: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn()
    },
    usageEvent: {
      create: jest.fn()
    },
    shareLink: {
      create: jest.fn()
    }
  }
}))

describe('Distributed Locking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should acquire and release a lock successfully', async () => {
    const lockKey = 'test:resource:1'
    const lockId = 'mock-lock-id'
    
    // Mock successful lock acquisition
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    ;(prisma.$queryRaw as any).mockResolvedValue([{ 
      id: lockId, 
      key: lockKey,
      expiresAt: new Date(Date.now() + 30000)
    }])

    const acquiredLockId = await acquireLock(lockKey)
    expect(acquiredLockId).toBe(lockId)
    
    // Test lock release
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    const released = await releaseLock(lockId)
    expect(released).toBe(true)
  })

  it('should prevent concurrent lock acquisition', async () => {
    const lockKey = 'test:resource:2'
    
    // First lock succeeds
    ;(prisma.$executeRaw as any).mockResolvedValueOnce(1)
    ;(prisma.$queryRaw as any).mockResolvedValueOnce([{ 
      id: 'lock-1',
      key: lockKey,
      expiresAt: new Date(Date.now() + 30000)
    }])
    
    // Second lock fails (no rows returned)
    ;(prisma.$executeRaw as any).mockResolvedValue(0)
    ;(prisma.$queryRaw as any).mockResolvedValue([])
    
    const lock1 = await acquireLock(lockKey)
    expect(lock1).toBe('lock-1')
    
    const lock2 = await acquireLock(lockKey, { retries: 1, retryDelay: 10 })
    expect(lock2).toBeNull()
  })

  it('should execute function with lock protection', async () => {
    const lockKey = 'test:resource:3'
    
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    ;(prisma.$queryRaw as any).mockResolvedValue([{
      id: 'lock-3',
      key: lockKey,
      expiresAt: new Date(Date.now() + 30000)
    }])
    
    let executed = false
    const result = await withLock(lockKey, async () => {
      executed = true
      return 'success'
    })
    
    expect(executed).toBe(true)
    expect(result).toBe('success')
  })
})

describe('Optimistic Locking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update user with version check', async () => {
    const userId = 'user-123'
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      summariesUsed: 5,
      version: 1
    }
    
    ;(prisma.user.findUnique as any).mockResolvedValue(mockUser)
    ;(prisma.user.update as any).mockResolvedValue({
      ...mockUser,
      summariesUsed: 6,
      version: 2
    })
    
    const updated = await incrementSummaryUsage(userId)
    expect(updated.summariesUsed).toBe(6)
    expect(updated.version).toBe(2)
  })

  it('should retry on version conflict', async () => {
    const userId = 'user-456'
    const mockUser = {
      id: userId,
      email: 'test@example.com',
      summariesUsed: 5,
      version: 1
    }
    
    // First attempt - version conflict
    ;(prisma.user.findUnique as any).mockResolvedValueOnce(mockUser)
    ;(prisma.user.update as any).mockRejectedValueOnce({ 
      code: 'P2025',
      message: 'Record not found' 
    })
    
    // Second attempt - success with updated version
    ;(prisma.user.findUnique as any).mockResolvedValueOnce({
      ...mockUser,
      version: 2
    })
    ;(prisma.user.update as any).mockResolvedValueOnce({
      ...mockUser,
      summariesUsed: 6,
      version: 3
    })
    
    const updated = await updateUserWithLock(
      userId,
      (user) => ({ summariesUsed: user.summariesUsed + 1 })
    )
    
    expect(updated.version).toBe(3)
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2)
  })

  it('should throw OptimisticLockError after max retries', async () => {
    const userId = 'user-789'
    
    ;(prisma.user.findUnique as any).mockResolvedValue({
      id: userId,
      version: 1
    })
    ;(prisma.user.update as any).mockRejectedValue({ 
      code: 'P2025',
      message: 'Record not found' 
    })
    
    await expect(
      updateUserWithLock(
        userId,
        (user) => ({ summariesUsed: user.summariesUsed + 1 }),
        2 // Only 2 retries
      )
    ).rejects.toThrow(OptimisticLockError)
  })
})

describe('Atomic Transactions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create summary atomically with usage update', async () => {
    const userId = 'user-321'
    const mockUser = {
      id: userId,
      summariesUsed: 2,
      summariesLimit: 10,
      version: 1
    }
    
    const mockSummary = {
      id: 'summary-123',
      userId,
      videoTitle: 'Test Video'
    }
    
    ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const tx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockResolvedValue({
            ...mockUser,
            summariesUsed: 3,
            version: 2
          })
        },
        summary: {
          create: jest.fn().mockResolvedValue(mockSummary)
        }
      }
      return callback(tx)
    })
    
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    ;(prisma.$queryRaw as any).mockResolvedValue([{
      id: 'lock-id',
      key: `user:${userId}:summary-creation`
    }])
    
    const result = await createSummaryAtomic(userId, {
      videoTitle: 'Test Video',
      videoUrl: 'https://youtube.com/test',
      videoId: 'test-123',
      channelName: 'Test Channel',
      channelId: 'channel-123',
      duration: 100,
      content: 'Test content'
    } as any)
    
    expect(result.summary).toBeDefined()
    expect(result.user?.summariesUsed).toBe(3)
  })

  it('should handle user signup atomically', async () => {
    const userData = {
      id: 'new-user-123',
      email: 'new@example.com',
      name: 'New User',
      image: null,
      emailVerified: new Date()
    }
    
    ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const tx = {
        user: {
          upsert: jest.fn().mockResolvedValue({
            ...userData,
            plan: 'FREE',
            summariesUsed: 0,
            summariesLimit: 3
          })
        },
        usageEvent: {
          create: jest.fn().mockResolvedValue({
            id: 'event-123',
            userId: userData.id,
            eventType: 'user_signup'
          })
        }
      }
      return callback(tx)
    })
    
    const user = await handleUserSignupAtomic(userData)
    
    expect(user.plan).toBe('FREE')
    expect(user.summariesLimit).toBe(3)
  })

  it('should prevent summary creation when limit exceeded', async () => {
    const userId = 'user-limit'
    const mockUser = {
      id: userId,
      summariesUsed: 3,
      summariesLimit: 3, // At limit
      version: 1
    }
    
    ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const tx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser)
        }
      }
      try {
        await callback(tx)
      } catch (error) {
        throw error
      }
    })
    
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    ;(prisma.$queryRaw as any).mockResolvedValue([{
      id: 'lock-id',
      key: `user:${userId}:summary-creation`
    }])
    
    await expect(
      createSummaryAtomic(userId, {} as any)
    ).rejects.toThrow('Summary limit exceeded')
  })
})

describe('Webhook Queue with Retry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should enqueue webhook for processing', async () => {
    const webhookId = 'webhook-123'
    const payload = {
      type: 'user.created',
      data: { id: 'user-123' }
    }
    
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    
    await enqueueWebhook(webhookId, payload)
    
    expect(prisma.$executeRaw).toHaveBeenCalledWith(
      expect.anything(),
      webhookId,
      JSON.stringify(payload),
      0,
      5,
      'pending',
      expect.anything(),
      expect.anything()
    )
  })

  it('should process webhook from queue', async () => {
    const mockJob = {
      id: 'webhook-456',
      payload: { type: 'user.updated', data: { id: 'user-456' } },
      attempts: 0,
      maxAttempts: 5
    }
    
    ;(prisma.$queryRaw as any).mockResolvedValue([mockJob])
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    
    const handler = jest.fn().mockResolvedValue(undefined)
    await processWebhookQueue(handler)
    
    expect(handler).toHaveBeenCalledWith(mockJob.payload)
  })

  it('should retry failed webhooks with backoff', async () => {
    const mockJob = {
      id: 'webhook-789',
      payload: { type: 'user.deleted' },
      attempts: 1,
      maxAttempts: 5
    }
    
    ;(prisma.$queryRaw as any).mockResolvedValue([mockJob])
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    
    const handler = jest.fn().mockRejectedValue(new Error('Network error'))
    await processWebhookQueue(handler)
    
    // Should schedule for retry, not mark as failed
    expect(prisma.$executeRaw).toHaveBeenCalledWith(
      expect.anything(),
      'pending',
      'Network error',
      expect.any(Date),
      mockJob.id
    )
  })

  it('should mark webhook as failed after max attempts', async () => {
    const mockJob = {
      id: 'webhook-fail',
      payload: { type: 'test' },
      attempts: 4, // One below max
      maxAttempts: 5
    }
    
    ;(prisma.$queryRaw as any).mockResolvedValue([mockJob])
    ;(prisma.$executeRaw as any).mockResolvedValue(1)
    
    const handler = jest.fn().mockRejectedValue(new Error('Persistent error'))
    await processWebhookQueue(handler)
    
    // Should mark as failed
    expect(prisma.$executeRaw).toHaveBeenCalledWith(
      expect.anything(),
      'failed',
      'Persistent error',
      expect.anything(),
      mockJob.id
    )
  })
})

describe('Cache Invalidation Strategy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    userCache.clear()
  })

  it('should invalidate user cache immediately', async () => {
    const userId = 'user-cache-1'
    const userData = { id: userId, email: 'test@example.com' }
    
    // Set cache
    userCache.set(`user:${userId}`, userData)
    expect(userCache.get(`user:${userId}`)).toBe(userData)
    
    // Invalidate
    await invalidateUserCache(userId, CacheInvalidationEvent.USER_UPDATED)
    
    expect(userCache.get(`user:${userId}`)).toBeNull()
  })

  it('should mark cache as stale for lazy invalidation', async () => {
    const userId = 'user-cache-2'
    
    await invalidateUserCache(
      userId, 
      CacheInvalidationEvent.USAGE_INCREMENTED,
      { immediate: false }
    )
    
    expect(userCache.get(`user:${userId}:stale`)).toBe(true)
  })

  it('should cascade invalidation to related caches', async () => {
    const userId = 'user-cache-3'
    
    // Set multiple related caches
    userCache.set(`user:${userId}`, { id: userId })
    userCache.set(`user:${userId}:subscription`, { plan: 'PRO' })
    userCache.set(`user:${userId}:limits`, { limit: 25 })
    
    await invalidateUserCache(
      userId,
      CacheInvalidationEvent.SUBSCRIPTION_CHANGED,
      { cascade: true }
    )
    
    // Primary and related caches should be cleared
    expect(userCache.get(`user:${userId}`)).toBeNull()
    expect(userCache.get(`user:${userId}:subscription`)).toBeNull()
    expect(userCache.get(`user:${userId}:limits`)).toBeNull()
  })

  it('should refresh cache with smart TTL', async () => {
    const userId = 'user-cache-4'
    const userData = {
      id: userId,
      email: 'test@example.com',
      summariesUsed: 24,
      summariesLimit: 25, // Near limit
      plan: 'PRO'
    }
    
    ;(prisma.user.findUnique as any).mockResolvedValue(userData)
    
    const refreshed = await refreshUserCache(userId)
    expect(refreshed).toEqual(userData)
    
    // Should be cached with short TTL (10 seconds for near-limit users)
    expect(userCache.get(`user:${userId}`)).toEqual(userData)
  })

  it('should validate cache consistency', async () => {
    const userId = 'user-cache-5'
    const cachedData = { 
      id: userId, 
      email: 'cached@example.com',
      plan: 'FREE',
      summariesUsed: 2,
      summariesLimit: 3,
      version: 1
    }
    const dbData = {
      ...cachedData,
      summariesUsed: 3, // Different value
      version: 2 // Different version
    }
    
    userCache.set(`user:${userId}`, cachedData as any)
    ;(prisma.user.findUnique as any).mockResolvedValue(dbData)
    
    const validation = await validateCacheConsistency(userId)
    
    expect(validation.isConsistent).toBe(false)
    expect(validation.differences).toContain('summariesUsed: cached=2, db=3')
    expect(validation.differences).toContain('version: cached=1, db=2')
  })
})

describe('Integration: Race Condition Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should prevent concurrent summary creation', async () => {
    const userId = 'user-race-1'
    const mockUser = {
      id: userId,
      summariesUsed: 2,
      summariesLimit: 3,
      version: 1
    }
    
    // Simulate two concurrent requests
    const lockAcquisitions: string[] = []
    
    ;(prisma.$executeRaw as any).mockImplementation(() => {
      if (lockAcquisitions.length === 0) {
        lockAcquisitions.push('first')
        return Promise.resolve(1)
      }
      // Second request fails to get lock
      return Promise.resolve(0)
    })
    
    ;(prisma.$queryRaw as any).mockImplementation(() => {
      if (lockAcquisitions[0] === 'first') {
        return Promise.resolve([{ id: 'lock-1' }])
      }
      return Promise.resolve([])
    })
    
    ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const tx = {
        user: {
          findUnique: jest.fn().mockResolvedValue(mockUser),
          update: jest.fn().mockResolvedValue({
            ...mockUser,
            summariesUsed: 3
          })
        },
        summary: {
          create: jest.fn().mockResolvedValue({ id: 'summary-new' })
        }
      }
      return callback(tx)
    })
    
    // First request should succeed
    const result1 = createSummaryAtomic(userId, {} as any)
    
    // Second request should fail to get lock
    const result2 = createSummaryAtomic(userId, {} as any)
    
    const [res1, res2] = await Promise.allSettled([result1, result2])
    
    expect(res1.status).toBe('fulfilled')
    expect(res2.status).toBe('rejected')
  })
})