'use client'

import { X, BookOpen, Save, Share2, Quote, Play, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface AuthPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSignIn: () => void
  onSignUp: () => void
  summaryTitle?: string
}

export function AuthPromptModal({ 
  isOpen, 
  onClose, 
  onSignIn, 
  onSignUp,
  summaryTitle 
}: AuthPromptModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Handle clicking outside modal to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
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
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        "animate-in fade-in duration-200"
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      aria-describedby="auth-modal-description"
    >
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm",
          "animate-in fade-in duration-200",
          isClosing && "animate-out fade-out duration-150"
        )}
        onClick={() => {
          setIsClosing(true)
          setTimeout(onClose, 150)
        }}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div
        ref={modalRef}
        className={cn(
          "relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto",
          "border border-gray-200",
          "max-h-[90vh] overflow-y-auto",
          "animate-in zoom-in-95 fade-in duration-200",
          isClosing && "animate-out zoom-out-95 fade-out duration-150"
        )}
        role="region"
        aria-live="polite"
      >
        {/* Custom Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Content */}
        <div className="p-6">
          {/* Success animation */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 animate-bounce">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 id="auth-modal-title" className="text-2xl font-bold text-gray-900 mb-2">
              Your summary is ready! 🎉
            </h2>
            {summaryTitle && (
              <p className="text-sm text-gray-700 mb-2 font-medium line-clamp-2 max-w-md mx-auto">
                &quot;{summaryTitle}&quot;
              </p>
            )}
            <p id="auth-modal-description" className="text-sm text-gray-600 max-w-sm mx-auto">
              You&apos;ve used your free trial! Create an account to save this summary and get 3 more summaries every month.
            </p>
          </div>

          {/* Library Preview - Using Image */}
          <div className="mb-4">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Your Personal Library Preview:</p>
              
              {/* Using the actual image */}
              <div className="relative w-full rounded-lg overflow-hidden bg-white shadow-sm">
                <Image 
                  src="/images/library-preview.png" 
                  alt="Your video library preview"
                  width={450}
                  height={200}
                  className="w-full h-auto object-cover max-h-32"
                  priority
                />
                
                {/* Overlay to show it's a preview */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                
                {/* Optional: Add a "Preview" badge */}
                <div className="absolute top-2 right-2 bg-primary-600/90 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                  Preview
                </div>
              </div>
              
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-gray-500">Save & organize your summaries</span>
                <span className="text-primary-600 font-medium">3 free/month</span>
              </div>
            </div>
          </div>

          {/* Value proposition */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 mb-4 transition-all duration-300 hover:shadow-md">
            <h3 className="font-semibold text-gray-900 mb-2 text-center text-sm">What you&apos;ll get:</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 group transition-all duration-200 hover:translate-x-1">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-110">
                  <BookOpen className="h-3 w-3 text-primary-600" />
                </div>
                <div>
                  <span className="text-sm text-gray-800 font-medium">Personal Library</span>
                  <span className="text-xs text-gray-600"> - Save & organize</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 group transition-all duration-200 hover:translate-x-1">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-110">
                  <Share2 className="h-3 w-3 text-primary-600" />
                </div>
                <div>
                  <span className="text-sm text-gray-800 font-medium">Share & Export</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 group transition-all duration-200 hover:translate-x-1">
                <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-110">
                  <svg className="h-3 w-3 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-gray-800 font-medium">Save 10+ hours/week</span>
                </div>
              </div>
            </div>
            {/* Value comparison */}
            <div className="text-xs text-center text-gray-500 mt-2">
              <span className="line-through">$47/month value</span>
              <span className="text-green-600 font-bold ml-2">FREE to start</span>
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Quote className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-700 italic">
                  "Jump started my AI coding ability and gave me 20+ hours of time back"
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  - Sarah K., Product Manager at Google
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                setIsSigningUp(true)
                onSignUp()
              }}
              disabled={isSigningUp || isSigningIn}
              className={cn(
                "w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-3 rounded-xl text-base font-semibold",
                "transition-all duration-200 transform shadow-lg",
                "disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none",
                !isSigningUp && !isSigningIn && "hover:from-primary-700 hover:to-primary-800 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
              )}
            >
              {isSigningUp ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  Create Free Account
                  <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setIsSigningIn(true)
                onSignIn()
              }}
              disabled={isSigningUp || isSigningIn}
              onMouseEnter={() => {
                // Prefetch Clerk components for faster modal loading
                import('@clerk/nextjs').catch(() => {})
              }}
              className={cn(
                "w-full bg-gray-100 text-gray-800 px-4 py-2 rounded-xl text-sm font-medium",
                "transition-all duration-200",
                "disabled:opacity-70 disabled:cursor-not-allowed",
                !isSigningUp && !isSigningIn && "hover:bg-gray-200 hover:scale-[1.01] active:scale-[0.99]"
              )}
            >
              {isSigningIn ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "I already have an account"
              )}
            </button>
            <button
              onClick={() => {
                setIsClosing(true)
                setTimeout(onClose, 150)
              }}
              disabled={isSigningUp || isSigningIn}
              className={cn(
                "w-full text-gray-500 text-xs transition-all duration-200 py-1 underline",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                !isSigningUp && !isSigningIn && "hover:text-gray-700"
              )}
            >
              I&apos;ll do this later
            </button>
          </div>

          {/* Enhanced Social proof */}
          <div className="mt-4 space-y-2">
            {/* Active users counter */}
            <div className="text-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg py-2 px-3">
              <div className="flex items-center justify-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white">
                      {['JM', 'SK', 'AL', 'PK'][i]}
                    </div>
                  ))}
                </div>
                <p className="text-xs">
                  <span className="font-bold text-green-700">3 people</span>
                  <span className="text-gray-600"> joined in the last hour</span>
                </p>
              </div>
            </div>
            
            {/* Trust badges */}
            <div className="flex items-center justify-center gap-3 text-[10px] text-gray-500">
              <div className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>No CC Required</span>
              </div>
            </div>
            
            {/* User count */}
            <p className="text-[10px] text-gray-500 text-center">
              Join <span className="font-semibold text-gray-700">253 professionals</span> saving time with Sightline
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}