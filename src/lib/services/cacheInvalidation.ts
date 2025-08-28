import { userCache } from '@/lib/cache/memory-cache'
import { prisma } from '@/lib/db/prisma'
import { User } from '@prisma/client'

interface CacheInvalidationOptions {
  immediate?: boolean // Invalidate immediately vs lazy invalidation
  cascade?: boolean // Invalidate related caches
  broadcast?: boolean // Notify other services/workers
}

/**
 * Cache invalidation events that trigger updates
 */
export enum CacheInvalidationEvent {
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  SUBSCRIPTION_CHANGED = 'subscription.changed',
  USAGE_INCREMENTED = 'usage.incremented',
  USAGE_RESET = 'usage.reset',
  WEBHOOK_SYNC = 'webhook.sync',
}

/**
 * Invalidates user cache with various strategies
 */
export async function invalidateUserCache(
  userId: string,
  event: CacheInvalidationEvent,
  options: CacheInvalidationOptions = {}
): Promise<void> {
  const { immediate = true, cascade = true, broadcast = false } = options
  
  if (immediate) {
    // Immediately remove from cache
    const cacheKey = `user:${userId}`
    userCache.delete(cacheKey)
    
    // Also clear any session-specific caches
    const sessionKeys = userCache.keys().filter(key => 
      key.includes(userId) && key !== cacheKey
    )
    sessionKeys.forEach(key => userCache.delete(key))
  } else {
    // Mark as stale for lazy revalidation
    const cacheKey = `user:${userId}:stale`
    userCache.set(cacheKey, true, 1) // Mark stale for 1 second
  }
  
  if (cascade) {
    // Invalidate related caches
    await invalidateRelatedCaches(userId, event)
  }
  
  if (broadcast) {
    // Notify other services (could use Redis pub/sub, webhooks, etc.)
    await broadcastInvalidation(userId, event)
  }
}

/**
 * Invalidates caches related to a user
 */
async function invalidateRelatedCaches(
  userId: string,
  event: CacheInvalidationEvent
): Promise<void> {
  switch (event) {
    case CacheInvalidationEvent.SUBSCRIPTION_CHANGED:
      // Clear billing-related caches
      userCache.delete(`user:${userId}:subscription`)
      userCache.delete(`user:${userId}:limits`)
      break
      
    case CacheInvalidationEvent.USAGE_INCREMENTED:
    case CacheInvalidationEvent.USAGE_RESET:
      // Clear usage-related caches
      userCache.delete(`user:${userId}:usage`)
      userCache.delete(`user:${userId}:summaries`)
      break
      
    case CacheInvalidationEvent.USER_DELETED:
      // Clear all user-related caches
      const allKeys = userCache.keys().filter(key => key.includes(userId))
      allKeys.forEach(key => userCache.delete(key))
      break
  }
}

/**
 * Broadcasts cache invalidation to other services
 */
async function broadcastInvalidation(
  userId: string,
  event: CacheInvalidationEvent
): Promise<void> {
  // This could be implemented with:
  // - Redis pub/sub for real-time updates
  // - Database events table
  // - Message queue (SQS, RabbitMQ, etc.)
  // - WebSocket broadcasts
  
  // For now, log to database for other services to poll
  await prisma.usageEvent.create({
    data: {
      userId,
      eventType: `cache_invalidation`,
      metadata: {
        event,
        timestamp: new Date().toISOString()
      } as any
    }
  }).catch(console.error)
}

/**
 * Smart cache refresh that validates before fetching
 */
export async function refreshUserCache(
  userId: string,
  forceRefresh = false
): Promise<User | null> {
  const cacheKey = `user:${userId}`
  const staleKey = `user:${userId}:stale`
  
  // Check if marked as stale
  const isStale = userCache.get(staleKey)
  
  if (!forceRefresh && !isStale) {
    // Try to get from cache
    const cached = userCache.get(cacheKey)
    if (cached) return cached
  }
  
  // Fetch fresh data
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (user) {
    // Update cache with configurable TTL based on user type
    const ttl = determineCacheTTL(user)
    userCache.set(cacheKey, user, ttl)
    userCache.delete(staleKey) // Clear stale marker
  }
  
  return user
}

/**
 * Determines cache TTL based on user characteristics
 */
function determineCacheTTL(user: User): number {
  // Shorter TTL for users near their limits
  if (user.summariesUsed >= user.summariesLimit - 1) {
    return 10 // 10 seconds for users near limit
  }
  
  // Shorter TTL for paying users (more likely to have changes)
  if (user.plan === 'PRO' || user.plan === 'ENTERPRISE') {
    return 30 // 30 seconds for paying users
  }
  
  // Default TTL for free users
  return 60 // 60 seconds for free users
}

/**
 * Batch invalidation for multiple users
 */
export async function batchInvalidateUserCache(
  userIds: string[],
  event: CacheInvalidationEvent,
  options?: CacheInvalidationOptions
): Promise<void> {
  await Promise.all(
    userIds.map(userId => invalidateUserCache(userId, event, options))
  )
}

/**
 * Scheduled cache cleanup job
 */
export async function cleanupStaleCache(): Promise<number> {
  let cleaned = 0
  
  // Get all cache keys
  const allKeys = userCache.keys()
  
  for (const key of allKeys) {
    // Check if cache entry is expired
    const value = userCache.get(key)
    if (!value) {
      // Already expired, just counting
      cleaned++
    }
    
    // Check for stale markers older than 5 minutes
    if (key.includes(':stale')) {
      userCache.delete(key)
      cleaned++
    }
  }
  
  return cleaned
}

/**
 * Cache warming strategy for frequently accessed users
 */
export async function warmUserCache(userIds: string[]): Promise<void> {
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds }
    }
  })
  
  for (const user of users) {
    const ttl = determineCacheTTL(user)
    userCache.set(`user:${user.id}`, user, ttl)
  }
}

/**
 * Middleware to handle cache invalidation on mutations
 */
export function withCacheInvalidation<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  extractUserId: (args: Parameters<T>) => string | string[],
  event: CacheInvalidationEvent
): T {
  return (async (...args: Parameters<T>) => {
    const result = await fn(...args)
    
    // Extract user ID(s) from arguments
    const userIdOrIds = extractUserId(args)
    const userIds = Array.isArray(userIdOrIds) ? userIdOrIds : [userIdOrIds]
    
    // Invalidate cache for affected users
    await batchInvalidateUserCache(userIds, event, {
      immediate: true,
      cascade: true
    })
    
    return result
  }) as T
}

/**
 * Cache consistency validator (for debugging/monitoring)
 */
export async function validateCacheConsistency(userId: string): Promise<{
  isConsistent: boolean
  cached?: User
  database?: User
  differences?: string[]
}> {
  const cacheKey = `user:${userId}`
  const cached = userCache.get(cacheKey)
  const database = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!cached || !database) {
    return {
      isConsistent: !cached && !database,
      cached: cached || undefined,
      database: database || undefined
    }
  }
  
  // Compare critical fields
  const differences: string[] = []
  const criticalFields: (keyof User)[] = [
    'email', 'plan', 'summariesUsed', 'summariesLimit', 
    'stripeCustomerId', 'version'
  ]
  
  for (const field of criticalFields) {
    if (cached[field] !== database[field]) {
      differences.push(`${field}: cached=${cached[field]}, db=${database[field]}`)
    }
  }
  
  return {
    isConsistent: differences.length === 0,
    cached,
    database,
    differences: differences.length > 0 ? differences : undefined
  }
}