import { authOptions } from '@/lib/auth/auth'
import NextAuth from 'next-auth'

const handler = NextAuth(authOptions)

// Export all HTTP methods that NextAuth needs
export { handler as GET, handler as POST }

// Force dynamic rendering for auth routes
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'