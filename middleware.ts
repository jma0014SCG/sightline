import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { summaryRateLimit, apiRateLimit } from './lib/rateLimit'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // CRITICAL: Skip all NextAuth routes completely - no processing at all
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

  // Handle protected routes - check authentication
  const protectedPaths = ['/library', '/settings', '/billing']
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtected) {
    try {
      const token = await getToken({ 
        req, 
        secret: process.env.NEXTAUTH_SECRET 
      })
      
      if (!token) {
        // Redirect to login if not authenticated
        const url = req.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    } catch (error) {
      // If token verification fails, redirect to login
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all routes except NextAuth, Next.js internals, and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.ico$|.*\\.svg$).*)',
  ],
}