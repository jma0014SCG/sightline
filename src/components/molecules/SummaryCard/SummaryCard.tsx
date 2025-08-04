'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MoreVertical, Eye, Share2, Trash2, Edit3, Play, CheckSquare, Square } from 'lucide-react'
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
}

export function SummaryCard({ 
  summary, 
  className, 
  onDelete, 
  onShare, 
  viewMode = 'grid',
  isSelected = false,
  onSelect,
  showSelection = false
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
                  <Play className="h-6 w-6 text-gray-400" />
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

              {/* Key insights preview - single line */}
              {keyInsights.length > 0 && (
                <p className="text-xs text-gray-600 line-clamp-1 mb-1.5 leading-snug">
                  {keyInsights[0].length > 100 ? `${keyInsights[0].substring(0, 100)}...` : keyInsights[0]}
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
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    View
                  </span>
                  {keyInsights.length > 1 && (
                    <span className="text-blue-600">+{keyInsights.length - 1} more</span>
                  )}
                </div>
                
                {/* Hover Actions - appear on card hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {onShare && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onShare(summary.id)
                      }}
                      className="rounded-lg p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      aria-label="Share summary"
                      title="Share"
                    >
                      <Share2 className="h-3 w-3" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onDelete(summary.id)
                      }}
                      className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      aria-label="Delete summary"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
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
                    <MoreVertical className="h-3 w-3" />
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
        <div className="flex items-start gap-4 p-4">
          <div className="flex-1">
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

            {/* Key insights preview - single line */}
            {keyInsights.length > 0 && (
              <p className="text-sm text-gray-600 line-clamp-1 mb-3 leading-snug">
                {keyInsights[0].length > 80 ? `${keyInsights[0].substring(0, 80)}...` : keyInsights[0]}
              </p>
            )}

            {/* Tags and Categories - inline without labels */}
            {((summary.categories && summary.categories.length > 0) || (summary.tags && summary.tags.length > 0)) && (
              <div className="mb-3 flex flex-wrap gap-1">
                {summary.categories && summary.categories.length > 0 && renderCategories(summary.categories, 1)}
                {summary.tags && summary.tags.length > 0 && renderTags(summary.tags, 3)}
              </div>
            )}

            {/* Footer with stats and hover actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  View
                </span>
                {keyInsights.length > 1 && (
                  <span className="text-blue-600">+{keyInsights.length - 1} more</span>
                )}
              </div>
              
              {/* Hover Actions - appear on card hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {onShare && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onShare(summary.id)
                    }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    aria-label="Share summary"
                    title="Share"
                  >
                    <Share2 className="h-3 w-3" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDelete(summary.id)
                    }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label="Delete summary"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
                
                {/* Fallback more actions button */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setShowActions(!showActions)
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label="More actions"
                  title="More"
                >
                  <MoreVertical className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Compact Thumbnail */}
          <div className="ml-4 flex-shrink-0">
            <div className="relative h-20 w-32 overflow-hidden rounded-lg bg-gray-100">
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
                  <Play className="h-6 w-6 text-gray-400" />
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