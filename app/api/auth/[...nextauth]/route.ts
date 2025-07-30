import { authOptions } from '@/lib/auth/auth'
import NextAuth from 'next-auth'
import { NextRequest } from 'next/server'

// Create the NextAuth handler
const handler = NextAuth(authOptions)

// Export handlers for Next.js App Router
export async function GET(request: NextRequest) {
  return handler(request)
}

export async function POST(request: NextRequest) {
  return handler(request)
}

// Route segment config - important for Vercel
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const preferredRegion = 'auto'