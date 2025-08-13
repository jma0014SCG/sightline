'use client'

import { cn } from '@/lib/utils'
import { getCategoryColor, getCategoryHoverColor } from '@/lib/tag-utils'

interface CategoryBadgeProps {
  name: string
  count?: number
  selected?: boolean
  onClick?: () => void
  size?: 'xs' | 'sm' | 'md'
  interactive?: boolean
  className?: string
}

export function CategoryBadge({
  name,
  count,
  selected = false,
  onClick,
  size = 'sm',
  interactive = false,
  className
}: CategoryBadgeProps) {
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  }

  const Component = interactive || onClick ? 'button' : 'span'

  return (
    <Component
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium border transition-all",
        sizeClasses[size],
        selected ? getCategoryColor() : "bg-purple-50 text-purple-700 border-purple-200",
        interactive && "cursor-pointer",
        interactive && !selected && "hover:bg-purple-100",
        interactive && selected && getCategoryHoverColor(),
        className
      )}
      aria-label={`Category: ${name}${count ? ` (${count} items)` : ''}`}
      aria-pressed={selected}
      role={interactive ? "button" : undefined}
    >
      <span className={cn(
        "rounded-full",
        size === 'xs' ? "w-1 h-1" : size === 'sm' ? "w-1.5 h-1.5" : "w-2 h-2",
        selected ? "bg-purple-600" : "bg-purple-400"
      )} />
      {name}
      {count !== undefined && (
        <span className="opacity-60">({count})</span>
      )}
    </Component>
  )
}