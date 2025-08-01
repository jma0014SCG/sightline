import { initTRPC, TRPCError } from '@trpc/server'
import { auth } from '@clerk/nextjs/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { headers } from 'next/headers'

/**
 * Create context for each request
 */
export const createTRPCContext = async () => {
  const { userId } = await auth()

  return {
    prisma,
    userId,
    headers: headers(),
  }
}

/**
 * Initialize tRPC
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

/**
 * Create router and procedure helpers
 */
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authentication and ensures user exists in database
 */
const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  // Ensure user exists in our database
  let user = await ctx.prisma.user.findUnique({
    where: { id: ctx.userId }
  })

  // If user doesn't exist, create them with minimal data
  // The webhook will update with full data when it fires
  if (!user) {
    try {
      user = await ctx.prisma.user.create({
        data: {
          id: ctx.userId,
          email: `temp_${ctx.userId}@placeholder.com`, // Temporary email, webhook will update
          name: null,
          image: null,
          emailVerified: null,
        },
      })
      
      console.log(`Auto-created minimal user in database: ${ctx.userId}`)
    } catch (error) {
      console.error('Failed to create user in database:', error)
      throw new TRPCError({ 
        code: 'INTERNAL_SERVER_ERROR', 
        message: 'Failed to initialize user account' 
      })
    }
  }

  return next({
    ctx: {
      // infers the `userId` as non-nullable
      userId: ctx.userId as string,
      user: user,
      prisma: ctx.prisma,
      headers: ctx.headers,
    },
  })
})

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed)