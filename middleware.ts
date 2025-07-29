import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { summaryRateLimit, apiRateLimit, authRateLimit } from './lib/rateLimit'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl

    // Apply rate limiting to API routes
    if (pathname.startsWith('/api/')) {
      let rateLimitResult
      
      if (pathname.startsWith('/api/trpc/summary.create')) {
        rateLimitResult = summaryRateLimit(req)
      } else if (pathname.startsWith('/api/auth')) {
        rateLimitResult = authRateLimit(req)
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
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Protected routes
        const protectedPaths = ['/library', '/settings', '/billing']
        const pathname = req.nextUrl.pathname
        
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