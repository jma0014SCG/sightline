import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'API routes are working',
    timestamp: new Date().toISOString(),
    env: {
      hasBackendUrl: !!process.env.NEXT_PUBLIC_BACKEND_URL,
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'NOT SET',
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasClerk: !!process.env.CLERK_SECRET_KEY,
    }
  })
}

export async function POST() {
  return NextResponse.json({ 
    status: 'ok',
    method: 'POST',
    message: 'POST endpoint working'
  })
}