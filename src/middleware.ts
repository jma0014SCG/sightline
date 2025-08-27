import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware } from "@/lib/middleware/rateLimit";
import { corsMiddleware, shouldApplyCors } from "@/lib/middleware/cors";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health(.*)",
  "/api/diagnostic(.*)",
  "/api/ping(.*)",
  "/api/webhooks(.*)",
  "/api/test(.*)",
  "/api/test-backend(.*)",
  "/api/backend-health(.*)",
  "/api/direct-summary(.*)",
  "/api/trpc/summary.createAnonymous(.*)",
  "/api/trpc/summary.getAnonymous(.*)",
  "/api/trpc/share.getBySlug(.*)",
  "/share/(.*)", // Public share pages
]);

/**
 * Clerk middleware v6 with integrated rate limiting and CORS
 * Order: Clerk Auth -> Rate Limiting -> CORS
 * 
 * Note: Clerk middleware must be the default export and run on all routes
 * for auth() to work properly in server components and API routes
 */
export default clerkMiddleware(async (auth, req: NextRequest) => {
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

  // 3. Apply authentication protection for non-public routes
  // This ensures auth() is available in all routes while only protecting non-public ones
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Merge rate limit headers if they exist
  if (rateLimitResponse) {
    const rateLimitHeaders = rateLimitResponse.headers;
    rateLimitHeaders.forEach((value, key) => {
      if (key.startsWith("X-RateLimit-")) {
        response.headers.set(key, value);
      }
    });
  }

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};