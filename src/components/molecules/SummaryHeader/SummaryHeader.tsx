'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Edit3, Trash2, User, Clock, Eye, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TagBadge } from '@/components/atoms/TagBadge'
import { CategoryBadge } from '@/components/atoms/CategoryBadge'
import { formatCount } from '@/lib/tag-utils'
import type { Summary, Category, Tag } from '@prisma/client'

type SummaryWithRelations = Summary & {
  categories?: Category[]
  tags?: Tag[]
}

interface SummaryHeaderProps {
  summary: SummaryWithRelations
  onBack?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onTagClick?: (tagName: string) => void
  onCategoryClick?: (categoryName: string) => void
  className?: string
}

export function SummaryHeader({ 
  summary, 
  onBack,
  onEdit, 
  onDelete, 
  onTagClick, 
  onCategoryClick,
  className 
}: SummaryHeaderProps) {
  const router = useRouter()
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.push('/library')
    }
  }
  
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
    <header className={cn("bg-white border-b border-gray-200 sticky top-0 z-10", className)}>
      {/* Breadcrumb Navigation */}
      <div className="px-4 py-2 border-b border-gray-100">
        <nav className="flex items-center gap-2 text-sm">
          <button 
            onClick={handleBack} 
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Library
          </button>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="text-gray-900 font-medium truncate max-w-md">
            {summary.videoTitle}
          </span>
        </nav>
      </div>

      {/* Main Header Content */}
      <div className="px-4 py-4 space-y-3">
        {/* Title and Actions Row */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex-1 line-clamp-2">
            {summary.videoTitle}
          </h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onEdit && (
              <button 
                onClick={onEdit}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                aria-label="Edit summary"
              >
                <Edit3 className="h-5 w-5" />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={onDelete}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                aria-label="Delete summary"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          {summary.channelName && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{summary.channelName}</span>
            </div>
          )}
          {summary.duration && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(summary.duration)}</span>
            </div>
          )}
          {summary.viewCount && (
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{formatCount(summary.viewCount)} views</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <time dateTime={new Date(summary.createdAt).toISOString()}>
              {formatDate(summary.createdAt)}
            </time>
          </div>
        </div>

        {/* Tags and Categories Row */}
        {((summary.tags && summary.tags.length > 0) || (summary.categories && summary.categories.length > 0)) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            {/* Categories */}
            {summary.categories?.map(category => (
              <CategoryBadge
                key={category.id}
                name={category.name}
                onClick={() => onCategoryClick?.(category.name)}
                interactive
                size="sm"
                className="hover:scale-105"
              />
            ))}
            
            {/* Tags */}
            {summary.tags?.slice(0, 8).map(tag => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                type={tag.type}
                onClick={() => onTagClick?.(tag.name)}
                interactive
                size="sm"
              />
            ))}
            
            {summary.tags && summary.tags.length > 8 && (
              <button 
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => {
                  // Could open a modal or expand to show all tags
                  console.log('Show all tags')
                }}
              >
                +{summary.tags.length - 8} more
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}