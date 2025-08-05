'use client'

import { SignIn, SignUp } from '@clerk/nextjs'
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
  const modalRef = useRef<HTMLDivElement>(null)

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

          {/* Clerk Auth Component */}
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
        </div>
      </div>
    </div>
  )
}