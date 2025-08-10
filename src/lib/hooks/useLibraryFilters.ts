/**
 * Custom hook for managing library filters and view state
 * 
 * @module useLibraryFilters
 * @category Hooks
 */

import { useState, useMemo, useCallback } from 'react'
import { api } from '@/components/providers/TRPCProvider'
import type { LibraryFilters } from '@/components/molecules/LibraryControls'

export interface LibraryFilterState {
  filters: LibraryFilters
  viewMode: 'grid' | 'list'
  debouncedFilters: any
}

export interface LibraryFilterHandlers {
  setFilters: React.Dispatch<React.SetStateAction<LibraryFilters>>
  setViewMode: React.Dispatch<React.SetStateAction<'grid' | 'list'>>
  clearFilters: () => void
  clearSearch: () => void
}

export interface LibraryFilterData {
  availableTags: string[]
  availableCategories: string[]
  isLoadingTags: boolean
  isLoadingCategories: boolean
}

/**
 * Hook for managing library filters, view mode, and related data
 */
export function useLibraryFilters() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Filter state
  const [filters, setFilters] = useState<LibraryFilters>({
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
    dateRange: undefined,
    durationRange: undefined,
    categories: undefined,
    tags: undefined,
  })
  
  // Get tags and categories for smart filtering
  const { data: availableTags, isLoading: isLoadingTags } = api.library.getTags.useQuery()
  const { data: availableCategories, isLoading: isLoadingCategories } = api.library.getCategories.useQuery()
  
  // Debounced filters for API calls - only include defined values
  const debouncedFilters = useMemo(() => {
    const cleanFilters: any = {
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }
    
    // Only include search if it has a value
    if (filters.search && filters.search.trim()) {
      cleanFilters.search = filters.search
    }
    
    // Only add optional filters if they have values
    if (filters.dateRange) cleanFilters.dateRange = filters.dateRange
    if (filters.durationRange) cleanFilters.durationRange = filters.durationRange
    if (filters.categories && filters.categories.length > 0) {
      cleanFilters.categories = filters.categories
    }
    if (filters.tags && filters.tags.length > 0) {
      cleanFilters.tags = filters.tags
    }
    
    return cleanFilters
  }, [filters])
  
  /**
   * Clear all filters except sort settings
   */
  const clearFilters = useCallback(() => {
    setFilters(prev => ({
      search: '',
      sortBy: prev.sortBy, // Keep sort settings
      sortOrder: prev.sortOrder,
      dateRange: undefined,
      durationRange: undefined,
      categories: undefined,
      tags: undefined,
    }))
  }, [])
  
  /**
   * Clear only the search filter
   */
  const clearSearch = useCallback(() => {
    setFilters(prev => ({ ...prev, search: '' }))
  }, [])
  
  /**
   * Check if any filters are active (excluding sort)
   */
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      filters.dateRange ||
      filters.durationRange ||
      (filters.categories && filters.categories.length > 0) ||
      (filters.tags && filters.tags.length > 0)
    )
  }, [filters])
  
  /**
   * Get a human-readable description of active filters
   */
  const getFilterDescription = useCallback(() => {
    const descriptions: string[] = []
    
    if (filters.search) {
      descriptions.push(`searching for "${filters.search}"`)
    }
    
    if (filters.categories && filters.categories.length > 0) {
      descriptions.push(`categories: ${filters.categories.join(', ')}`)
    }
    
    if (filters.tags && filters.tags.length > 0) {
      descriptions.push(`tags: ${filters.tags.join(', ')}`)
    }
    
    if (filters.dateRange) {
      descriptions.push(`date range: ${filters.dateRange}`)
    }
    
    if (filters.durationRange) {
      descriptions.push(`duration: ${filters.durationRange}`)
    }
    
    if (descriptions.length === 0) {
      return 'No filters applied'
    }
    
    return `Filtered by ${descriptions.join(', ')}`
  }, [filters])
  
  /**
   * Get filter statistics
   */
  const getFilterStats = useCallback(() => {
    return {
      totalFilters: [
        filters.search,
        filters.dateRange,
        filters.durationRange,
        filters.categories,
        filters.tags,
      ].filter(Boolean).length,
      hasSearch: !!filters.search,
      hasCategories: !!(filters.categories && filters.categories.length > 0),
      hasTags: !!(filters.tags && filters.tags.length > 0),
      hasDateRange: !!filters.dateRange,
      hasDurationRange: !!filters.durationRange,
    }
  }, [filters])
  
  // State object
  const state: LibraryFilterState = {
    filters,
    viewMode,
    debouncedFilters,
  }
  
  // Handlers object
  const handlers: LibraryFilterHandlers = {
    setFilters,
    setViewMode,
    clearFilters,
    clearSearch,
  }
  
  // Data object
  const data: LibraryFilterData = {
    availableTags: availableTags || [],
    availableCategories: availableCategories || [],
    isLoadingTags,
    isLoadingCategories,
  }
  
  // Computed values
  const computed = {
    hasActiveFilters,
    getFilterDescription,
    getFilterStats,
  }
  
  return {
    state,
    handlers,
    data,
    computed,
  }
}