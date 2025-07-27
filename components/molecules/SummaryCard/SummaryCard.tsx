'use client'

import Link from 'next/link'
import { Clock, Calendar, MoreVertical, Eye, Share2, Trash2, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { Summary } from '@prisma/client'

interface SummaryCardProps {
  summary: Summary
  className?: string
  onDelete?: (id: string) => void
  onShare?: (id: string) => void
}

export function SummaryCard({ summary, className, onDelete, onShare }: SummaryCardProps) {
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

  return (
    <Link
      href={`/library/${summary.id}`}
      className={cn(
        "block rounded-lg border border-gray-200 bg-white p-6",
        "transition-shadow hover:shadow-md focus:outline-none",
        "focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">
            {summary.videoTitle}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {summary.channelName}
          </p>
          
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(summary.duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(summary.createdAt)}</span>
            </div>
          </div>

          {/* Preview of content */}
          <p className="mt-3 line-clamp-3 text-sm text-gray-600">
            {summary.content.substring(0, 200)}...
          </p>
        </div>

        {/* Thumbnail */}
        {summary.thumbnailUrl && (
          <div className="ml-6 flex-shrink-0">
            <img
              src={summary.thumbnailUrl}
              alt={summary.videoTitle}
              className="h-24 w-40 rounded-lg object-cover"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {summary.keyPoints && Array.isArray(summary.keyPoints) && summary.keyPoints.slice(0, 2).map((point, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
            >
              {String(point).substring(0, 30)}...
            </span>
          ))}
        </div>
        
        <div className="relative">
          <button
            onClick={(e) => {
              e.preventDefault()
              setShowActions(!showActions)
            }}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          
          {/* Actions Dropdown */}
          {showActions && (
            <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <Link
                href={`/library/${summary.id}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="h-4 w-4" />
                View Details
              </Link>
              <Link
                href={`/library/${summary.id}/edit`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Share2 className="h-4 w-4" />
                  Share Summary
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete(summary.id)
                    setShowActions(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Summary
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}