'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Filter, Grid, List, SortDesc, Clock, Calendar, Play, Star, Zap, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const handleSearchChange = (value: string) => {
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search in titles, channels, and content... (⌘K)"
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-12 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          {/* Search Suggestions */}
          {searchFocused && !filters.search && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-3 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Popular searches</p>
              </div>
              <div className="p-2">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchChange(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2"
                  >
                    <Search className="h-3 w-3 text-gray-400" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700 hidden sm:block">Quick filters:</span>
          
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

        {/* Smart Collections */}
        {((availableCategories && availableCategories.length > 0) || (availableTags && availableTags.length > 0)) && (
          <div className="border-t border-gray-200 pt-3">
            <div className="space-y-3">
              {/* Categories */}
              {availableCategories && availableCategories.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700 block mb-2">Categories:</span>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.slice(0, 8).map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryToggle(category.name)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                          filters.categories?.includes(category.name)
                            ? "bg-purple-100 text-purple-700 border border-purple-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                        )}
                      >
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        {category.name}
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/60 rounded">
                          {category.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {availableTags && availableTags.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700 block mb-2">Tags:</span>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.slice(0, 12).map((tag) => {
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

                      return (
                        <button
                          key={tag.id}
                          onClick={() => handleTagToggle(tag.name)}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                            filters.tags?.includes(tag.name)
                              ? getTagColor(tag.type)
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent"
                          )}
                        >
                          {tag.name}
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/60 rounded">
                            {tag.count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
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