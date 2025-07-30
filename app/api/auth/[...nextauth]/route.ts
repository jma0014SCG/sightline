import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

// Add proper runtime configuration for Vercel
export const runtime = 'nodejs'