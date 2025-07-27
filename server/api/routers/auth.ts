import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '@/server/api/trpc'

export const authRouter = createTRPCRouter({
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "You can see this secret message because you're authenticated!"
  }),

  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).optional(),
      image: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id

      const updatedUser = await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          image: input.image,
        },
      })

      return updatedUser
    }),
})