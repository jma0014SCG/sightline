import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Custom logic can be added here
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
    // Protected routes
    '/library/:path*',
    '/settings/:path*',
    '/billing/:path*',
    // Skip Next.js internals and static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}