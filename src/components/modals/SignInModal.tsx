'use client'

import { SignIn, SignUp } from '@clerk/nextjs'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'

interface SignInModalProps {
  isOpen: boolean
  onClose: () => void
  afterSignInUrl?: string
  afterSignUpUrl?: string
  mode?: 'sign-in' | 'sign-up'
}

export function SignInModal({ 
  isOpen, 
  onClose, 
  afterSignInUrl = '/library',
  afterSignUpUrl = '/library',
  mode = 'sign-in'
}: SignInModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      setError(null)
      // Give Clerk components time to load
      const timer = setTimeout(() => setIsLoading(false), 1000)
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
        <div className="p-4 sm:p-6">{/* Reduced padding for better fit */}

          {/* Loading State */}
          {isLoading && (
            <div className="min-h-[300px] flex items-center justify-center">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-r-transparent mx-auto mb-2" />
                <p className="text-sm text-gray-600">Loading authentication...</p>
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
                      setTimeout(() => setIsLoading(false), 1000)
                    }}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clerk Auth Component */}
          {!isLoading && !error && (
            <div className="min-h-[300px]">
              {mode === 'sign-up' ? (
                <SignUp
                  afterSignInUrl={afterSignInUrl}
                  afterSignUpUrl={afterSignUpUrl}
                  appearance={{
                    elements: {
                      card: 'shadow-none border-0 bg-transparent',
                      headerTitle: 'text-2xl font-bold text-gray-900',
                      headerSubtitle: 'text-gray-600',
                      socialButtonsBlockButton: 'border-2 border-gray-200 hover:border-primary-300 transition-all duration-200',
                      formButtonPrimary: 'bg-primary-600 hover:bg-primary-700 transition-all duration-200',
                      footerActionLink: 'text-primary-600 hover:text-primary-700',
                      rootBox: 'w-full'
                    },
                    layout: {
                      showOptionalFields: false
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
                      socialButtonsBlockButton: 'border-2 border-gray-200 hover:border-primary-300 transition-all duration-200',
                      formButtonPrimary: 'bg-primary-600 hover:bg-primary-700 transition-all duration-200',
                      footerActionLink: 'text-primary-600 hover:text-primary-700',
                      rootBox: 'w-full'
                    },
                    layout: {
                      showOptionalFields: false
                    }
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}