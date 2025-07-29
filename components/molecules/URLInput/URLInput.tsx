'use client'

import { useState } from 'react'
import { Link2, Loader2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface URLInputProps {
  onSubmit: (url: string) => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function URLInput({ 
  onSubmit, 
  isLoading = false, 
  disabled = false,
  placeholder = "Paste a YouTube URL to summarize...",
  className 
}: URLInputProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isValid, setIsValid] = useState(false)

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}$/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?.*v=[\w-]{11}/
    ]
    return patterns.some(pattern => pattern.test(url))
  }

  const handleSubmit = (e: React.FormEvent) => {
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

    onSubmit(url)
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

  return (
    <form onSubmit={handleSubmit} className={cn("w-full", className)}>
      <div className="space-y-2">
        <div className="relative flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
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
                "w-full rounded-lg border border-gray-300 py-3 pl-10 text-gray-900",
                "placeholder:text-gray-400 focus:border-primary-500 focus:outline-none",
                "focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50",
                error && "border-red-500 focus:border-red-500 focus:ring-red-500",
                isValid && "border-green-500 focus:border-green-500 focus:ring-green-500",
                isValid ? "pr-10" : "pr-4"
              )}
            />
            {isValid && (
              <CheckCircle className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500 animate-pulse" />
            )}
          </div>
          
          <button
            type="button"
            onClick={handlePaste}
            disabled={isLoading || disabled}
            className={cn(
              "rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium",
              "text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2",
              "focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed",
              "disabled:opacity-50"
            )}
          >
            Paste
          </button>
          
          <button
            type="submit"
            disabled={isLoading || disabled || !url.trim()}
            className={cn(
              "rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white",
              "shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2",
              "focus-visible:outline-offset-2 focus-visible:outline-primary-600",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "flex items-center gap-2"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Summarize'
            )}
          </button>
        </div>
        
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </form>
  )
}