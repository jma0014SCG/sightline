'use client'

import { useState } from 'react'
import { Search, Filter, Grid, List, SortDesc } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LibraryFilters {
  search: string
  sortBy: 'date' | 'title' | 'duration' | 'channel'
  sortOrder: 'asc' | 'desc'
  dateRange?: 'day' | 'week' | 'month' | 'year'
  durationRange?: 'short' | 'medium' | 'long'
}

interface LibraryControlsProps {
  filters: LibraryFilters
  onFiltersChange: (filters: LibraryFilters) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  totalCount?: number
}

export function LibraryControls({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  totalCount
}: LibraryControlsProps) {
  const [showFilters, setShowFilters] = useState(false)

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

  return (
    <div className="space-y-4">
      {/* Main Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search summaries..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Results Count */}
          {totalCount !== undefined && (
            <span className="text-sm text-gray-500">
              {totalCount} {totalCount === 1 ? 'summary' : 'summaries'}
            </span>
          )}

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <SortDesc className="h-4 w-4" />
              Sort
            </button>
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
              showFilters 
                ? "border-primary-500 bg-primary-50 text-primary-700"
                : "border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>

          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-300">
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                "p-2 text-sm",
                viewMode === 'grid'
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                "p-2 text-sm",
                viewMode === 'list'
                  ? "bg-primary-600 text-white"
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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