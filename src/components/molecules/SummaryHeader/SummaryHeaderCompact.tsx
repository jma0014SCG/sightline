'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit3, Trash2, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

type SummaryWithRelations = Summary & {
  categories?: Category[]
  tags?: Tag[]
}

interface SummaryHeaderCompactProps {
  summary: SummaryWithRelations
  onBack?: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

export function SummaryHeaderCompact({ 
  summary, 
  onBack,
  onEdit, 
  onDelete, 
  className 
}: SummaryHeaderCompactProps) {
  const router = useRouter()
  
  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.push('/library')
    }
  }
  
  // Truncate title for breadcrumb
  const truncateTitle = (title: string, maxLength: number = 30) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }
  
  return (
    <header className={cn("bg-white border-b border-gray-200 sticky top-0 z-10", className)}>
      {/* Minimal Breadcrumb Bar */}
      <div className="px-4 py-2 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-sm">
          <button 
            onClick={handleBack} 
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Library
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600 truncate max-w-xs" title={summary.videoTitle}>
            {truncateTitle(summary.videoTitle)}
          </span>
        </nav>
        
        {/* Compact Actions */}
        <div className="flex items-center gap-1">
          {onEdit && (
            <button 
              onClick={onEdit}
              className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
              aria-label="Edit summary"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={onDelete}
              className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-all"
              aria-label="Delete summary"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}