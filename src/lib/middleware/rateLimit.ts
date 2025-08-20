/**
 * Rate limiting middleware for Next.js
 * Non-blocking implementation that gracefully degrades if Redis is unavailable
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  getRateLimiterForUser, 
  checkRateLimit, 
  rateLimiters,
  isRateLimitingEnabled 
} from "@/lib/services/rateLimiter";
import { createRateLimitHeaders, createRateLimitError } from "@/lib/rateLimits";

/**
 * Extract identifier from request (IP or user ID)
 */
function getIdentifier(req: NextRequest): string {
  // Try to get IP from various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  
  // Use the first available IP or fall back to a default
  const ip = forwardedFor?.split(",")[0] || realIp || cfConnectingIp || "unknown";
  
  return ip;
}

/**
 * Determine which rate limiter to use based on the path
 */
function selectRateLimiter(path: string) {
  // Webhook endpoints
  if (path.includes("/api/webhooks/clerk")) {
    return rateLimiters.webhooks.clerk;
  }
  if (path.includes("/api/webhooks/stripe")) {
    return rateLimiters.webhooks.stripe;
  }
  
  // Progress endpoint (high frequency allowed)
  if (path.includes("/api/progress")) {
    return rateLimiters.progress;
  }
  
  // Health check endpoint
  if (path.includes("/api/health")) {
    return rateLimiters.anonymous.healthCheck;
  }
  
  // Default to global rate limiter for general protection
  return rateLimiters.global;
}

/**
 * Rate limiting middleware
 * @param req - Next.js request object
 * @returns Response if rate limited, null otherwise
 */
export async function rateLimitMiddleware(
  req: NextRequest
): Promise<NextResponse | null> {
  // Skip rate limiting for static assets and Next.js internals
  const path = req.nextUrl.pathname;
  if (
    path.startsWith("/_next") ||
    path.startsWith("/static") ||
    path.match(/\.(ico|png|jpg|jpeg|svg|css|js|map)$/)
  ) {
    return null;
  }

  // Check if rate limiting is enabled
  if (!isRateLimitingEnabled()) {
    // Rate limiting not configured, allow request but add warning header
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Status", "disabled");
    return null;
  }

  try {
    // Get identifier for rate limiting
    const identifier = getIdentifier(req);
    
    // Select appropriate rate limiter based on endpoint
    const limiter = selectRateLimiter(path);
    
    // Check rate limit
    const result = await checkRateLimit(identifier, limiter);
    
    // If rate limited, return 429 response
    if (!result.success) {
      const resetDate = new Date(result.reset);
      const errorResponse = createRateLimitError(
        result.limit,
        "1 minute", // Default window for global limiter
        resetDate
      );
      
      return NextResponse.json(errorResponse, {
        status: 429,
        headers: createRateLimitHeaders(
          result.limit,
          result.remaining,
          result.reset,
          "global"
        ) as any,
      });
    }
    
    // Add rate limit headers to successful responses
    // We'll add these in the middleware chain
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", result.limit.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.reset.toString());
    
    return null; // Allow request to proceed
  } catch (error) {
    // Log error but don't block request (fail open for availability)
    console.error("Rate limiting middleware error:", error);
    
    // Add header to indicate rate limiting error
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Status", "error");
    return null;
  }
}

/**
 * Rate limit check for API routes (can be used in API handlers)
 */
export async function checkApiRateLimit(
  identifier: string,
  plan: 'FREE' | 'PRO' | 'ENTERPRISE' | 'ANONYMOUS' = 'FREE',
  endpoint: 'createSummary' | 'general' = 'general'
): Promise<{ allowed: boolean; headers: Record<string, string> }> {
  const limiter = getRateLimiterForUser(plan, endpoint);
  const result = await checkRateLimit(identifier, limiter);
  
  const headers = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  };
  
  return {
    allowed: result.success,
    headers,
  };
}