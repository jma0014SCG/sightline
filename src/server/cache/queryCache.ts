/**
 * Query Cache Implementation
 * Provides simple in-memory caching for expensive database queries
 * Safe mode: Uses in-memory cache instead of Redis for simplicity
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  // TTL in seconds
  private defaultTTL = {
    userCount: 300,        // 5 minutes
    summaryCount: 60,      // 1 minute
    recentSummaries: 30,   // 30 seconds
    userSummaries: 60,     // 1 minute
    monthlyPro: 120,       // 2 minutes
  };

  /**
   * Get cached value or execute query
   */
  async getCached<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check if cache entry exists and is still valid
    const entry = this.cache.get(key);
    
    if (entry) {
      const age = Date.now() - entry.timestamp;
      if (age < entry.ttl * 1000) {
        // Cache hit
        return entry.data as T;
      }
    }
    
    // Cache miss - execute query
    const data = await queryFn();
    
    // Store in cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || 60, // Default 60 seconds
    });
    
    return data;
  }

  /**
   * Get cached count with specific TTL
   */
  async getCachedCount(
    key: string,
    queryFn: () => Promise<number>,
    type: keyof typeof this.defaultTTL = 'summaryCount'
  ): Promise<number> {
    return this.getCached(key, queryFn, this.defaultTTL[type]);
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate all user-specific caches
   */
  invalidateUser(userId: string): void {
    this.invalidate(`user:${userId}`);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    const keys = Array.from(this.cache.keys());
    
    // Rough memory estimation
    const memoryUsage = keys.reduce((total, key) => {
      const entry = this.cache.get(key);
      const size = JSON.stringify(entry).length;
      return total + size;
    }, 0);
    
    return {
      size: this.cache.size,
      keys,
      memoryUsage,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      if (age > entry.ttl * 1000) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Singleton instance
export const queryCache = new QueryCache();

// Auto cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    queryCache.cleanup();
  }, 5 * 60 * 1000);
}

// Export helper functions for common queries
export async function getCachedUserCount(
  queryFn: () => Promise<number>
): Promise<number> {
  return queryCache.getCachedCount('global:user:count', queryFn, 'userCount');
}

export async function getCachedSummaryCount(
  userId: string,
  queryFn: () => Promise<number>
): Promise<number> {
  return queryCache.getCachedCount(
    `user:${userId}:summary:count`,
    queryFn,
    'summaryCount'
  );
}

export async function getCachedMonthlySummaries(
  userId: string,
  queryFn: () => Promise<number>
): Promise<number> {
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  
  return queryCache.getCachedCount(
    `user:${userId}:monthly:${year}-${month}`,
    queryFn,
    'monthlyPro'
  );
}