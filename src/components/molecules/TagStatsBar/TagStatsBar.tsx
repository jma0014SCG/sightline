'use client'

import { useState } from 'react'
import { TrendingUp, Hash, Tag, Folder, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TagBadge } from '@/components/atoms/TagBadge'
import { CategoryBadge } from '@/components/atoms/CategoryBadge'

interface TagWithCount {
  id: string
  name: string
  type: string
  count: number
}

interface CategoryWithCount {
  id: string
  name: string
  count: number
}

interface TagStatsBarProps {
  tags: TagWithCount[]
  categories: CategoryWithCount[]
  onTagClick: (tagName: string) => void
  onCategoryClick: (categoryName: string) => void
  selectedTags?: string[]
  selectedCategories?: string[]
  className?: string
}

export function TagStatsBar({
  tags,
  categories,
  onTagClick,
  onCategoryClick,
  selectedTags = [],
  selectedCategories = [],
  className
}: TagStatsBarProps) {
  const [expanded, setExpanded] = useState(false)

  // Calculate stats
  const totalTags = tags.reduce((sum, tag) => sum + tag.count, 0)
  const totalCategories = categories.reduce((sum, cat) => sum + cat.count, 0)
  const topTags = tags.slice(0, expanded ? 10 : 5)
  const topCategories = categories.slice(0, expanded ? 6 : 3)

  // Find trending tags (highest count)
  const trendingTag = tags[0]
  const trendingCategory = categories[0]

  if (tags.length === 0 && categories.length === 0) {
    return null
  }

  return (
    <div className={cn("bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-4", className)}>
      {/* Stats Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-6">
          {/* Total Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-700">{tags.length} tags</span>
              <span className="text-gray-500">({totalTags} uses)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Folder className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-gray-700">{categories.length} categories</span>
              <span className="text-gray-500">({totalCategories} uses)</span>
            </div>
          </div>

          {/* Trending Indicators */}
          {(trendingTag || trendingCategory) && (
            <div className="flex items-center gap-3 pl-4 border-l border-gray-300">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-gray-600">Trending:</span>
              </div>
              {trendingTag && (
                <TagBadge
                  name={trendingTag.name}
                  type={trendingTag.type}
                  count={trendingTag.count}
                  size="sm"
                  interactive
                  selected={selectedTags.includes(trendingTag.name)}
                  onClick={() => onTagClick(trendingTag.name)}
                  className="animate-pulse"
                />
              )}
              {trendingCategory && (
                <CategoryBadge
                  name={trendingCategory.name}
                  count={trendingCategory.count}
                  selected={selectedCategories.includes(trendingCategory.name)}
                  onClick={() => onCategoryClick(trendingCategory.name)}
                  size="sm"
                  interactive
                  className="animate-pulse"
                />
              )}
            </div>
          )}
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show more
            </>
          )}
        </button>
      </div>

      {/* Tag Cloud */}
      <div className="space-y-3">
        {/* Top Tags */}
        {topTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Tags:
            </span>
            {topTags.map((tag) => (
              <TagBadge
                key={tag.id}
                name={tag.name}
                type={tag.type}
                count={tag.count}
                size="sm"
                interactive
                selected={selectedTags.includes(tag.name)}
                onClick={() => onTagClick(tag.name)}
                className="hover:scale-105 transition-transform"
              />
            ))}
            {!expanded && tags.length > 5 && (
              <span className="text-xs text-gray-500">
                +{tags.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Top Categories */}
        {topCategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Folder className="h-3 w-3" />
              Categories:
            </span>
            {topCategories.map((category) => (
              <CategoryBadge
                key={category.id}
                name={category.name}
                count={category.count}
                selected={selectedCategories.includes(category.name)}
                onClick={() => onCategoryClick(category.name)}
                size="sm"
                interactive
                className="hover:scale-105 transition-transform"
              />
            ))}
            {!expanded && categories.length > 3 && (
              <span className="text-xs text-gray-500">
                +{categories.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Visual Progress Bar for Tag Distribution */}
      {expanded && tags.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="space-y-2">
            <span className="text-xs font-medium text-gray-600">Tag Distribution</span>
            <div className="flex gap-1 h-8">
              {tags.slice(0, 10).map((tag, index) => {
                const percentage = (tag.count / totalTags) * 100
                return (
                  <button
                    key={tag.id}
                    onClick={() => onTagClick(tag.name)}
                    className={cn(
                      "relative group cursor-pointer transition-all hover:scale-y-110",
                      selectedTags.includes(tag.name) ? "opacity-100" : "opacity-70 hover:opacity-100"
                    )}
                    style={{
                      width: `${Math.max(percentage, 5)}%`,
                      background: `hsl(${220 + index * 15}, 70%, ${60 - index * 3}%)`
                    }}
                    title={`${tag.name}: ${tag.count} uses`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        {tag.count}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
              {tags.slice(0, 10).map((tag, index) => (
                <div key={tag.id} className="flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{
                      background: `hsl(${220 + index * 15}, 70%, ${60 - index * 3}%)`
                    }}
                  />
                  <span>{tag.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}