'use client'

import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function useAuth() {
  const { isSignedIn, isLoaded } = useClerkAuth()
  const { user } = useUser()
  const { signOut, openSignIn } = useClerk()
  const router = useRouter()

  const login = useCallback(async () => {
    try {
      openSignIn({
        afterSignInUrl: '/library',
        afterSignUpUrl: '/library'
      })
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }, [openSignIn])

  const logout = useCallback(async () => {
    try {
      await signOut(() => router.push('/'))
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }, [signOut, router])

  const isAuthenticated = isSignedIn
  const isLoading = !isLoaded

  // Map Clerk user to our expected user format
  const mappedUser = user ? {
    id: user.id,
    name: user.fullName || user.firstName || '',
    email: user.primaryEmailAddress?.emailAddress || '',
    image: user.imageUrl || null,
    role: 'USER', // Default role - will be synced from database
    plan: 'FREE' // Default plan - will be synced from database
  } : null

  return {
    user: mappedUser,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }
}