'use client'

import { useState, useEffect } from 'react'
import { X, Share2, Copy, Check, ExternalLink, Eye, Trash2, Globe, Lock } from 'lucide-react'
import { api } from '@/components/providers/TRPCProvider'
import { cn } from '@/lib/utils'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  summaryId: string
  summaryTitle: string
  onSuccess?: () => void
}

export function ShareModal({ isOpen, onClose, summaryId, summaryTitle, onSuccess }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Get existing share link
  const { data: existingShareLink, refetch } = api.share.get.useQuery(
    { summaryId },
    { enabled: isOpen }
  )

  // Mutations
  const createShareLink = api.share.create.useMutation({
    onSuccess: () => {
      refetch()
      setIsCreating(false)
      onSuccess?.()
    },
    onError: (error) => {
      setIsCreating(false)
      console.error('Failed to create share link:', error)
      // More user-friendly error message
      alert('Unable to create share link. Please check your internet connection and try again.')
    }
  })

  const deleteShareLink = api.share.delete.useMutation({
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      console.error('Failed to delete share link:', error)
      alert('Unable to delete share link. Please try again.')
    }
  })

  const togglePublic = api.share.togglePublic.useMutation({
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      console.error('Failed to update share link privacy:', error)
      alert('Unable to update privacy settings. Please try again.')
    }
  })

  const handleCreateLink = async () => {
    setIsCreating(true)
    createShareLink.mutate({ summaryId })
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
      // Fallback: Try to select the text for manual copy
      try {
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackErr) {
        alert('Unable to copy link. Please manually copy the link from the text field above.')
      }
    }
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this share link? This will make it inaccessible to anyone who has the link.')) {
      deleteShareLink.mutate({ summaryId })
    }
  }

  const handleTogglePublic = () => {
    if (!existingShareLink) return
    
    const newStatus = !existingShareLink.isPublic
    const message = newStatus 
      ? 'Make this link publicly accessible?'
      : 'Make this link private? People with the link will no longer be able to access it.'
    
    if (confirm(message)) {
      togglePublic.mutate({ summaryId, isPublic: newStatus })
    }
  }

  // Reset copied state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-md w-full mx-4 bg-white rounded-xl shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <Share2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Share Summary</h2>
              <p className="text-sm text-gray-500 truncate max-w-48">
                {summaryTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {!existingShareLink ? (
            // No share link exists
            <div className="text-center py-4">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Create Share Link
              </h3>
              <p className="text-gray-600 mb-6 text-sm">
                Generate a public link that allows anyone to view this summary without signing in.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleCreateLink()
                }}
                disabled={isCreating}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 relative z-10"
                style={{ pointerEvents: 'auto' }}
              >
                {isCreating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating Link...
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" />
                    Create Share Link
                  </>
                )}
              </button>
            </div>
          ) : (
            // Share link exists
            <div className="space-y-4">
              {/* Status indicator */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
                existingShareLink.isPublic 
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-50 text-gray-700"
              )}>
                {existingShareLink.isPublic ? (
                  <>
                    <Globe className="h-4 w-4" />
                    Public - Anyone with link can view
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Private - Link is disabled
                  </>
                )}
              </div>

              {/* Share link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={existingShareLink.url}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleCopy(existingShareLink.url)
                    }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1 relative z-10"
                    style={{ pointerEvents: 'auto' }}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 text-sm">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span className="text-sm">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {existingShareLink.views} {existingShareLink.views === 1 ? 'view' : 'views'}
                </div>
                <div>
                  Created {new Date(existingShareLink.createdAt).toLocaleDateString()}
                </div>
              </div>

              {/* Quick share buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCopy(existingShareLink.url)
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium relative z-10"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </button>
                <a
                  href={existingShareLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </a>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleTogglePublic()
                  }}
                  disabled={togglePublic.isPending}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm relative z-10",
                    existingShareLink.isPublic
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  )}
                  style={{ pointerEvents: 'auto' }}
                >
                  {existingShareLink.isPublic ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4" />
                      Make Public
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleDelete()
                  }}
                  disabled={deleteShareLink.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors text-sm relative z-10"
                  style={{ pointerEvents: 'auto' }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Share Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}