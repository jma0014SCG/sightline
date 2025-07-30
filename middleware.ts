import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { summaryRateLimit, apiRateLimit } from './lib/rateLimit'

// Separate middleware function for rate limiting
function applyRateLimit(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip NextAuth internal routes completely
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }

  // Apply rate limiting to other API routes
  if (pathname.startsWith('/api/')) {
    let rateLimitResult
    
    if (pathname.startsWith('/api/trpc/summary.create')) {
      rateLimitResult = summaryRateLimit(req)
    } else {
      rateLimitResult = apiRateLimit(req)
    }

    // Check if rate limit exceeded
    if (!rateLimitResult.success) {
      const response = new NextResponse(
        JSON.stringify({ 
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: 'retryAfter' in rateLimitResult ? rateLimitResult.retryAfter : 60
        }), 
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      )

      // Add rate limit headers
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())
      
      if ('retryAfter' in rateLimitResult && rateLimitResult.retryAfter) {
        response.headers.set('Retry-After', rateLimitResult.retryAfter.toString())
      }

      return response
    }

    // Add rate limit headers to successful requests
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString())
    return response
  }

  return NextResponse.next()
}

export default withAuth(
  function middleware(req) {
    // Apply rate limiting logic
    return applyRateLimit(req)
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname
        
        // Always allow NextAuth routes
        if (pathname.startsWith('/api/auth/')) {
          return true
        }
        
        // Protected routes
        const protectedPaths = ['/library', '/settings', '/billing']
        
        // Check if the current path is protected
        const isProtected = protectedPaths.some(path => pathname.startsWith(path))
        
        // Allow access if not protected or if user is authenticated
        return !isProtected || !!token
      },
    },
  }
)

export const config = {
  matcher: [
    // API routes for rate limiting
    '/api/:path*',
    // Protected routes
    '/library/:path*',
    '/settings/:path*',
    '/billing/:path*',
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}