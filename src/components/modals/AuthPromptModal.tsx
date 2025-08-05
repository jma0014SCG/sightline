'use client'

import { X, BookOpen, Save, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

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
        <div className="p-8">
          {/* Success animation */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 animate-bounce">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Your summary is ready! 🎉
            </h2>
            {summaryTitle && (
              <p className="text-lg text-gray-700 mb-3 font-medium line-clamp-2 max-w-md mx-auto">
                &quot;{summaryTitle}&quot;
              </p>
            )}
            <p className="text-gray-600 max-w-sm mx-auto">
              You&apos;ve used your free trial. Create an account to save this summary and get 3 more free!
            </p>
          </div>

          {/* Value proposition */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-3 text-center">What you&apos;ll get:</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <BookOpen className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <span className="text-gray-800 font-medium">Personal Library</span>
                  <p className="text-xs text-gray-600">Save & organize all your summaries</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Share2 className="h-4 w-4 text-primary-600" />
                </div>
                <div>
                  <span className="text-gray-800 font-medium">Share & Export</span>
                  <p className="text-xs text-gray-600">Send to team or export to Notion</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-gray-800 font-medium">Save 10+ hours/week</span>
                  <p className="text-xs text-gray-600">Learn faster than ever before</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onSignUp}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4 rounded-xl text-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              Create Free Account →
            </button>
            <button
              onClick={onSignIn}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-xl text-base font-medium transition-all duration-200"
            >
              I already have an account
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200 py-2 underline"
            >
              I&apos;ll do this later
            </button>
          </div>

          {/* Social proof */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Join <span className="font-semibold text-gray-700">250+ professionals</span> already using Sightline
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}