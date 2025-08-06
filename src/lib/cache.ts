/**
 * Caching system with Redis/Upstash integration
 * Falls back to in-memory caching for development
 */

interface CacheConfig {
  ttl?: number // Time to live in seconds
  prefix?: string
}

interface CacheEntry<T> {
  value: T
  expiry: number
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry<any>>()
  private redis: any = null
  private isRedisEnabled = false

  constructor() {
    // Initialize Redis connection if Upstash URL is provided
    if (process.env.UPSTASH_REDIS_URL) {
      this.initializeRedis()
    }
  }

  private async initializeRedis() {
    try {
      // Dynamic import to avoid bundling Redis in client
      if (typeof window === 'undefined') {
        const { Redis } = await import('@upstash/redis')
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_URL!,
          token: process.env.UPSTASH_REDIS_TOKEN!,
        })
        this.isRedisEnabled = true
        console.log('✅ Redis cache initialized')
      }
    } catch (error) {
      console.warn('❌ Failed to initialize Redis cache, falling back to memory:', error)
      this.isRedisEnabled = false
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key)

    try {
      if (this.isRedisEnabled && this.redis) {
        const value = await this.redis.get(fullKey)
        return value ? JSON.parse(value) : null
      }

      // Memory cache fallback
      const entry = this.memoryCache.get(fullKey)
      if (entry && Date.now() < entry.expiry) {
        return entry.value
      }

      // Clean up expired entry
      if (entry) {
        this.memoryCache.delete(fullKey)
      }

      return null
    } catch (error) {
      console.warn('Cache get error:', error)
      return null
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, config?: CacheConfig): Promise<boolean> {
    const fullKey = this.buildKey(key, config?.prefix)
    const ttl = config?.ttl || 3600 // Default 1 hour

    try {
      if (this.isRedisEnabled && this.redis) {
        await this.redis.setex(fullKey, ttl, JSON.stringify(value))
        return true
      }

      // Memory cache fallback
      this.memoryCache.set(fullKey, {
        value,
        expiry: Date.now() + (ttl * 1000),
      })

      // Clean up memory cache periodically
      this.cleanupMemoryCache()
      return true
    } catch (error) {
      console.warn('Cache set error:', error)
      return false
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, prefix?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, prefix)

    try {
      if (this.isRedisEnabled && this.redis) {
        await this.redis.del(fullKey)
        return true
      }

      // Memory cache fallback
      return this.memoryCache.delete(fullKey)
    } catch (error) {
      console.warn('Cache delete error:', error)
      return false
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, prefix)

    try {
      if (this.isRedisEnabled && this.redis) {
        const exists = await this.redis.exists(fullKey)
        return exists === 1
      }

      // Memory cache fallback
      const entry = this.memoryCache.get(fullKey)
      return entry ? Date.now() < entry.expiry : false
    } catch (error) {
      console.warn('Cache exists error:', error)
      return false
    }
  }

  /**
   * Clear cache by pattern (Redis only)
   */
  async clearByPattern(pattern: string): Promise<number> {
    try {
      if (this.isRedisEnabled && this.redis) {
        const keys = await this.redis.keys(`sightline:${pattern}`)
        if (keys.length > 0) {
          await this.redis.del(...keys)
          return keys.length
        }
        return 0
      }

      // Memory cache - clear matching keys
      let count = 0
      const prefix = `sightline:${pattern.replace('*', '')}`
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryCache.delete(key)
          count++
        }
      }
      return count
    } catch (error) {
      console.warn('Cache clearByPattern error:', error)
      return 0
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      redisEnabled: this.isRedisEnabled,
      memoryEntries: this.memoryCache.size,
      type: this.isRedisEnabled ? 'redis' : 'memory',
    }
  }

  private buildKey(key: string, prefix?: string): string {
    const namespace = 'sightline'
    const keyPrefix = prefix || 'general'
    return `${namespace}:${keyPrefix}:${key}`
  }

  private cleanupMemoryCache(): void {
    // Clean up expired entries (run occasionally)
    if (Math.random() < 0.01) { // 1% chance
      const now = Date.now()
      for (const [key, entry] of this.memoryCache.entries()) {
        if (now >= entry.expiry) {
          this.memoryCache.delete(key)
        }
      }
    }
  }
}

// Singleton instance
const cache = new CacheService()

// Convenience functions
export const getFromCache = <T>(key: string): Promise<T | null> => cache.get<T>(key)
export const setInCache = <T>(key: string, value: T, ttl?: number): Promise<boolean> => 
  cache.set(key, value, { ttl })
export const deleteFromCache = (key: string): Promise<boolean> => cache.delete(key)
export const cacheExists = (key: string): Promise<boolean> => cache.exists(key)

// Specialized cache functions
export const USER_CACHE_TTL = 15 * 60 // 15 minutes
export const SUMMARY_CACHE_TTL = 60 * 60 // 1 hour
export const LIBRARY_CACHE_TTL = 5 * 60 // 5 minutes

/**
 * Cache user data
 */
export const cacheUser = (userId: string, userData: any): Promise<boolean> => {
  return cache.set(`user:${userId}`, userData, { 
    ttl: USER_CACHE_TTL,
    prefix: 'user'
  })
}

/**
 * Get cached user data
 */
export const getCachedUser = (userId: string) => {
  return cache.get(`user:${userId}`)
}

/**
 * Cache summary metadata
 */
export const cacheSummary = (summaryId: string, summary: any): Promise<boolean> => {
  return cache.set(`summary:${summaryId}`, summary, {
    ttl: SUMMARY_CACHE_TTL,
    prefix: 'summary'
  })
}

/**
 * Get cached summary
 */
export const getCachedSummary = (summaryId: string) => {
  return cache.get(`summary:${summaryId}`)
}

/**
 * Cache library data
 */
export const cacheLibrary = (userId: string, page: number, filters: any, data: any): Promise<boolean> => {
  const cacheKey = `library:${userId}:${page}:${JSON.stringify(filters)}`
  return cache.set(cacheKey, data, {
    ttl: LIBRARY_CACHE_TTL,
    prefix: 'library'
  })
}

/**
 * Get cached library data
 */
export const getCachedLibrary = (userId: string, page: number, filters: any) => {
  const cacheKey = `library:${userId}:${page}:${JSON.stringify(filters)}`
  return cache.get(cacheKey)
}

/**
 * Invalidate user-related cache
 */
export const invalidateUserCache = async (userId: string): Promise<void> => {
  await Promise.all([
    cache.delete(`user:${userId}`, 'user'),
    cache.clearByPattern(`library:${userId}:*`),
    cache.clearByPattern(`summary:*`) // Could be more specific
  ])
}

/**
 * Cache wrapper for async functions
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getCacheKey: (...args: T) => string,
  ttl: number = 3600
) {
  return async (...args: T): Promise<R> => {
    const cacheKey = getCacheKey(...args)
    
    // Try to get from cache first
    const cached = await cache.get<R>(cacheKey)
    if (cached !== null) {
      return cached
    }

    // Execute function and cache result
    const result = await fn(...args)
    await cache.set(cacheKey, result, { ttl })
    
    return result
  }
}

export default cache