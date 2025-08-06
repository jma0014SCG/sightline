'use client'

import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

interface AuthModalState {
  isOpen: boolean
  mode: 'sign-in' | 'sign-up'
  afterSignInUrl?: string
  afterSignUpUrl?: string
}

export function useAuth() {
  const { isSignedIn, isLoaded } = useClerkAuth()
  const { user } = useUser()
  const { signOut, openSignIn, openSignUp } = useClerk()
  const router = useRouter()
  
  // Modal state management
  const [authModal, setAuthModal] = useState<AuthModalState>({
    isOpen: false,
    mode: 'sign-in'
  })

  const openAuthModal = useCallback((mode: 'sign-in' | 'sign-up' = 'sign-in', options?: {
    afterSignInUrl?: string
    afterSignUpUrl?: string
  }) => {
    setAuthModal({
      isOpen: true,
      mode,
      afterSignInUrl: options?.afterSignInUrl || '/library',
      afterSignUpUrl: options?.afterSignUpUrl || '/library'
    })
  }, [])

  const closeAuthModal = useCallback(() => {
    setAuthModal(prev => ({ ...prev, isOpen: false }))
  }, [])

  const login = useCallback(async (options?: {
    afterSignInUrl?: string
    afterSignUpUrl?: string
  }) => {
    try {
      // Open in modal mode
      openAuthModal('sign-in', options)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }, [openAuthModal])

  const signUp = useCallback(async (options?: {
    afterSignInUrl?: string
    afterSignUpUrl?: string
  }) => {
    try {
      // Open in modal mode
      openAuthModal('sign-up', options)
    } catch (error) {
      console.error('Sign up failed:', error)
      throw error
    }
  }, [openAuthModal])

  const logout = useCallback(async () => {
    try {
      await signOut(() => router.push('/'))
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }, [signOut, router])

  const isAuthenticated = isLoaded ? isSignedIn : false
  const isLoading = !isLoaded

  // Map Clerk user to our expected user format
  const mappedUser = isLoaded && user ? {
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
    signUp,
    logout,
    authModal,
    openAuthModal,
    closeAuthModal,
  }
}