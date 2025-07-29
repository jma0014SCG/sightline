'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const login = useCallback(async (provider = 'google') => {
    try {
      await signIn(provider, { callbackUrl: '/library' })
    } catch (error) {
      // Handle login error silently - NextAuth will show its own UI
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      // Handle logout error silently
    }
  }, [])

  const isAuthenticated = !!session?.user
  const isLoading = status === 'loading'

  return {
    user: session?.user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }
}