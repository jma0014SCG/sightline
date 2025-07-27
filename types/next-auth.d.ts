import { DefaultSession, DefaultUser } from 'next-auth'
import { Role, Plan } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      plan: Plan
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: Role
    plan: Plan
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: Role
    plan: Plan
  }
}