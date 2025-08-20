/**
 * Rate limiting service using Upstash Redis
 * Enforces the rate limits defined in src/lib/rateLimits.ts
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RATE_LIMITS, type RateLimitConfig } from "@/lib/rateLimits";

// Initialize Redis client - will use UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from env
let redis: Redis | null = null;

// Initialize Redis only if environment variables are available
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = Redis.fromEnv();
}

// Create rate limiters for different plans and endpoints
export const rateLimiters = {
  // Anonymous user rate limiters
  anonymous: {
    healthCheck: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.ANONYMOUS.HEALTH_CHECK.limit,
        RATE_LIMITS.ANONYMOUS.HEALTH_CHECK.window
      ),
      analytics: true,
      prefix: "rl:anon:health",
    }) : null,
    
    createSummary: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "1 d"), // 1 per day for anonymous
      analytics: true,
      prefix: "rl:anon:summary",
    }) : null,
    
    getSummary: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.ANONYMOUS.GET_SUMMARY.limit,
        RATE_LIMITS.ANONYMOUS.GET_SUMMARY.window
      ),
      analytics: true,
      prefix: "rl:anon:get",
    }) : null,
  },

  // Free plan rate limiters
  free: {
    createSummary: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "30 d"), // 3 lifetime for free
      analytics: true,
      prefix: "rl:free:summary",
    }) : null,
    
    general: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 h"), // General API limit
      analytics: true,
      prefix: "rl:free:api",
    }) : null,
  },

  // Pro plan rate limiters
  pro: {
    createSummary: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(25, "30 d"), // 25 per month
      analytics: true,
      prefix: "rl:pro:summary",
    }) : null,
    
    general: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(500, "1 h"), // Higher general limit
      analytics: true,
      prefix: "rl:pro:api",
    }) : null,
  },

  // Enterprise plan (no rate limiting for most endpoints)
  enterprise: {
    general: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2000, "1 h"), // Very high limit
      analytics: true,
      prefix: "rl:enterprise:api",
    }) : null,
  },

  // Webhook rate limiters
  webhooks: {
    clerk: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.WEBHOOKS.CLERK.limit,
        RATE_LIMITS.WEBHOOKS.CLERK.window
      ),
      analytics: true,
      prefix: "rl:webhook:clerk",
    }) : null,
    
    stripe: redis ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        RATE_LIMITS.WEBHOOKS.STRIPE.limit,
        RATE_LIMITS.WEBHOOKS.STRIPE.window
      ),
      analytics: true,
      prefix: "rl:webhook:stripe",
    }) : null,
  },

  // Progress endpoint (high frequency)
  progress: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      RATE_LIMITS.PROGRESS.GET_PROGRESS.limit,
      RATE_LIMITS.PROGRESS.GET_PROGRESS.window
    ),
    analytics: true,
    prefix: "rl:progress",
  }) : null,

  // Global rate limiter for DDoS protection
  global: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, "1 m"), // 1000 requests per minute per IP
    analytics: true,
    prefix: "rl:global",
  }) : null,
};

/**
 * Check if rate limiting is enabled (Redis is configured)
 */
export function isRateLimitingEnabled(): boolean {
  return redis !== null;
}

/**
 * Get the appropriate rate limiter for a user based on their plan
 */
export function getRateLimiterForUser(
  plan: 'FREE' | 'PRO' | 'ENTERPRISE' | 'ANONYMOUS',
  endpoint: 'createSummary' | 'general' = 'general'
): Ratelimit | null {
  if (!isRateLimitingEnabled()) return null;

  switch (plan) {
    case 'ANONYMOUS':
      return endpoint === 'createSummary' 
        ? rateLimiters.anonymous.createSummary 
        : rateLimiters.anonymous.getSummary;
    case 'FREE':
      return endpoint === 'createSummary'
        ? rateLimiters.free.createSummary
        : rateLimiters.free.general;
    case 'PRO':
      return endpoint === 'createSummary'
        ? rateLimiters.pro.createSummary
        : rateLimiters.pro.general;
    case 'ENTERPRISE':
      return rateLimiters.enterprise.general;
    default:
      return rateLimiters.free.general; // Default to free plan limits
  }
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Check rate limit for a given identifier
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<RateLimitResult> {
  // If rate limiting is not enabled, always allow
  if (!limiter) {
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 3600000, // 1 hour from now
    };
  }

  try {
    const result = await limiter.limit(identifier);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (error) {
    // If Redis is down, allow the request but log the error
    console.error('Rate limiting error:', error);
    return {
      success: true,
      limit: 999999,
      remaining: 999999,
      reset: Date.now() + 3600000,
    };
  }
}

/**
 * Reset rate limit for a specific identifier (useful for testing)
 */
export async function resetRateLimit(identifier: string, prefix: string): Promise<boolean> {
  if (!redis) return false;
  
  try {
    const key = `${prefix}:${identifier}`;
    await redis.del(key);
    return true;
  } catch (error) {
    console.error('Failed to reset rate limit:', error);
    return false;
  }
}

/**
 * Get current usage for an identifier
 */
export async function getRateLimitUsage(identifier: string, prefix: string): Promise<number | null> {
  if (!redis) return null;
  
  try {
    const key = `${prefix}:${identifier}`;
    const usage = await redis.get(key);
    return usage ? parseInt(usage as string) : 0;
  } catch (error) {
    console.error('Failed to get rate limit usage:', error);
    return null;
  }
}