import { NextRequest, NextResponse } from 'next/server'

/**
 * OAuth callback handler for Clerk social authentication
 * This route processes the OAuth redirect from providers like Google and GitHub
 */
export async function GET(request: NextRequest) {
  try {
    // Get the redirect URL from query params or default to library
    const searchParams = request.nextUrl.searchParams
    const redirectUrl = searchParams.get('redirect_url') || '/library'
    
    // Clerk handles the OAuth flow automatically through their middleware
    // This route mainly serves as a redirect point after OAuth completion
    
    // Log the successful OAuth callback for monitoring
    console.log('OAuth callback received:', {
      provider: searchParams.get('provider'),
      timestamp: new Date().toISOString()
    })
    
    // Redirect to the intended destination
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  } catch (error) {
    console.error('OAuth callback error:', error)
    
    // On error, redirect to home with error message
    return NextResponse.redirect(
      new URL('/?auth_error=oauth_failed', request.url)
    )
  }
}

export async function POST(request: NextRequest) {
  // Handle POST requests for OAuth providers that use POST callbacks
  return GET(request)
}