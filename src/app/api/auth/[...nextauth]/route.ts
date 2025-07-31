import { authOptions } from '@/lib/auth/auth'
import NextAuth from 'next-auth'

// Create the NextAuth handler
const handler = NextAuth(authOptions)

// Export handlers for Next.js App Router
export { handler as GET, handler as POST }

// Route segment config - important for Vercel
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'