'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MoreVertical, Eye, Share2, Trash2, Edit3, Play, CheckSquare, Square, ThumbsUp, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { Summary, Category, Tag } from '@prisma/client'

type SummaryWithRelations = Summary & {
  categories?: Category[]
  tags?: Tag[]
}

interface SummaryCardProps {
  summary: SummaryWithRelations
  className?: string
  onDelete?: (id: string) => void
  onShare?: (id: string) => void
  viewMode?: 'grid' | 'list'
  isSelected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  showSelection?: boolean
  isSharing?: boolean
}

export function SummaryCard({ 
  summary, 
  className, 
  onDelete, 
  onShare, 
  viewMode = 'grid',
  isSelected = false,
  onSelect,
  showSelection = false,
  isSharing = false
}: SummaryCardProps) {
  const [showActions, setShowActions] = useState(false)
  
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Format large numbers (e.g., 1.2M views, 45K likes)
  const formatCount = (count: number | null | undefined) => {
    if (!count || count === 0) return null
    
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  // Get preview text - prefer synopsis, fall back to extracting from content
  const getPreviewText = () => {
    // First preference: Use synopsis if available
    if (summary.synopsis && summary.synopsis.trim()) {
      return summary.synopsis.trim()
    }
    
    // Fallback: Extract first few sentences from content
    const sentences = summary.content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    return sentences.slice(0, 2).join('. ').trim()
  }

  const previewText = getPreviewText()

  // Helper function to render tags with colors
  const renderTags = (tags: Tag[], limit = 3) => {
    const getTagColor = (type: string) => {
      switch (type) {
        case 'PERSON': return 'bg-blue-100 text-blue-700 border-blue-200'
        case 'COMPANY': return 'bg-green-100 text-green-700 border-green-200'
        case 'TECHNOLOGY': return 'bg-orange-100 text-orange-700 border-orange-200'
        case 'PRODUCT': return 'bg-pink-100 text-pink-700 border-pink-200'
        case 'CONCEPT': return 'bg-indigo-100 text-indigo-700 border-indigo-200'
        case 'FRAMEWORK': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
        case 'TOOL': return 'bg-teal-100 text-teal-700 border-teal-200'
        default: return 'bg-gray-100 text-gray-700 border-gray-200'
      }
    }

    const displayTags = tags.slice(0, limit)
    const remainingCount = tags.length - limit

    return (
      <div className="flex flex-wrap gap-1">
        {displayTags.map((tag) => (
          <span
            key={tag.id}
            className={cn(
              "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border",
              getTagColor(tag.type)
            )}
          >
            {tag.name}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border border-gray-200 bg-gray-100 text-gray-600">
            +{remainingCount} more
          </span>
        )}
      </div>
    )
  }

  // Helper function to render categories
  const renderCategories = (categories: Category[], limit = 2) => {
    const displayCategories = categories.slice(0, limit)
    const remainingCount = categories.length - limit

    return (
      <div className="flex flex-wrap gap-1">
        {displayCategories.map((category) => (
          <span
            key={category.id}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 border border-purple-200"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            {category.name}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border border-gray-200 bg-gray-100 text-gray-600">
            +{remainingCount} more
          </span>
        )}
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <article 
        className={cn(
          "group relative overflow-hidden rounded-lg border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-md",
          isSelected && "border-blue-500 bg-blue-50",
          className
        )}
      >
        {/* Selection overlay */}
        {showSelection && (
          <div className="absolute left-3 top-3 z-10">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onSelect?.(summary.id, !isSelected)
              }}
              className="flex h-5 w-5 items-center justify-center rounded bg-white/90 backdrop-blur-sm hover:bg-white transition-colors"
            >
              {isSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        )}
        <Link href={`/library/${summary.id}`} className="block">
          <div className="flex gap-3 p-3">
            {/* Compact Thumbnail */}
            <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {summary.thumbnailUrl ? (
                <>
                  <Image
                    src={summary.thumbnailUrl}
                    alt={summary.videoTitle}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center justify-center w-8 h-8 bg-white/90 rounded-full backdrop-blur-sm">
                        <Play className="h-4 w-4 text-gray-900 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <Play className="h-6 w-6 text-gray-400" data-testid="play-icon" />
                </div>
              )}
              
              {/* Duration badge */}
              <div className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                {formatDuration(summary.duration)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header with channel info */}
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className="font-medium text-blue-600">{summary.channelName}</span>
                <span className="text-gray-400">•</span>
                <time className="text-gray-500">{formatDate(summary.createdAt)}</time>
              </div>

              {/* Title */}
              <h3 className="mb-1.5 line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                {summary.videoTitle}
              </h3>

              {/* Preview text - single line */}
              {previewText && (
                <p className="text-xs text-gray-600 line-clamp-1 mb-1.5 leading-snug">
                  {previewText.length > 100 ? `${previewText.substring(0, 100)}...` : previewText}
                </p>
              )}

              {/* Tags and Categories - inline */}
              {((summary.categories && summary.categories.length > 0) || (summary.tags && summary.tags.length > 0)) && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {summary.categories && summary.categories.length > 0 && renderCategories(summary.categories, 1)}
                  {summary.tags && summary.tags.length > 0 && renderTags(summary.tags, 2)}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {/* YouTube metadata */}
                  {formatCount(summary.viewCount) && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {formatCount(summary.viewCount)}
                    </span>
                  )}
                  {formatCount(summary.likeCount) && (
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {formatCount(summary.likeCount)}
                    </span>
                  )}
                  {formatCount(summary.commentCount) && (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {formatCount(summary.commentCount)}
                    </span>
                  )}
                  {/* Fallback if no metadata */}
                  {!summary.viewCount && !summary.likeCount && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      View
                    </span>
                  )}
                  {/* Remove the "more insights" since we're now showing synopsis */}
                </div>
                
                {/* Enhanced Action Buttons - Always visible with better UX */}
                <div className="flex items-center gap-2 z-10 relative">
                  {onShare && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onShare(summary.id)
                      }}
                      disabled={isSharing}
                      className={`rounded-lg p-2 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all duration-200 ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={isSharing ? "Creating share link..." : "Share summary"}
                      title={isSharing ? "Creating share link..." : "Share this summary"}
                      style={{ pointerEvents: 'auto' }}
                    >
                      {isSharing ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
                      ) : (
                        <Share2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onDelete(summary.id)
                      }}
                      className="rounded-lg p-2 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300 shadow-sm transition-all duration-200"
                      aria-label="Delete summary"
                      title="Delete this summary"
                      style={{ pointerEvents: 'auto' }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* More actions button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowActions(!showActions)
                    }}
                    className="rounded-lg p-2 bg-white/80 backdrop-blur-sm border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 shadow-sm transition-all duration-200"
                    aria-label="More actions"
                    title="More actions"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Actions Dropdown */}
        {showActions && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-20" 
              onClick={() => setShowActions(false)}
            />
            
            {/* Dropdown */}
            <div className="absolute right-4 top-4 z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
              <Link
                href={`/library/${summary.id}`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="h-4 w-4" />
                View Details
              </Link>
              <Link
                href={`/library/${summary.id}/edit`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Edit3 className="h-4 w-4" />
                Edit Summary
              </Link>
              {onShare && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onShare(summary.id)
                    setShowActions(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                  Share Summary
                </button>
              )}
              <div className="my-1 h-px bg-gray-100" />
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete(summary.id)
                    setShowActions(false)
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Summary
                </button>
              )}
            </div>
          </>
        )}
      </article>
    )
  }

  // Grid view - reverted to smaller thumbnail size
  return (
    <article 
      className={cn(
        "group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-gray-300 hover:shadow-lg",
        isSelected && "border-blue-500 bg-blue-50",
        className
      )}
    >
      {/* Selection overlay */}
      {showSelection && (
        <div className="absolute left-4 top-4 z-10">
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSelect?.(summary.id, !isSelected)
            }}
            className="flex h-6 w-6 items-center justify-center rounded bg-white/90 backdrop-blur-sm hover:bg-white transition-colors"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      )}
      <Link href={`/library/${summary.id}`} className="block">
        <div className="flex items-stretch gap-4 p-4 pb-12 min-h-[120px]">
          <div className="flex-1 flex flex-col justify-between">
            {/* Main content area */}
            <div>
              {/* Header with channel info */}
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="font-medium text-blue-600">{summary.channelName}</span>
                <span className="text-gray-400">•</span>
                <time className="text-gray-500">{formatDate(summary.createdAt)}</time>
              </div>

              {/* Title */}
              <h3 className="mb-2 line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                {summary.videoTitle}
              </h3>

              {/* Preview text - expanded for wider cards */}
              {previewText && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                  {previewText.length > 140 ? `${previewText.substring(0, 140)}...` : previewText}
                </p>
              )}

              {/* Tags and Categories - inline without labels */}
              {((summary.categories && summary.categories.length > 0) || (summary.tags && summary.tags.length > 0)) && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {summary.categories && summary.categories.length > 0 && renderCategories(summary.categories, 2)}
                  {summary.tags && summary.tags.length > 0 && renderTags(summary.tags, 4)}
                </div>
              )}
            </div>

            {/* Footer - simplified */}
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              {/* YouTube metadata */}
              {formatCount(summary.viewCount) && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatCount(summary.viewCount)}
                </span>
              )}
              {formatCount(summary.likeCount) && (
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {formatCount(summary.likeCount)}
                </span>
              )}
              {formatCount(summary.commentCount) && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {formatCount(summary.commentCount)}
                </span>
              )}
              {/* Fallback if no metadata */}
              {!summary.viewCount && !summary.likeCount && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Summary
                </span>
              )}
              {/* Remove the "more insights" since we're now showing synopsis */}
            </div>
          </div>

          {/* Enhanced Thumbnail */}
          <div className="ml-4 flex-shrink-0">
            <div className="relative h-20 w-36 overflow-hidden rounded-lg bg-gray-100">
              {summary.thumbnailUrl ? (
                <>
                  <Image
                    src={summary.thumbnailUrl}
                    alt={summary.videoTitle}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Play overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center justify-center w-8 h-8 bg-white/90 rounded-full backdrop-blur-sm">
                        <Play className="h-4 w-4 text-gray-900 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <Play className="h-6 w-6 text-gray-400" data-testid="play-icon" />
                </div>
              )}
              
              {/* Duration badge */}
              <div className="absolute bottom-1 right-1 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                {formatDuration(summary.duration)}
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Enhanced action buttons with improved visibility and accessibility */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
        {onShare && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onShare(summary.id)
            }}
            disabled={isSharing}
            className={`relative rounded-lg p-2 bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={isSharing ? "Creating share link..." : "Share summary"}
            title={isSharing ? "Creating share link..." : "Share this summary"}
            style={{ pointerEvents: 'auto' }}
          >
            {isSharing ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-700 border-t-transparent" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete(summary.id)
            }}
            className="relative rounded-lg p-2 bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            aria-label="Delete summary"
            title="Delete this summary"
            style={{ pointerEvents: 'auto' }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        
        {/* More actions button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowActions(!showActions)
          }}
          className="relative rounded-lg p-2 bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-300 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          aria-label="More actions"
          title="More actions"
          style={{ pointerEvents: 'auto' }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* Actions Dropdown */}
      {showActions && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-20" 
            onClick={() => setShowActions(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-4 top-4 z-30 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
            <Link
              href={`/library/${summary.id}`}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="h-4 w-4" />
              View Details
            </Link>
            <Link
              href={`/library/${summary.id}/edit`}
              className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Edit3 className="h-4 w-4" />
              Edit Summary
            </Link>
            {onShare && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onShare(summary.id)
                  setShowActions(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Share Summary
              </button>
            )}
            <div className="my-1 h-px bg-gray-100" />
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete(summary.id)
                  setShowActions(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete Summary
              </button>
            )}
          </div>
        </>
      )}
    </article>
  )
}