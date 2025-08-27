import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { type NextRequest } from 'next/server'
import { appRouter } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'

// Force dynamic rendering for auth-less calls
export const dynamic = 'force-dynamic'
// Prisma requires Node.js runtime, cannot use edge runtime
// export const runtime = 'edge'

const handler = async (req: NextRequest) => {
  try {
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req,
      router: appRouter,
      createContext: createTRPCContext,
      onError: ({ path, error }) => {
        // Always log errors with more context
        console.error(
          `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`,
          {
            stack: error.stack,
            code: error.code,
            cause: error.cause,
          }
        )
      },
    })
    
    // Log successful responses in production for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log(`✅ tRPC request completed successfully`)
    }
    
    return response
  } catch (error) {
    // Catch any unhandled errors and log them
    console.error('💥 Unhandled tRPC error:', error)
    
    // Return a proper JSON error response
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR'
        }
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

export { handler as GET, handler as POST }