/**
 * Simple in-memory cache with TTL support
 * Used for caching frequently accessed data to reduce database load
 */
export class MemoryCache<T = any> {
  private cache = new Map<string, { value: T; expiry: number }>()
  private defaultTTL: number

  constructor(defaultTTLSeconds = 300) { // 5 minutes default
    this.defaultTTL = defaultTTLSeconds * 1000
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) {
      return null
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }

  /**
   * Set value in cache with optional TTL
   */
  set(key: string, value: T, ttlSeconds?: number): void {
    const ttl = (ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL)
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    })
  }

  /**
   * Delete from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<R extends T>(
    key: string, 
    factory: () => Promise<R>,
    ttlSeconds?: number
  ): Promise<R> {
    const cached = this.get(key)
    if (cached !== null) {
      return cached as R
    }
    
    const value = await factory()
    this.set(key, value, ttlSeconds)
    return value
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instances
export const userCache = new MemoryCache(60) // 1 minute for user data
export const summaryCache = new MemoryCache(300) // 5 minutes for summaries
export const statsCache = new MemoryCache(120) // 2 minutes for stats