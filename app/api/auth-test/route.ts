import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth/auth'

export async function GET() {
  try {
    // Check if authOptions is properly configured
    const providers = authOptions.providers?.map(p => p.id) || []
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'Auth configuration check',
      providers,
      hasSecret: !!authOptions.secret,
      hasAdapter: !!authOptions.adapter,
      callbacks: Object.keys(authOptions.callbacks || {}),
      pages: authOptions.pages,
      env: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'