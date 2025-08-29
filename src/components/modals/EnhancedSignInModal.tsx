'use client'

import { SignIn, SignUp } from '@clerk/nextjs'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { ProgressiveAuth } from '@/components/auth/ProgressiveAuth'

interface EnhancedSignInModalProps {
  isOpen: boolean
  onClose: () => void
  afterSignInUrl?: string
  afterSignUpUrl?: string
  mode?: 'sign-in' | 'sign-up'
  useProgressive?: boolean // Toggle between progressive and traditional modal
  context?: 'summary-save' | 'feature-unlock' | 'limit-reached' | 'general'
}

export function EnhancedSignInModal({ 
  isOpen, 
  onClose, 
  afterSignInUrl = '/library',
  afterSignUpUrl = '/library',
  mode = 'sign-in',
  useProgressive = false,
  context = 'general'
}: EnhancedSignInModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTraditional, setShowTraditional] = useState(!useProgressive)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setError(null)
      // Give Clerk components time to load
      const timer = setTimeout(() => setIsLoading(false), 500) // Reduced from 1000ms
      return () => clearTimeout(timer)
    }
  }, [isOpen, mode])

  // Handle clicking outside modal to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div
        ref={modalRef}
        className={cn(
          "relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto",
          "transform transition-all duration-300 scale-100 opacity-100",
          "border border-gray-200 max-h-[90vh] overflow-y-auto"
        )}
      >
        {/* Custom Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Content */}
        <div className="p-4 sm:p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="min-h-[300px] flex items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-r-transparent mx-auto mb-2" />
                <p className="text-sm text-gray-600">Setting up secure authentication...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="min-h-[300px] flex items-center justify-center">
              <div className="text-center p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">Authentication Error</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                  <button
                    onClick={() => {
                      setError(null)
                      setIsLoading(true)
                      setTimeout(() => setIsLoading(false), 500)
                    }}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Progressive Auth Component */}
          {!isLoading && !error && useProgressive && (
            <ProgressiveAuth
              mode={mode}
              context={context}
              onSuccess={() => {
                window.location.href = mode === 'sign-up' ? afterSignUpUrl : afterSignInUrl
              }}
              onCancel={onClose}
            />
          )}

          {/* Traditional Clerk Auth Component with Social Buttons */}
          {!isLoading && !error && !useProgressive && (
            <div className="min-h-[300px]">
              {/* Add Social Auth Buttons */}
              <div className="mb-6">
                <SocialAuthButtons
                  mode={mode}
                  onSuccess={() => {
                    window.location.href = mode === 'sign-up' ? afterSignUpUrl : afterSignInUrl
                  }}
                  onError={setError}
                />
              </div>

              {/* Original Clerk Components */}
              {mode === 'sign-up' ? (
                <SignUp
                  afterSignInUrl={afterSignInUrl}
                  afterSignUpUrl={afterSignUpUrl}
                  appearance={{
                    elements: {
                      card: 'shadow-none border-0 bg-transparent',
                      headerTitle: 'text-2xl font-bold text-gray-900',
                      headerSubtitle: 'text-gray-600',
                      socialButtonsBlockButton: 'hidden', // Hide Clerk's social buttons since we have custom ones
                      socialButtonsProviderIcon: 'hidden',
                      socialButtonsBlockButtonText: 'hidden',
                      dividerRow: 'hidden', // Hide Clerk's divider since we have our own
                      formButtonPrimary: 'bg-primary-600 hover:bg-primary-700 transition-all duration-200',
                      footerActionLink: 'text-primary-600 hover:text-primary-700',
                      formFieldInput: 'border-2 focus:border-primary-500',
                      formFieldLabel: 'text-gray-700 font-medium',
                      identityPreviewEditButton: 'text-primary-600 hover:text-primary-700',
                      rootBox: 'w-full'
                    },
                    layout: {
                      showOptionalFields: false,
                      socialButtonsPlacement: 'top', // Even though hidden, set to top for layout
                      socialButtonsVariant: 'blockButton'
                    }
                  }}
                />
              ) : (
                <SignIn
                  afterSignInUrl={afterSignInUrl}
                  afterSignUpUrl={afterSignUpUrl}
                  appearance={{
                    elements: {
                      card: 'shadow-none border-0 bg-transparent',
                      headerTitle: 'text-2xl font-bold text-gray-900',
                      headerSubtitle: 'text-gray-600',
                      socialButtonsBlockButton: 'hidden', // Hide Clerk's social buttons
                      socialButtonsProviderIcon: 'hidden',
                      socialButtonsBlockButtonText: 'hidden',
                      dividerRow: 'hidden', // Hide Clerk's divider
                      formButtonPrimary: 'bg-primary-600 hover:bg-primary-700 transition-all duration-200',
                      footerActionLink: 'text-primary-600 hover:text-primary-700',
                      formFieldInput: 'border-2 focus:border-primary-500',
                      formFieldLabel: 'text-gray-700 font-medium',
                      identityPreviewEditButton: 'text-primary-600 hover:text-primary-700',
                      rootBox: 'w-full'
                    },
                    layout: {
                      showOptionalFields: false,
                      socialButtonsPlacement: 'top',
                      socialButtonsVariant: 'blockButton'
                    }
                  }}
                />
              )}
            </div>
          )}

          {/* Trust Indicators */}
          {!isLoading && !error && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>256-bit encryption</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>SOC 2 compliant</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>GDPR ready</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}