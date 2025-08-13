'use client'

import { cn } from '@/lib/utils'
import { getTagColor, getTagHoverColor } from '@/lib/tag-utils'

interface TagBadgeProps {
  name: string
  type: string
  count?: number
  selected?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  className?: string
}

export function TagBadge({ 
  name, 
  type, 
  count, 
  selected = false, 
  onClick, 
  size = 'sm',
  interactive = false,
  className 
}: TagBadgeProps) {
  const isClickable = !!onClick || interactive
  const colorClass = selected ? getTagColor(type) : 'bg-gray-50 text-gray-600 border-gray-200'
  const hoverClass = isClickable ? (selected ? getTagHoverColor(type) : 'hover:bg-gray-100 hover:border-gray-300') : ''
  
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }
  
  const Component = isClickable ? 'button' : 'span'
  
  return (
    <Component
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium border transition-all',
        sizeClasses[size],
        colorClass,
        hoverClass,
        isClickable && 'cursor-pointer hover:scale-105',
        className
      )}
      aria-label={isClickable ? `Filter by ${name} tag` : `${name} tag`}
      aria-pressed={isClickable ? selected : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {name}
      {count !== undefined && (
        <span className="ml-0.5 opacity-60 text-[0.9em]">
          {count}
        </span>
      )}
    </Component>
  )
}