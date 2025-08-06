'use client'

import { useState, useEffect, useRef } from 'react'
import { Link2, Loader2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/useAuth'
import { getBrowserFingerprint, hasUsedFreeSummary } from '@/lib/browser-fingerprint'

interface URLInputProps {
  onSubmit: (url: string, fingerprint?: string) => void
  onSuccess?: () => void
  onAuthRequired?: () => void // Callback when anonymous user needs to sign up
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function URLInput({ 
  onSubmit, 
  onSuccess,
  onAuthRequired,
  isLoading = false, 
  disabled = false,
  placeholder = "Paste a YouTube URL to summarize...",
  className 
}: URLInputProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [clientAnonymousUsed, setClientAnonymousUsed] = useState(false)
  const wasLoadingRef = useRef(false)
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Handle client-side hydration
  useEffect(() => {
    setIsHydrated(true)
    setClientAnonymousUsed(hasUsedFreeSummary())
  }, [])

  // Get appropriate button text based on user status
  const getButtonText = () => {
    if (isLoading) {
      return 'Processing...'
    }
    
    // Show loading state during hydration and auth loading
    if (!isHydrated || authLoading) {
      return 'Loading...'
    }
    
    if (!isAuthenticated) {
      if (clientAnonymousUsed) {
        return 'Sign up for 3/month'
      }
      return 'Try Free (No signup)'
    }
    
    // For authenticated users, we could show remaining summaries here
    // For now, just show "Summarize"
    return 'Summarize'
  }

  // Clear URL when loading completes successfully
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      // Loading just finished - clear the URL and call onSuccess
      setUrl('')
      setError(null)
      setIsValid(false)
      onSuccess?.()
    }
    wasLoadingRef.current = isLoading
  }, [isLoading, onSuccess])

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}$/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?.*v=[\w-]{11}/
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (disabled) {
      return
    }

    if (!url.trim()) {
      setError('Please enter a YouTube URL')
      return
    }

    if (!validateYouTubeUrl(url)) {
      setError('Please enter a valid YouTube URL')
      return
    }

    // If anonymous user has already used their free summary, trigger auth
    if (!isAuthenticated && clientAnonymousUsed) {
      onAuthRequired?.()
      return
    }

    // Generate browser fingerprint for anonymous users
    let fingerprint: string | undefined
    if (!isAuthenticated) {
      try {
        fingerprint = await getBrowserFingerprint()
      } catch (error) {
        console.error('Failed to generate browser fingerprint:', error)
        setError('Unable to process request. Please try again.')
        return
      }
    }

    onSubmit(url, fingerprint)
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUrl(text)
      setError(null)
      setIsValid(text.trim() !== '' && validateYouTubeUrl(text))
    } catch (err) {
      // Provide helpful error message for clipboard permission issues
      setError('Clipboard access denied. Please paste manually or enable clipboard permissions.')
      // Silent fail - user will see error message
    }
  }

  // Apply different styling based on className context
  const isCreateSummaryContext = className?.includes('create-summary')
  
  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div className="space-y-2">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Link2 className={cn(
              "absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2",
              isCreateSummaryContext ? "text-blue-600" : "text-silver-lake-blue"
            )} />
            <input
              type="url"
              value={url}
              onChange={(e) => {
                const newUrl = e.target.value
                setUrl(newUrl)
                setError(null)
                setIsValid(newUrl.trim() !== '' && validateYouTubeUrl(newUrl))
              }}
              placeholder={placeholder}
              disabled={isLoading || disabled}
              className={cn(
                "w-full rounded-lg py-3 pl-10 transition-all duration-300",
                isCreateSummaryContext ? (
                  // Create summary styling - more prominent
                  "bg-white border-2 border-blue-200 text-gray-900 placeholder:text-gray-600 " +
                  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 " +
                  "disabled:cursor-not-allowed disabled:opacity-50"
                ) : (
                  // Default styling
                  "bg-white border border-paynes-gray/20 text-prussian-blue placeholder:text-paynes-gray " +
                  "focus:border-silver-lake-blue focus:outline-none focus:ring-2 focus:ring-silver-lake-blue/50 " +
                  "disabled:cursor-not-allowed disabled:opacity-50"
                ),
                error && "border-red-400 focus:border-red-400 focus:ring-red-400/50",
                isValid && "border-green-400 focus:border-green-400 focus:ring-green-400/50",
                isValid ? "pr-10" : "pr-4"
              )}
            />
            {isValid && (
              <CheckCircle className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-400 animate-pulse" />
            )}
          </div>
          
          <button
            type="button"
            onClick={handlePaste}
            disabled={isLoading || disabled}
            className={cn(
              "rounded-lg px-4 py-3 sm:px-4 sm:py-3 text-sm font-medium transition-all duration-300",
              "focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
              "min-h-[44px] min-w-[64px] hover:scale-105",
              isCreateSummaryContext ? (
                "bg-white border-2 border-blue-200 text-gray-700 hover:bg-blue-50 focus:ring-blue-500/20"
              ) : (
                "bg-white border border-paynes-gray/20 text-paynes-gray hover:bg-anti-flash-white focus:ring-silver-lake-blue/50"
              )
            )}
          >
            Paste
          </button>
          
          <button
            type="submit"
            disabled={isLoading || disabled || !url.trim()}
            className={cn(
              "rounded-lg px-4 sm:px-6 py-3 text-sm font-semibold text-white shadow-lg",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2",
              "transition-all duration-300 hover:scale-105 hover:shadow-xl min-h-[44px]",
              isCreateSummaryContext ? (
                "bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-600"
              ) : (
                "bg-prussian-blue hover:bg-paynes-gray focus-visible:outline-prussian-blue"
              )
            )}
          >
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            {getButtonText()}
          </button>
        </div>
        
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>
    </form>
  )
}