import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    deployment: process.env.VERCEL_DEPLOYMENT_ID || 'local',
    auth_routes: {
      providers: '/api/auth/providers',
      signin: '/api/auth/signin',
      callback: '/api/auth/callback'
    }
  })
}

export const dynamic = 'force-dynamic'