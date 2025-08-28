'use client'

import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useRef } from 'react'

interface AuthModalState {
  isOpen: boolean
  mode: 'sign-in' | 'sign-up'
  afterSignInUrl?: string
  afterSignUpUrl?: string
  isTransitioning?: boolean
}

export function useAuth() {
  const { isSignedIn, isLoaded } = useClerkAuth()
  const { user } = useUser()
  const { signOut, openSignIn, openSignUp } = useClerk()
  const router = useRouter()
  
  // Modal state management with transition flag
  const [authModal, setAuthModal] = useState<AuthModalState>({
    isOpen: false,
    mode: 'sign-in',
    isTransitioning: false
  })
  
  // Debounce timer ref to prevent rapid modal operations
  const modalDebounceRef = useRef<NodeJS.Timeout | null>(null)
  
  // Lock to prevent concurrent modal operations
  const modalLockRef = useRef(false)

  const openAuthModal = useCallback((mode: 'sign-in' | 'sign-up' = 'sign-in', options?: {
    afterSignInUrl?: string
    afterSignUpUrl?: string
  }) => {
    // Clear any pending debounce
    if (modalDebounceRef.current) {
      clearTimeout(modalDebounceRef.current)
    }
    
    // Prevent opening if already transitioning or locked
    if (modalLockRef.current || authModal.isTransitioning) {
      return
    }
    
    modalDebounceRef.current = setTimeout(() => {
      modalLockRef.current = true
      
      setAuthModal({
        isOpen: true,
        mode,
        afterSignInUrl: options?.afterSignInUrl || '/library',
        afterSignUpUrl: options?.afterSignUpUrl || '/library',
        isTransitioning: false
      })
      
      // Release lock after animation completes
      setTimeout(() => {
        modalLockRef.current = false
      }, 300)
    }, 100) // 100ms debounce
  }, [authModal.isTransitioning])

  const closeAuthModal = useCallback(() => {
    // Clear any pending operations
    if (modalDebounceRef.current) {
      clearTimeout(modalDebounceRef.current)
      modalDebounceRef.current = null
    }
    
    // Prevent closing if locked
    if (modalLockRef.current) {
      return
    }
    
    setAuthModal(prev => ({ ...prev, isOpen: false, isTransitioning: false }))
    modalLockRef.current = false
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