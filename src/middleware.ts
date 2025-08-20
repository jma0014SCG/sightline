import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "@/lib/middleware/rateLimit";
import { corsMiddleware, shouldApplyCors } from "@/lib/middleware/cors";

/**
 * Combined middleware that applies rate limiting, CORS, and authentication
 * Order: Rate Limiting -> CORS -> Authentication
 */
async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. Apply rate limiting first (to prevent DDoS)
  const rateLimitResponse = await rateLimitMiddleware(req);
  if (rateLimitResponse?.status === 429) {
    // Request is rate limited, return 429 response
    return rateLimitResponse;
  }

  // 2. Apply CORS for API routes
  let response = NextResponse.next();
  if (shouldApplyCors(path)) {
    response = corsMiddleware(req);
    
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      return response;
    }
  }

  // 3. Apply Clerk authentication
  // We need to pass through the response with CORS headers
  const authMiddleware = clerkMiddleware();
  const authResponse = await authMiddleware(req, {
    // Pass the response with CORS headers
    next: () => response,
  } as any);

  // Merge rate limit headers if they exist
  if (rateLimitResponse && authResponse) {
    const rateLimitHeaders = rateLimitResponse.headers;
    rateLimitHeaders.forEach((value, key) => {
      if (key.startsWith("X-RateLimit-")) {
        authResponse.headers.set(key, value);
      }
    });
  }

  return authResponse || response;
}

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};