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
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
              <Save className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🎉 Great summary! Want to save it?
            </h2>
            {summaryTitle && (
              <p className="text-lg text-gray-700 mb-2 font-medium">
                &quot;{summaryTitle}&quot;
              </p>
            )}
            <p className="text-gray-600">
              Create a free account to save this summary and access your personal library
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-5 w-5 text-primary-600 flex-shrink-0" />
              <span className="text-gray-700">Access your summary library anytime</span>
            </div>
            <div className="flex items-center space-x-3">
              <Share2 className="h-5 w-5 text-primary-600 flex-shrink-0" />
              <span className="text-gray-700">Share summaries with your team</span>
            </div>
            <div className="flex items-center space-x-3">
              <Save className="h-5 w-5 text-primary-600 flex-shrink-0" />
              <span className="text-gray-700">Export to Notion, PDF, and more</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onSignUp}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Create Free Account
            </button>
            <button
              onClick={onSignIn}
              className="w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg text-lg font-semibold hover:border-primary-300 hover:text-primary-700 transition-all duration-200"
            >
              I Already Have an Account
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors duration-200 py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}