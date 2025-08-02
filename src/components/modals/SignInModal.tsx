'use client'

import { useClerk } from '@clerk/nextjs'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

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
  const { openSignIn, openSignUp } = useClerk()
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (mode === 'sign-up') {
        openSignUp({
          afterSignInUrl,
          afterSignUpUrl,
          appearance: {
            elements: {
              modalContent: 'bg-white rounded-2xl shadow-2xl max-w-md mx-auto',
              modalCloseButton: 'hidden', // We'll use our custom close button
              card: 'shadow-none border-0',
              headerTitle: 'text-2xl font-bold text-gray-900',
              headerSubtitle: 'text-gray-600',
              socialButtonsBlockButton: 'border-2 border-gray-200 hover:border-primary-300 transition-all duration-200',
              formButtonPrimary: 'bg-primary-600 hover:bg-primary-700 transition-all duration-200',
              footerActionLink: 'text-primary-600 hover:text-primary-700'
            },
            layout: {
              logoImageUrl: '/logo.png',
              showOptionalFields: false
            }
          }
        })
      } else {
        openSignIn({
          afterSignInUrl,
          afterSignUpUrl,
          appearance: {
            elements: {
              modalContent: 'bg-white rounded-2xl shadow-2xl max-w-md mx-auto',
              modalCloseButton: 'hidden', // We'll use our custom close button
              card: 'shadow-none border-0',
              headerTitle: 'text-2xl font-bold text-gray-900',
              headerSubtitle: 'text-gray-600',
              socialButtonsBlockButton: 'border-2 border-gray-200 hover:border-primary-300 transition-all duration-200',
              formButtonPrimary: 'bg-primary-600 hover:bg-primary-700 transition-all duration-200',
              footerActionLink: 'text-primary-600 hover:text-primary-700'
            },
            layout: {
              logoImageUrl: '/logo.png',
              showOptionalFields: false
            }
          }
        })
      }
    }
  }, [isOpen, mode, openSignIn, openSignUp, afterSignInUrl, afterSignUpUrl])

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
          "relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto",
          "transform transition-all duration-300 scale-100 opacity-100",
          "border border-gray-200"
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
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {mode === 'sign-up' ? 'Join Sightline' : 'Welcome back'}
            </h2>
            <p className="text-gray-600">
              {mode === 'sign-up' 
                ? 'Create your account to save and organize your summaries' 
                : 'Sign in to access your library and saved summaries'
              }
            </p>
          </div>

          {/* Clerk Auth Component will be injected here */}
          <div id="clerk-modal-container" className="min-h-[300px]">
            {/* Clerk modal content will appear here */}
          </div>
        </div>
      </div>
    </div>
  )
}