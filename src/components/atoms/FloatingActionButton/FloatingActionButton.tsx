'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingActionButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
  tooltip?: string
}

export function FloatingActionButton({ 
  onClick, 
  disabled = false, 
  className,
  tooltip = "Create new summary"
}: FloatingActionButtonProps) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full",
          "bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-4",
          "focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all",
          "duration-300 hover:scale-110 hover:shadow-xl active:scale-95",
          className
        )}
        aria-label={tooltip}
      >
        <Plus className="h-6 w-6" />
      </button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          {tooltip}
          <div className="absolute top-full right-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  )
}