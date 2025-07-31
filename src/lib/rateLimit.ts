import { NextRequest } from 'next/server'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyGenerator?: (req: NextRequest) => string // Function to generate unique key for client
}

interface RequestRecord {
  count: number
  resetTime: number
}

// In-memory store for rate limiting (use Redis in production)
const requestCounts = new Map<string, RequestRecord>()

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyGenerator } = options

  return (req: NextRequest) => {
    // Generate unique key for client (IP address by default)
    const key = keyGenerator 
      ? keyGenerator(req) 
      : req.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous'

    const now = Date.now()
    const record = requestCounts.get(key)

    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      const entries = Array.from(requestCounts.entries())
      for (const [k, v] of entries) {
        if (now > v.resetTime) {
          requestCounts.delete(k)
        }
      }
    }

    if (!record || now > record.resetTime) {
      // First request or window expired, create new record
      requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return {
        success: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      }
    }

    if (record.count >= maxRequests) {
      // Rate limit exceeded
      return {
        success: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      }
    }

    // Increment count
    record.count += 1
    return {
      success: true,
      remaining: maxRequests - record.count,
      resetTime: record.resetTime
    }
  }
}

// Pre-configured rate limiters
export const summaryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 summaries per IP per 15 minutes
})

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per IP per minute
})

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth attempts per IP per 15 minutes
})