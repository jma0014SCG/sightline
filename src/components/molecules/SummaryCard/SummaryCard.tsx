'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MoreVertical, Eye, Share2, Trash2, Edit3, Play, CheckSquare, Square, Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { Summary, Category, Tag } from '@prisma/client'
import { TagBadge } from '@/components/atoms/TagBadge'
import { CategoryBadge } from '@/components/atoms/CategoryBadge'
import { formatCount } from '@/lib/tag-utils'

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
  isLoadingTags?: boolean
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
  isLoadingTags = false
}: SummaryCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null)
  
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

  const formatRelativeDate = (date: Date | string | null) => {
    if (!date) return null
    
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
    return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`
  }

  // formatCount is now imported from tag-utils
  
  // Handle hover preview
  const handleMouseEnter = () => {
    const timer = setTimeout(() => {
      setShowPreview(true)
    }, 500)
    setHoverTimer(timer)
  }
  
  const handleMouseLeave = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
    setShowPreview(false)
  }

  // Extract key insights from content for preview
  const getKeyInsights = () => {
    if (summary.keyPoints && Array.isArray(summary.keyPoints)) {
      return summary.keyPoints.slice(0, 3).map(point => String(point))
    }
    
    // Fallback: Extract first few sentences from content
    const sentences = summary.content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    return sentences.slice(0, 2).map(s => s.trim())
  }

  const keyInsights = getKeyInsights()

  // State for expanding tags
  const [showAllTags, setShowAllTags] = useState(false)
  
  // Helper function to render tags with improved accessibility
  const renderTags = (tags: Tag[], limit = 3) => {
    const displayTags = showAllTags ? tags : tags.slice(0, limit)
    const remainingCount = tags.length - limit

    return (
      <div className="flex flex-wrap gap-1.5 items-center">
        {displayTags.map((tag) => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            type={tag.type}
            size="sm"
            className="min-h-[32px] hover:scale-105 transition-transform duration-200"
          />
        ))}
        {remainingCount > 0 && !showAllTags && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowAllTags(true)
            }}
            className="inline-flex items-center px-2.5 py-1.5 min-h-[32px] text-xs font-semibold rounded-full bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer border border-gray-200/50"
            aria-label={`Show ${remainingCount} more tags`}
          >
            +{remainingCount} more
          </button>
        )}
        {showAllTags && tags.length > limit && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowAllTags(false)
            }}
            className="inline-flex items-center px-2.5 py-1.5 min-h-[32px] text-xs font-semibold rounded-full bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 hover:from-gray-100 hover:to-gray-200 hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer border border-gray-200/50"
            aria-label="Show less tags"
          >
            Show less
          </button>
        )}
      </div>
    )
  }

  // Helper function to render categories with better accessibility
  const renderCategories = (categories: Category[], limit = 2) => {
    const displayCategories = categories.slice(0, limit)
    const remainingCount = categories.length - limit

    return (
      <div className="flex flex-wrap gap-1.5">
        {displayCategories.map((category) => (
          <CategoryBadge
            key={category.id}
            name={category.name}
            size="sm"
            className="min-h-[32px] hover:scale-105 transition-transform duration-200"
          />
        ))}
        {remainingCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-1.5 min-h-[32px] text-xs font-medium rounded-full border border-gray-200 bg-gray-50 text-gray-600">
            +{remainingCount}
          </span>
        )}
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <article 
        className={cn(
          "group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/50 transition-all duration-300",
        "hover:border-blue-300 hover:shadow-xl hover:-translate-y-1 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/30",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500",
          isSelected && "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50",
          className
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          <div className="flex gap-4 p-4">
            {/* Thumbnail - 16:9 aspect ratio with enhanced display */}
            <div className="relative h-[96px] w-[170px] flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 shadow-md group-hover:shadow-lg transition-shadow duration-300">
              {summary.thumbnailUrl ? (
                <>
                  <Image
                    src={summary.thumbnailUrl}
                    alt={summary.videoTitle}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Enhanced play overlay with smooth animation */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-white/95 rounded-full backdrop-blur-sm shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300 ease-out">
                        <Play className="h-5 w-5 text-blue-600 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <Play className="h-6 w-6 text-gray-400" data-testid="play-icon" />
                </div>
              )}
              
              {/* Enhanced duration badge */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/80 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <Clock className="h-3 w-3" />
                {formatDuration(summary.duration)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header with channel info - enhanced visual hierarchy */}
              <div className="mb-2 flex items-center gap-2 text-xs">
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-700 truncate max-w-[150px] inline-block align-bottom">{summary.channelName}</span>
                <span className="text-gray-300">•</span>
                <time className="flex items-center gap-1 text-gray-600 font-medium">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  {formatDate(summary.createdAt)}
                </time>
              </div>

              {/* Title - Enhanced typography with smooth hover and better text wrapping */}
              <h3 className="mb-2 text-base font-bold text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300 break-words">
                <span className="line-clamp-2">{summary.videoTitle}</span>
              </h3>

              {/* Key insights preview - improved readability and text wrapping */}
              {keyInsights.length > 0 && (
                <p className="text-xs text-gray-500 mb-1.5 leading-relaxed break-words">
                  <span className="line-clamp-1">{keyInsights[0]}</span>
                </p>
              )}

              {/* Tags and Categories - inline */}
              {((summary.categories && summary.categories.length > 0) || (summary.tags && summary.tags.length > 0)) ? (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  {summary.categories && summary.categories.length > 0 && renderCategories(summary.categories, 1)}
                  {summary.tags && summary.tags.length > 0 && renderTags(summary.tags, 2)}
                </div>
              ) : isLoadingTags ? (
                <div className="mb-1.5 flex items-center gap-2 text-xs text-gray-500">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                  <span>Loading tags...</span>
                </div>
              ) : null}

              {/* Footer - Enhanced engagement bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-xs text-gray-600 font-medium">
                  {/* Upload date if available */}
                  {summary.uploadDate && (
                    <>
                      <span className="flex items-center gap-1" title={formatDate(summary.uploadDate)}>
                        <Calendar className="h-3 w-3" />
                        {formatRelativeDate(summary.uploadDate)}
                      </span>
                      <span className="text-gray-400">•</span>
                    </>
                  )}
                  
                  {/* Compact engagement metrics with emojis */}
                  {summary.viewCount && (
                    <span className="flex items-center gap-0.5">
                      <span className="text-sm">👁</span>
                      <span>{formatCount(summary.viewCount)}</span>
                    </span>
                  )}
                  {summary.likeCount && summary.viewCount && (
                    <span className="flex items-center gap-0.5">
                      <span className="text-sm">👍</span>
                      <span>{Math.round((summary.likeCount / summary.viewCount) * 100)}%</span>
                    </span>
                  )}
                  {summary.commentCount && (
                    <span className="flex items-center gap-0.5">
                      <span className="text-sm">💬</span>
                      <span>{formatCount(summary.commentCount)}</span>
                    </span>
                  )}
                  
                  {/* Fallback if no metadata */}
                  {!summary.viewCount && !summary.likeCount && !summary.uploadDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(summary.createdAt)}</span>
                    </span>
                  )}
                </div>
                
                {/* Enhanced action buttons - always visible but subtle */}
                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-all duration-300 transform scale-95 group-hover:scale-100">
                  {onShare && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onShare(summary.id)
                      }}
                      className="rounded-lg p-1.5 text-gray-500 bg-white/50 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md transition-all duration-200"
                      aria-label="Share summary"
                      title="Share"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onDelete(summary.id)
                      }}
                      className="rounded-lg p-1.5 text-gray-500 bg-white/50 hover:bg-red-50 hover:text-red-600 hover:shadow-md transition-all duration-200"
                      aria-label="Delete summary"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Fallback more actions button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setShowActions(!showActions)
                    }}
                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    aria-label="More actions"
                    title="More"
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
              className="fixed inset-0 z-40" 
              onClick={() => setShowActions(false)}
            />
            
            {/* Dropdown - positioned near the 3-dot button */}
            <div className="absolute right-2 bottom-16 z-50 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
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

  // Grid view - enhanced with better visual hierarchy
  return (
    <article 
      className={cn(
        "group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/30 transition-all duration-300",
        "hover:border-blue-300 hover:shadow-2xl hover:-translate-y-1.5 hover:bg-gradient-to-br hover:from-white hover:to-blue-50/40",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-500",
        isSelected && "border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
        <div className="flex items-start gap-4 p-4 pb-12">
          <div className="flex-1 min-w-0">
            {/* Main content area */}
            <div>
              {/* Header with channel info - enhanced */}
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-700 truncate max-w-[200px] inline-block align-bottom">{summary.channelName}</span>
                <span className="text-gray-300">•</span>
                <time className="flex items-center gap-1 text-gray-600 font-medium">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  {formatDate(summary.createdAt)}
                </time>
              </div>

              {/* Title - Enhanced with gradient on hover and better text wrapping */}
              <h3 className="mb-3 text-lg font-bold text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-blue-700 transition-all duration-300 break-words">
                <span className="line-clamp-2">{summary.videoTitle}</span>
              </h3>

              {/* Key insights preview - better contrast and text wrapping */}
              {keyInsights.length > 0 && (
                <p className="text-sm text-gray-500 mb-3 leading-relaxed break-words">
                  <span className="line-clamp-2">{keyInsights[0]}</span>
                </p>
              )}

              {/* Tags and Categories - inline without labels */}
              {((summary.categories && summary.categories.length > 0) || (summary.tags && summary.tags.length > 0)) ? (
                <div className="mb-2 flex flex-wrap gap-1">
                  {summary.categories && summary.categories.length > 0 && renderCategories(summary.categories, 2)}
                  {summary.tags && summary.tags.length > 0 && renderTags(summary.tags, 2)}
                </div>
              ) : isLoadingTags ? (
                <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                  <span>Loading tags...</span>
                </div>
              ) : null}
            </div>

            {/* Footer - Compact engagement bar */}
            <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
              {/* Upload date if available */}
              {summary.uploadDate && (
                <>
                  <span className="flex items-center gap-1" title={formatDate(summary.uploadDate)}>
                    <Calendar className="h-3 w-3" />
                    {formatRelativeDate(summary.uploadDate)}
                  </span>
                  {(summary.viewCount || summary.likeCount) && <span className="text-gray-400">•</span>}
                </>
              )}
              
              {/* Compact engagement metrics */}
              {summary.viewCount && (
                <span className="flex items-center gap-0.5 font-medium">
                  <span className="text-base">👁</span>
                  <span>{formatCount(summary.viewCount)}</span>
                </span>
              )}
              {summary.likeCount && summary.viewCount && (
                <span className="flex items-center gap-0.5 font-medium">
                  <span className="text-base">👍</span>
                  <span>{Math.round((summary.likeCount / summary.viewCount) * 100)}%</span>
                </span>
              )}
              {summary.commentCount && (
                <span className="flex items-center gap-0.5 font-medium">
                  <span className="text-base">💬</span>
                  <span>{formatCount(summary.commentCount)}</span>
                </span>
              )}
              {summary.duration && (
                <span className="flex items-center gap-0.5 font-medium">
                  <span className="text-base">⏱</span>
                  <span>{formatDuration(summary.duration)}</span>
                </span>
              )}
              
              {/* Fallback if no metadata */}
              {!summary.viewCount && !summary.likeCount && !summary.uploadDate && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(summary.createdAt)}</span>
                </span>
              )}
              
              {/* Removed insights count for cleaner design */}
            </div>
          </div>

          {/* Thumbnail - 16:9 aspect ratio - slightly larger */}
          <div className="flex-shrink-0">
            <div className="relative h-[108px] w-[192px] overflow-hidden rounded-lg bg-gray-100 shadow-sm">
              {summary.thumbnailUrl ? (
                <>
                  <Image
                    src={summary.thumbnailUrl}
                    alt={summary.videoTitle}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Enhanced play overlay with smooth animation */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-white/95 rounded-full backdrop-blur-sm shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300 ease-out">
                        <Play className="h-5 w-5 text-blue-600 ml-0.5" />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <Play className="h-6 w-6 text-gray-400" data-testid="play-icon" />
                </div>
              )}
              
              {/* Enhanced duration badge */}
              <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/80 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <Clock className="h-3 w-3" />
                {formatDuration(summary.duration)}
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Quick Preview Tooltip */}
      {showPreview && keyInsights.length > 0 && (
        <div className="absolute top-full left-4 right-4 mt-2 z-50 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-900">Quick Preview</h4>
            <div className="space-y-1">
              {keyInsights.slice(0, 3).map((insight, index) => (
                <p key={index} className="text-xs text-gray-600 line-clamp-2">
                  • {insight}
                </p>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                📚 {Math.ceil(summary.content.split(' ').length / 200)} min read
              </span>
              {summary.duration && (
                <span className="text-xs text-gray-500">
                  🎥 {formatDuration(summary.duration)} video
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced action buttons with better visibility */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
        {onShare && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onShare(summary.id)
            }}
            className="rounded-lg p-2 bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-600 hover:bg-white hover:text-blue-600 hover:border-blue-300 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            aria-label="Share summary"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete(summary.id)
            }}
            className="rounded-lg p-2 bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-600 hover:bg-white hover:text-red-600 hover:border-red-300 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
            aria-label="Delete summary"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        
        {/* More actions button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            setShowActions(!showActions)
          }}
          className="rounded-lg p-2 bg-white/95 backdrop-blur-sm border border-gray-200 text-gray-600 hover:bg-white hover:text-gray-800 hover:border-gray-300 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
          aria-label="More actions"
          title="More"
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
          
          {/* Dropdown - positioned above the action buttons */}
          <div className="absolute right-2 bottom-14 z-50 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
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