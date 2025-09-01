'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Sparkles, BookOpen, Clock, TrendingUp, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useAnalytics } from '@/hooks/useAnalytics'

interface AuthValueModalProps {
  isOpen: boolean
  onClose: () => void
  onSignIn: () => void
  onSignUp: () => void
  anonymousSummaryId?: string
  videoTitle?: string
  timeSaved?: number
  className?: string
}

export function AuthValueModal({
  isOpen,
  onClose,
  onSignIn,
  onSignUp,
  anonymousSummaryId,
  videoTitle,
  timeSaved = 45,
  className
}: AuthValueModalProps) {
  const router = useRouter()
  const analytics = useAnalytics()
  const [isAnimating, setIsAnimating] = useState(false)
  const modalShownTime = useRef<number>(0)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      modalShownTime.current = Date.now()
      
      // Track modal shown
      analytics.trackModalInteraction({
        modal_type: 'auth_value',
        action: 'shown',
        anonymous_summary_id: anonymousSummaryId
      })
    }
  }, [isOpen, analytics, anonymousSummaryId])

  if (!isOpen) return null

  const handleSignUp = () => {
    // Track conversion
    const timeOnModal = modalShownTime.current ? (Date.now() - modalShownTime.current) / 1000 : 0
    analytics.trackModalInteraction({
      modal_type: 'auth_value',
      action: 'sign_up_clicked',
      anonymous_summary_id: anonymousSummaryId,
      time_on_page_seconds: timeOnModal
    })
    
    // Store the anonymous summary ID for claiming after sign-up
    if (anonymousSummaryId) {
      localStorage.setItem('pendingClaimSummaryId', anonymousSummaryId)
      localStorage.setItem('anonymousConversionStart', Date.now().toString())
    }
    onSignUp()
  }

  const handleSignIn = () => {
    // Track sign in
    const timeOnModal = modalShownTime.current ? (Date.now() - modalShownTime.current) / 1000 : 0
    analytics.trackModalInteraction({
      modal_type: 'auth_value',
      action: 'sign_in_clicked',
      anonymous_summary_id: anonymousSummaryId,
      time_on_page_seconds: timeOnModal
    })
    
    // Store the anonymous summary ID for claiming after sign-in
    if (anonymousSummaryId) {
      localStorage.setItem('pendingClaimSummaryId', anonymousSummaryId)
      localStorage.setItem('anonymousConversionStart', Date.now().toString())
    }
    onSignIn()
  }

  const handleContinueAsGuest = () => {
    // Track dismissal
    const timeOnModal = modalShownTime.current ? (Date.now() - modalShownTime.current) / 1000 : 0
    analytics.trackModalInteraction({
      modal_type: 'auth_value',
      action: 'continue_guest',
      anonymous_summary_id: anonymousSummaryId,
      time_on_page_seconds: timeOnModal
    })
    
    // Track that user dismissed the modal
    localStorage.setItem('authModalDismissed', Date.now().toString())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleContinueAsGuest}
      />
      
      {/* Modal */}
      <div
        className={cn(
          "relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-auto",
          "transform transition-all duration-300",
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0",
          "border border-gray-200 max-h-[90vh] overflow-y-auto",
          className
        )}
      >
        {/* Close Button */}
        <button
          onClick={handleContinueAsGuest}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Success Message */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Great Summary! 🎉
            </h2>
            <p className="text-gray-600">
              You just saved {timeSaved} minutes on 
              {videoTitle ? ` "${videoTitle}"` : ' this video'}
            </p>
          </div>

          {/* Value Proposition */}
          <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-primary-600">Sign up free</span> to unlock:
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Save this summary permanently</p>
                  <p className="text-sm text-gray-600">Never lose your insights</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Get 3 free summaries every month</p>
                  <p className="text-sm text-gray-600">Perfect for regular learning</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Build your personal library</p>
                  <p className="text-sm text-gray-600">Search and organize all summaries</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Track your learning progress</p>
                  <p className="text-sm text-gray-600">See time saved and insights gained</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSignUp}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              Sign Up Free & Save Summary
            </button>
            
            <button
              onClick={handleSignIn}
              className="w-full bg-white text-gray-700 px-6 py-3 rounded-xl font-medium border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Already have an account? Sign In
            </button>

            <button
              onClick={handleContinueAsGuest}
              className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors duration-200 py-2"
            >
              Continue as Guest (Summary won&apos;t be saved)
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Free forever</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>10,000+ users</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}