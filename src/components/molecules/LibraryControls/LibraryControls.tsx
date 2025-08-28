'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Filter, Grid, List, SortDesc, Clock, Calendar, Play, Star, Zap, X, Plus, Folder, Hash, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TagBadge } from '@/components/atoms/TagBadge'
import { CategoryBadge } from '@/components/atoms/CategoryBadge'

export interface LibraryFilters {
  search: string
  sortBy: 'date' | 'title' | 'duration' | 'channel'
  sortOrder: 'asc' | 'desc'
  dateRange?: 'day' | 'week' | 'month' | 'year'
  durationRange?: 'short' | 'medium' | 'long'
  categories?: string[]
  tags?: string[]
}

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

interface LibraryControlsProps {
  filters: LibraryFilters
  onFiltersChange: (filters: LibraryFilters) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  totalCount?: number
  availableTags?: TagWithCount[]
  availableCategories?: CategoryWithCount[]
}

export function LibraryControls({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  totalCount,
  availableTags = [],
  availableCategories = []
}: LibraryControlsProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [showUrlHint, setShowUrlHint] = useState(false)
  const [expandedTagTypes, setExpandedTagTypes] = useState<Set<string>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  // Quick filter presets
  const quickFilters = [
    { 
      id: 'recent', 
      label: 'Recent', 
      icon: Clock, 
      filter: { dateRange: 'week' as const },
      active: filters.dateRange === 'week'
    },
    { 
      id: 'today', 
      label: 'Today', 
      icon: Calendar, 
      filter: { dateRange: 'day' as const },
      active: filters.dateRange === 'day'
    },
    { 
      id: 'short', 
      label: 'Quick Reads', 
      icon: Zap, 
      filter: { durationRange: 'short' as const },
      active: filters.durationRange === 'short'
    },
    { 
      id: 'long', 
      label: 'Deep Dives', 
      icon: Play, 
      filter: { durationRange: 'long' as const },
      active: filters.durationRange === 'long'
    },
  ]

  // Search suggestions based on common search patterns
  const searchSuggestions = [
    'React tutorial',
    'JavaScript tips',
    'AI development',
    'Next.js guide',
    'TypeScript best practices',
    'Web development',
  ]

  // URL detection helper
  const isYouTubeUrl = (text: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)/,
      /youtube\.com\/watch\?.*v=/,
      /youtu\.be\//
    ]
    return patterns.some(pattern => pattern.test(text.trim()))
  }

  const handleSearchChange = (value: string) => {
    // Check if the input looks like a YouTube URL
    if (value.trim() && isYouTubeUrl(value)) {
      setShowUrlHint(true)
      // Auto-hide the hint after 5 seconds
      setTimeout(() => setShowUrlHint(false), 5000)
    } else {
      setShowUrlHint(false)
    }
    
    onFiltersChange({ ...filters, search: value })
  }

  const handleSortChange = (sortBy: LibraryFilters['sortBy']) => {
    const sortOrder = filters.sortBy === sortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc'
    onFiltersChange({ ...filters, sortBy, sortOrder })
  }

  const handleFilterChange = (key: keyof LibraryFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleQuickFilterClick = (filterOptions: Partial<LibraryFilters>) => {
    // Toggle off if already active, otherwise apply the filter
    const newFilters = { ...filters }
    Object.entries(filterOptions).forEach(([key, value]) => {
      if (filters[key as keyof LibraryFilters] === value) {
        // Toggle off - reset to undefined
        if (key === 'dateRange') {
          newFilters.dateRange = undefined
        } else if (key === 'durationRange') {
          newFilters.durationRange = undefined
        }
      } else {
        // Apply the filter
        if (key === 'dateRange') {
          newFilters.dateRange = value as LibraryFilters['dateRange']
        } else if (key === 'durationRange') {
          newFilters.durationRange = value as LibraryFilters['durationRange']
        }
      }
    })
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      sortBy: 'date',
      sortOrder: 'desc',
      dateRange: undefined,
      durationRange: undefined,
      categories: undefined,
      tags: undefined,
    })
  }

  const handleCategoryToggle = (categoryName: string) => {
    const currentCategories = filters.categories || []
    const newCategories = currentCategories.includes(categoryName)
      ? currentCategories.filter(c => c !== categoryName)
      : [...currentCategories, categoryName]
    
    onFiltersChange({ 
      ...filters, 
      categories: newCategories.length > 0 ? newCategories : undefined 
    })
  }

  const handleTagToggle = (tagName: string) => {
    const currentTags = filters.tags || []
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter(t => t !== tagName)
      : [...currentTags, tagName]
    
    onFiltersChange({ 
      ...filters, 
      tags: newTags.length > 0 ? newTags : undefined 
    })
  }

  const hasActiveFilters = filters.search || filters.dateRange || filters.durationRange || 
    (filters.categories && filters.categories.length > 0) || 
    (filters.tags && filters.tags.length > 0)

  // Group tags by type for better organization
  const groupedTags = availableTags.reduce((acc, tag) => {
    const type = tag.type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(tag)
    return acc
  }, {} as Record<string, typeof availableTags>)

  // Toggle expanded state for tag type sections
  const toggleTagTypeExpansion = (type: string) => {
    const newExpanded = new Set(expandedTagTypes)
    if (newExpanded.has(type)) {
      newExpanded.delete(type)
    } else {
      newExpanded.add(type)
    }
    setExpandedTagTypes(newExpanded)
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape' && searchFocused) {
        searchRef.current?.blur()
        setSearchFocused(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchFocused])

  return (
    <div className="space-y-4">
      {/* Enhanced Search with Quick Filters */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search your summaries... (⌘K)"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            className="w-full rounded-lg border-2 border-gray-200 bg-gray-50/50 pl-11 pr-12 py-3 text-sm text-gray-700 placeholder:text-gray-500 focus:border-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-300/30 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {/* Search Suggestions */}
          {searchFocused && !filters.search && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-3 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Popular searches</p>
              </div>
              <div className="p-2">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchChange(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2 transition-colors"
                  >
                    <Search className="h-3 w-3 text-gray-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* URL Detection Hint */}
          {showUrlHint && filters.search && isYouTubeUrl(filters.search) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-blue-50 border border-blue-200 rounded-lg shadow-lg z-10 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                  <Plus className="h-3 w-3 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900">Want to create a new summary?</p>
                  <p className="text-xs text-blue-700 mt-1">
                    This looks like a YouTube URL. Use the &quot;Create New Summary&quot; section above to generate an AI summary.
                  </p>
                </div>
                <button
                  onClick={() => setShowUrlHint(false)}
                  className="flex-shrink-0 text-blue-400 hover:text-blue-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Filters with Popular Tags */}
        <div className="space-y-2">
          {/* Quick Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700 hidden sm:block">Filters:</span>
            
            {quickFilters.map((filter) => {
              const Icon = filter.icon
              return (
                <button
                  key={filter.id}
                  onClick={() => handleQuickFilterClick(filter.filter)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    filter.active
                      ? "bg-blue-100 text-blue-700 border border-blue-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {filter.label}
                </button>
              )
            })}
            
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Popular Tags Row */}
          {availableTags && availableTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-gray-700 hidden sm:block">Popular:</span>
              
              {availableTags.slice(0, 6).map((tag) => (
                <TagBadge
                  key={tag.id}
                  name={tag.name}
                  type={tag.type}
                  count={tag.count}
                  selected={filters.tags?.includes(tag.name)}
                  onClick={() => handleTagToggle(tag.name)}
                  size="sm"
                />
              ))}
              
              {availableTags.length > 6 && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  +{availableTags.length - 6} more
                </button>
              )}
            </div>
          )}
        </div>

        {/* Advanced Filters - Collapsible with Enhanced Layout */}
        {showFilters && ((availableCategories && availableCategories.length > 0) || (availableTags && availableTags.length > 0)) && (
          <div className="border-t border-gray-200 pt-4 space-y-4">
            {/* Categories Section with Enhanced Visual Hierarchy */}
            {availableCategories && availableCategories.length > 0 && (
              <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <Folder className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-900">
                    Categories
                  </span>
                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                    {availableCategories.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((category) => (
                    <CategoryBadge
                      key={category.id}
                      name={category.name}
                      count={category.count}
                      selected={filters.categories?.includes(category.name)}
                      onClick={() => handleCategoryToggle(category.name)}
                      size="sm"
                      interactive
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tags Section with Type Grouping */}
            {availableTags && availableTags.length > 6 && (
              <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    All Tags
                  </span>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    {availableTags.length}
                  </span>
                </div>
                
                {/* Grouped Tags by Type */}
                <div className="space-y-3">
                  {Object.entries(groupedTags).map(([type, tags]) => {
                    // Show ALL tags in the expanded section, including those in popular
                    if (tags.length === 0) return null
                    
                    const isExpanded = expandedTagTypes.has(type)
                    const displayTags = isExpanded ? tags : tags.slice(0, 8)
                    const hasMore = tags.length > 8
                    
                    return (
                      <div key={type} className="pb-2 border-b border-blue-100 last:border-b-0">
                        <button
                          onClick={() => toggleTagTypeExpansion(type)}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-800 hover:text-blue-900 mb-2 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          <span className="capitalize">{type}s</span>
                          <span className="text-blue-600">({tags.length})</span>
                        </button>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                          {displayTags.map((tag) => (
                            <TagBadge
                              key={tag.id}
                              name={tag.name}
                              type={tag.type}
                              count={tag.count}
                              selected={filters.tags?.includes(tag.name)}
                              onClick={() => handleTagToggle(tag.name)}
                              size="sm"
                            />
                          ))}
                        </div>
                        
                        {!isExpanded && hasMore && (
                          <button
                            onClick={() => toggleTagTypeExpansion(type)}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                          >
                            Show {tags.length - 8} more {type}s
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Stats and Results */}
        <div className="flex items-center gap-4">
          {totalCount !== undefined && (
            <span className="text-sm text-gray-600">
              <span className="font-medium">{totalCount}</span> {totalCount === 1 ? 'summary' : 'summaries'}
              {filters.search && ` matching "${filters.search}"`}
            </span>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Advanced Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              showFilters 
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            <Filter className="h-4 w-4" />
            Advanced
          </button>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-300 bg-white">
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                "p-2 text-sm transition-colors",
                viewMode === 'grid'
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                "p-2 text-sm transition-colors",
                viewMode === 'list'
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Sort by</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleSortChange(e.target.value as LibraryFilters['sortBy'])}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="date">Date Created</option>
                <option value="title">Video Title</option>
                <option value="duration">Duration</option>
                <option value="channel">Channel Name</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Date Range</label>
              <select
                value={filters.dateRange || 'all'}
                onChange={(e) => handleFilterChange('dateRange', e.target.value === 'all' ? undefined : e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Time</option>
                <option value="day">Last Day</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
            </div>

            {/* Duration Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Video Length</label>
              <select
                value={filters.durationRange || 'all'}
                onChange={(e) => handleFilterChange('durationRange', e.target.value === 'all' ? undefined : e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">Any Length</option>
                <option value="short">Short (&lt;5 min)</option>
                <option value="medium">Medium (5-20 min)</option>
                <option value="long">Long (&gt;20 min)</option>
              </select>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}