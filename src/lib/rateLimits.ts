/**
 * Rate limit configuration for Sightline.ai API endpoints
 * All limits are enforced per the time windows specified
 */

export const RATE_LIMITS = {
  // Anonymous user limits
  ANONYMOUS: {
    HEALTH_CHECK: { limit: 60, window: '1m' },
    CREATE_SUMMARY: { limit: 1, window: 'lifetime' },
    GET_SUMMARY: { limit: 10, window: '1h' },
  },

  // Authenticated user limits by plan
  FREE: {
    CREATE_SUMMARY: { limit: 3, window: 'lifetime' },
    GET_LIBRARY: { limit: 100, window: '1h' },
    GET_SUMMARY: { limit: 300, window: '1h' },
    UPDATE_SUMMARY: { limit: 60, window: '1h' },
    DELETE_SUMMARY: { limit: 30, window: '1h' },
    AUTH_ENDPOINTS: { limit: 60, window: '1h' },
    BILLING_ENDPOINTS: { limit: 20, window: '1h' },
  },

  PRO: {
    CREATE_SUMMARY: { limit: 25, window: 'month' },
    GET_LIBRARY: { limit: 500, window: '1h' },
    GET_SUMMARY: { limit: 1000, window: '1h' },
    UPDATE_SUMMARY: { limit: 200, window: '1h' },
    DELETE_SUMMARY: { limit: 100, window: '1h' },
    AUTH_ENDPOINTS: { limit: 60, window: '1h' },
    BILLING_ENDPOINTS: { limit: 20, window: '1h' },
  },

  ENTERPRISE: {
    CREATE_SUMMARY: { limit: -1, window: 'unlimited' }, // -1 means unlimited
    GET_LIBRARY: { limit: 1000, window: '1h' },
    GET_SUMMARY: { limit: 2000, window: '1h' },
    UPDATE_SUMMARY: { limit: 500, window: '1h' },
    DELETE_SUMMARY: { limit: 200, window: '1h' },
    AUTH_ENDPOINTS: { limit: 60, window: '1h' },
    BILLING_ENDPOINTS: { limit: 20, window: '1h' },
  },

  // Special endpoints
  WEBHOOKS: {
    CLERK: { limit: 1000, window: '1h' },
    STRIPE: { limit: 1000, window: '1h' },
  },

  // Progress tracking (high frequency allowed)
  PROGRESS: {
    GET_PROGRESS: { limit: 120, window: '1m' },
  },

  // External API quotas
  EXTERNAL: {
    OPENAI: {
      TOKENS_PER_MINUTE: 90000,
      REQUESTS_PER_MINUTE: 200,
      MONTHLY_BUDGET: 500, // in USD
    },
    YOUTUBE: {
      DAILY_QUOTA: 10000,
      SEARCH_COST: 100,
      VIDEO_DETAILS_COST: 1,
    },
    STRIPE: {
      REQUESTS_PER_SECOND: 100,
    },
  },
} as const

// Type definitions for rate limit configuration
export interface RateLimitConfig {
  limit: number
  window: '1m' | '1h' | 'month' | 'lifetime' | 'unlimited'
}

// Helper function to get rate limit for a user
export function getRateLimitForUser(
  plan: 'FREE' | 'PRO' | 'ENTERPRISE',
  endpoint: keyof typeof RATE_LIMITS.FREE
): RateLimitConfig {
  return RATE_LIMITS[plan][endpoint]
}

// Rate limit key generators
export function getAnonymousRateLimitKey(
  fingerprint: string,
  ip: string,
  endpoint: string
): string {
  return `rate_limit:anon:${fingerprint}:${ip}:${endpoint}`
}

export function getUserRateLimitKey(userId: string, endpoint: string): string {
  return `rate_limit:user:${userId}:${endpoint}`
}

export function getGlobalRateLimitKey(endpoint: string): string {
  return `rate_limit:global:${endpoint}`
}

// Rate limit response headers
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
  'X-RateLimit-Policy': string
}

export function createRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number,
  policy: string
): RateLimitHeaders {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
    'X-RateLimit-Policy': policy,
  }
}

// Rate limit error response
export interface RateLimitError {
  error: {
    code: 'RATE_LIMITED'
    message: string
    retryAfter: number
    limit: number
    window: string
    resetAt: string
  }
}

export function createRateLimitError(
  limit: number,
  window: string,
  resetAt: Date
): RateLimitError {
  const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000)
  
  return {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      retryAfter,
      limit,
      window,
      resetAt: resetAt.toISOString(),
    },
  }
}