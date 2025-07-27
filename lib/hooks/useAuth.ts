'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const login = useCallback(async (provider = 'google') => {
    try {
      console.log('🚀 Login function called with provider:', provider)
      console.log('🔍 About to call signIn...')
      const result = await signIn(provider, { callbackUrl: '/library' })
      console.log('✅ signIn result:', result)
    } catch (error) {
      console.error('❌ Login error:', error)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut({ callbackUrl: '/' })
    } catch (error) {
      console.error('Logout error:', error)
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