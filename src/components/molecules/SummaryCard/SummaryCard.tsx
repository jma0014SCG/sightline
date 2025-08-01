'use client'

import Link from 'next/link'
import { MoreVertical, Eye, Share2, Trash2, Edit3, Play, CheckSquare, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { Summary } from '@prisma/client'

interface SummaryCardProps {
  summary: Summary
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
          <div className="flex gap-4 p-4">
            {/* Compact Thumbnail */}
            <div className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {summary.thumbnailUrl ? (
                <>
                  <img
                    src={summary.thumbnailUrl}
                    alt={summary.videoTitle}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span className="font-medium text-blue-600">{summary.channelName}</span>
                <span className="text-gray-400">•</span>
                <time className="text-gray-500">{formatDate(summary.createdAt)}</time>
              </div>

              {/* Title */}
              <h3 className="mb-2 line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                {summary.videoTitle}
              </h3>

              {/* Key insights preview - compact */}
              {keyInsights.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {keyInsights[0].length > 120 ? `${keyInsights[0].substring(0, 120)}...` : keyInsights[0]}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    View Summary
                  </span>
                  {keyInsights.length > 1 && (
                    <span className="text-blue-600">+{keyInsights.length - 1} more insights</span>
                  )}
                </div>
                
                {/* Quick actions button */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setShowActions(!showActions)
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label="More actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
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
        <div className="flex items-start gap-4 p-6">
          <div className="flex-1">
            {/* Header with channel info */}
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="font-medium text-blue-600">{summary.channelName}</span>
              <span className="text-gray-400">•</span>
              <time className="text-gray-500">{formatDate(summary.createdAt)}</time>
            </div>

            {/* Title */}
            <h3 className="mb-3 line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
              {summary.videoTitle}
            </h3>

            {/* Key insights preview */}
            {keyInsights.length > 0 && (
              <div className="mb-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Key Insights:</h4>
                {keyInsights.slice(0, 2).map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {insight.length > 100 ? `${insight.substring(0, 100)}...` : insight}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Footer with stats and actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  View Summary
                </span>
                {keyInsights.length > 2 && (
                  <span className="text-blue-600">+{keyInsights.length - 2} more insights</span>
                )}
              </div>
              
              {/* Quick actions button */}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  setShowActions(!showActions)
                }}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Thumbnail - back to original smaller size */}
          <div className="ml-6 flex-shrink-0">
            <div className="relative h-24 w-40 overflow-hidden rounded-lg bg-gray-100">
              {summary.thumbnailUrl ? (
                <>
                  <img
                    src={summary.thumbnailUrl}
                    alt={summary.videoTitle}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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