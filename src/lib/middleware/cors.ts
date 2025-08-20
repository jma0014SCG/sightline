/**
 * CORS (Cross-Origin Resource Sharing) middleware for Next.js
 * Configures allowed origins and methods for API security
 */

import { NextRequest, NextResponse } from "next/server";

// Allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  const origins = [
    process.env.NEXT_PUBLIC_APP_URL || "https://sightline.ai",
    "https://clerk.com",
    "https://accounts.clerk.com",
    "https://api.clerk.com",
    "https://js.stripe.com",
    "https://checkout.stripe.com",
  ];

  // Add localhost in development
  if (process.env.NODE_ENV === "development") {
    origins.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000"
    );
  }

  // Add preview URLs if available
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }

  return origins.filter(Boolean);
};

/**
 * CORS middleware handler
 * @param req - Next.js request object
 * @returns Modified response with CORS headers
 */
export function corsMiddleware(req: NextRequest): NextResponse {
  const response = NextResponse.next();
  const origin = req.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    );
    response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
    response.headers.set("Access-Control-Allow-Credentials", "true");

    // If origin is allowed, set it
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    return response;
  }

  // For non-preflight requests, set CORS headers if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
  }

  // Security headers (additional protection)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

/**
 * Check if a request should have CORS headers applied
 * @param pathname - The request pathname
 * @returns Whether CORS should be applied
 */
export function shouldApplyCors(pathname: string): boolean {
  // Apply CORS to API routes and tRPC endpoints
  return pathname.startsWith("/api") || pathname.startsWith("/trpc");
}