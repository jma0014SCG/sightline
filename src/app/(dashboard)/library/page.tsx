'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Plus, Loader2, Trash2, AlertCircle, Search, Star, Clock } from 'lucide-react'
import { URLInput } from '@/components/molecules/URLInput'
import { SummaryCard } from '@/components/molecules/SummaryCard'
import { LibraryControls, type LibraryFilters } from '@/components/molecules/LibraryControls'
import { QuickActionsBar } from '@/components/molecules/QuickActionsBar'
import { ShareModal } from '@/components/molecules/ShareModal'
import { Skeleton } from '@/components/atoms/Skeleton'
import { FloatingActionButton } from '@/components/atoms/FloatingActionButton'
import { api } from '@/components/providers/TRPCProvider'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { useProgressTracking } from '@/lib/hooks/useProgressTracking'

export default function LibraryPage() {
  const router = useRouter()
  const [isCreatingSummary, setIsCreatingSummary] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showFab, setShowFab] = useState(true)
  const createSummaryRef = useRef<HTMLDivElement>(null)
  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean
    summaryId: string
    summaryTitle: string
  }>({
    isOpen: false,
    summaryId: '',
    summaryTitle: '',
  })
  
  // Progress state for summary creation
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  
  // Real-time progress tracking
  const { progress, stage: processingStage, status: progressStatus } = useProgressTracking({
    taskId: currentTaskId,
    onComplete: () => {
      console.log('Progress tracking completed')
      setCurrentTaskId(null)
    },
    onError: (error) => {
      console.error('Progress tracking error:', error)
      setCurrentTaskId(null)
    }
  })
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showSelection, setShowSelection] = useState(false)
  
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
  
  // Fetch summaries with filters
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = api.library.getAll.useInfiniteQuery(
    {
      limit: 20,
      ...debouncedFilters,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )

  // Create summary mutation
  const createSummary = api.summary.create.useMutation({
    onSuccess: (summary) => {
      console.log('✅ Summary created successfully:', summary)
      
      // Invalidate caches to show new summary and updated usage stats
      utils.library.getAll.invalidate()
      utils.billing.getUsageStats.invalidate()
      
      // Stop progress tracking after a brief moment to show completion
      setTimeout(() => {
        setCurrentTaskId(null)
      }, 1500)
    },
    onError: (error) => {
      console.error('❌ Summarization failed:', error)
      setCurrentTaskId(null) // Stop progress tracking
      // The error will be handled by the existing error handling
    }
  })

  // Get the utils to invalidate queries
  const utils = api.useUtils()
  
  // Get usage stats
  const { data: usage } = api.billing.getUsageStats.useQuery()

  // Get tags and categories for smart filtering
  const { data: availableTags } = api.library.getTags.useQuery()
  const { data: availableCategories } = api.library.getCategories.useQuery()

  // Delete summary mutation
  const deleteSummary = api.summary.delete.useMutation({
    onSuccess: () => {
      // Refresh the library list and usage stats
      utils.library.getAll.invalidate()
      utils.billing.getUsageStats.invalidate()
    },
  })


  // Flatten data for display
  const allSummaries = useMemo(() => {
    return data?.pages.flatMap(page => page.items) || []
  }, [data])

  const totalCount = useMemo(() => {
    return data?.pages[0]?.items.length !== undefined 
      ? data.pages.reduce((acc, page) => acc + page.items.length, 0)
      : undefined
  }, [data])

  const handleCreateSummary = async (url: string, fingerprint?: string) => {
    setIsCreatingSummary(true)
    
    // Generate a temporary task ID to start progress tracking immediately
    const tempTaskId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCurrentTaskId(tempTaskId)
    
    try {
      await createSummary.mutateAsync({ url })
      
      // Keep using the temporary task ID for progress tracking
      // Note: fingerprint parameter is not needed for authenticated users in library
      
      // Cache invalidation is handled by the mutation's onSuccess callback
    } catch (error) {
      console.error('Failed to create summary:', error)
      setCurrentTaskId(null) // Stop progress tracking on error
    } finally {
      setIsCreatingSummary(false)
    }
  }

  const handleDelete = useCallback((summaryId: string) => {
    setShowDeleteConfirm(summaryId)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!showDeleteConfirm) return
    
    try {
      await deleteSummary.mutateAsync({ id: showDeleteConfirm })
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete summary:', error)
    }
  }, [showDeleteConfirm, deleteSummary])

  const handleShare = useCallback((summaryId: string) => {
    const summary = allSummaries.find(s => s.id === summaryId)
    if (summary) {
      setShareModalState({
        isOpen: true,
        summaryId,
        summaryTitle: summary.videoTitle,
      })
    }
  }, [allSummaries])

  const handleCloseShareModal = useCallback(() => {
    setShareModalState({
      isOpen: false,
      summaryId: '',
      summaryTitle: '',
    })
  }, [])

  // Selection handlers
  const handleSelectItem = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => 
      selected 
        ? [...prev, id]
        : prev.filter(selectedId => selectedId !== id)
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedIds(allSummaries.map(s => s.id))
    setShowSelection(true)
  }, [allSummaries])

  const handleDeselectAll = useCallback(() => {
    setSelectedIds([])
    setShowSelection(false)
  }, [])

  const handleBulkDelete = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return
    
    // Show confirmation dialog
    if (!confirm(`Are you sure you want to delete ${ids.length} summaries? This action cannot be undone.`)) {
      return
    }
    
    for (const id of ids) {
      try {
        await deleteSummary.mutateAsync({ id })
      } catch (error) {
        logger.error(`Failed to delete summary ${id}:`, error)
      }
    }
    setSelectedIds([])
    setShowSelection(false)
  }, [deleteSummary])

  const handleBulkShare = useCallback((ids: string[]) => {
    if (!ids || ids.length === 0) return
    
    // For now, just share the first selected summary
    if (ids.length > 1) {
      alert('Currently you can only share one summary at a time. Sharing the first selected summary.')
    }
    
    if (ids[0]) {
      handleShare(ids[0])
    }
  }, [handleShare])

  const handleBulkExport = useCallback((ids: string[]) => {
    if (!ids || ids.length === 0) return
    
    try {
      // Export selected summaries as JSON
      const selectedSummaries = allSummaries.filter(s => ids.includes(s.id))
      if (selectedSummaries.length === 0) {
        logger.error('No summaries found to export')
        return
      }
      
      const dataStr = JSON.stringify(selectedSummaries, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `summaries-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      logger.error('Failed to export summaries:', error)
    }
  }, [allSummaries])

  // Auto-enable selection mode when items are selected
  const effectiveShowSelection = showSelection || selectedIds.length > 0

  // Handle FAB click - scroll to create summary section
  const handleFabClick = useCallback(() => {
    createSummaryRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    })
  }, [])

  // Hide FAB when near create summary section
  useEffect(() => {
    const handleScroll = () => {
      if (!createSummaryRef.current) return
      
      const rect = createSummaryRef.current.getBoundingClientRect()
      const isNearCreateSection = rect.top <= window.innerHeight && rect.bottom >= 0
      
      setShowFab(!isNearCreateSection)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial position
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div>
      {/* Enhanced Premium Header */}
      <div className="relative bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-gray-100 rounded-2xl mb-8 overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03]"></div>
        
        <div className="relative p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
                Your Knowledge Library
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
                Transform YouTube videos into actionable insights. Build your personal learning repository with AI-powered summaries.
              </p>
            </div>
            
            {/* Learning Metrics Dashboard */}
            <div className="flex items-center gap-8">
              {/* Total Summaries */}
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {totalCount || 0}
                </div>
                <div className="text-sm text-gray-500 font-medium">Summaries</div>
              </div>
              
              {/* Estimated Time Saved */}
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {Math.round((totalCount || 0) * 0.8)}h
                </div>
                <div className="text-sm text-gray-500 font-medium">Time Saved</div>
              </div>
              
              {/* Learning Streak (placeholder) */}
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  7
                </div>
                <div className="text-sm text-gray-500 font-medium">Day Streak</div>
              </div>
            </div>
          </div>
          
          {/* Usage Progress Bar (Enhanced) */}
          {usage && usage.monthlyLimit > 0 && (
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Monthly Usage</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {usage.currentMonthUsage} of {usage.monthlyLimit} summaries
                  </span>
                </div>
                
                {usage.isLimitReached && (
                  <button 
                    onClick={() => router.push('/billing')}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-200"
                  >
                    <span>Upgrade Plan</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-500 ease-out",
                    usage.isLimitReached 
                      ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                      : "bg-gradient-to-r from-blue-500 to-indigo-500"
                  )}
                  style={{
                    width: `${Math.min((usage.currentMonthUsage / usage.monthlyLimit) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Create New Summary Section */}
      <div ref={createSummaryRef} className="mb-8 relative overflow-hidden">
        {/* Background with subtle animation */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl"></div>
        
        <div className="relative p-6 border border-blue-200/60 rounded-2xl backdrop-blur-sm">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <Plus className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Create New Summary
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Transform any YouTube video into structured insights in under 60 seconds
              </p>
            </div>
          </div>
        
          <URLInput 
            onSubmit={handleCreateSummary}
            onSuccess={() => {
              console.log('URL input cleared after successful submission')
            }}
            isLoading={isCreatingSummary || createSummary.isPending}
            disabled={usage?.isLimitReached}
            placeholder="Paste any YouTube URL to get started..."
            className="create-summary-enhanced"
          />
          
          {/* Quick Access Buttons */}
          {!usage?.isLimitReached && (
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 font-medium">Quick start:</span>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-white hover:border-blue-200 hover:text-blue-700 transition-all duration-200">
                  <Clock className="h-4 w-4" />
                  Recent Channels
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-white hover:border-purple-200 hover:text-purple-700 transition-all duration-200">
                  <Star className="h-4 w-4" />
                  Trending
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Usage warning message */}
          {usage?.isLimitReached && (
            <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-amber-100 rounded-lg flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-amber-800 mb-1">Monthly Limit Reached</h3>
                  <p className="text-sm text-amber-700">
                    You&apos;ve reached your monthly summary limit. Upgrade to Pro for unlimited summaries and advanced features.
                  </p>
                </div>
                <button 
                  onClick={() => router.push('/billing')}
                  className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors duration-200"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          )}

        {/* Progress indicator */}
        {createSummary.isPending && (
          <div className="mt-4 p-4 bg-white/70 border border-blue-300 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex space-x-1">
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse animation-delay-200"></div>
                <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse animation-delay-400"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                  <span className="font-medium">{processingStage}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Enhanced Search and Filter Section */}
      <div className="mb-8">
        <div className="bg-white/70 backdrop-blur-lg border border-gray-200/60 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 rounded-xl">
                <Search className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Search & Filter</h3>
                <p className="text-sm text-gray-500">Find exactly what you&apos;re looking for</p>
              </div>
            </div>
            
            {/* Quick stats */}
            {totalCount && (
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
                <div className="text-xs text-gray-500">Total summaries</div>
              </div>
            )}
          </div>
          
          <LibraryControls
            filters={filters}
            onFiltersChange={setFilters}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            totalCount={totalCount}
            availableTags={availableTags || []}
            availableCategories={availableCategories || []}
          />
        </div>
      </div>

      {/* Learning Analytics Dashboard */}
      {allSummaries.length > 0 && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Learning Streak Card */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200/60 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-700">7 days</div>
                  <div className="text-sm font-medium text-green-600">Learning streak</div>
                </div>
              </div>
              <div className="text-xs text-green-600/80">
                Keep it up! You&apos;re building great habits.
              </div>
            </div>
          </div>
          
          {/* Popular Category Card */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-100 border border-purple-200/60 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 11l4 4 4-4m-4-8v8" />
                  </svg>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">Tech</div>
                  <div className="text-sm font-medium text-purple-600">Most watched</div>
                </div>
              </div>
              <div className="text-xs text-purple-600/80">
                {Math.floor((totalCount || 0) * 0.4)} technology summaries
              </div>
            </div>
          </div>
          
          {/* Time Efficiency Card */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-100 border border-orange-200/60 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full -mr-10 -mt-10"></div>
            <div className="relative">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-700">85%</div>
                  <div className="text-sm font-medium text-orange-600">Time saved</div>
                </div>
              </div>
              <div className="text-xs text-orange-600/80">
                Equivalent to {Math.round((totalCount || 0) * 1.2)} hours of content
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      {allSummaries.length > 0 && (
        <div className="mb-4">
          <QuickActionsBar
            selectedIds={selectedIds}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onBulkDelete={handleBulkDelete}
            onBulkShare={handleBulkShare}
            onBulkExport={handleBulkExport}
            totalCount={allSummaries.length}
          />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className={cn(
          "grid gap-4",
          viewMode === 'grid' 
            ? "sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3" 
            : "grid-cols-1"
        )}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <div className="mt-3 flex gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="mt-2 h-10 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Summaries display */}
      {!isLoading && allSummaries.length > 0 && (
        <>
          <div className={cn(
            "grid gap-6 transition-all duration-300",
            viewMode === 'grid' 
              ? "sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3" 
              : "grid-cols-1 gap-4"
          )}>
            {allSummaries.map((summary, index) => (
              <div 
                key={summary.id}
                className="transform transition-all duration-500 ease-out"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fade-in-up 0.6s ease-out forwards'
                }}
              >
                <SummaryCard 
                  summary={summary}
                  onDelete={handleDelete}
                  onShare={handleShare}
                  viewMode={viewMode}
                  isSelected={selectedIds.includes(summary.id)}
                  onSelect={handleSelectItem}
                  showSelection={effectiveShowSelection}
                  className="hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1"
                />
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasNextPage && (
            <div className="mt-6 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Enhanced Empty State */}
      {!isLoading && allSummaries.length === 0 && (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            {filters.search ? (
              // No search results state
              <div className="bg-white rounded-2xl border border-gray-200 p-8">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  <Search className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No summaries found
                </h3>
                <p className="text-gray-600 mb-6">
                  No summaries match &quot;{filters.search}&quot;. Try adjusting your search terms or filters.
                </p>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              // First time user onboarding
              <div>
                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mb-8 mx-auto relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
                  <div className="relative">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Your Learning Journey Starts Here
                </h3>
                
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  Transform any YouTube video into structured insights. Start building your knowledge library with AI-powered summaries.
                </p>
                
                {/* Quick start suggestions */}
                <div className="space-y-4 mb-8">
                  <div className="text-sm text-gray-500 mb-3 font-medium">Try these popular channels:</div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {[
                      { name: 'TED Talks', color: 'from-red-100 to-red-200 text-red-700 border-red-200' },
                      { name: 'Huberman Lab', color: 'from-blue-100 to-blue-200 text-blue-700 border-blue-200' },
                      { name: 'Y Combinator', color: 'from-orange-100 to-orange-200 text-orange-700 border-orange-200' },
                      { name: 'MIT OpenCourseWare', color: 'from-green-100 to-green-200 text-green-700 border-green-200' }
                    ].map(channel => (
                      <button 
                        key={channel.name} 
                        className={`px-4 py-2 bg-gradient-to-r ${channel.color} border rounded-lg text-sm font-medium hover:shadow-md transition-all duration-200`}
                        onClick={() => createSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      >
                        {channel.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button 
                  onClick={() => createSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Summary
                </button>
                
                {/* Features preview */}
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                  <div className="text-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="font-medium text-gray-900">60s Processing</div>
                    <div className="text-gray-500">Lightning fast AI summaries</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="font-medium text-gray-900">Key Insights</div>
                    <div className="text-gray-500">Structured actionable takeaways</div>
                  </div>
                  <div className="text-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                    </div>
                    <div className="font-medium text-gray-900">Smart Tags</div>
                    <div className="text-gray-500">AI-powered categorization</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Summary</h3>
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this summary? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteSummary.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteSummary.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModalState.isOpen}
        onClose={handleCloseShareModal}
        summaryId={shareModalState.summaryId}
        summaryTitle={shareModalState.summaryTitle}
      />

      {/* Floating Action Button */}
      {showFab && (
        <FloatingActionButton 
          onClick={handleFabClick}
          disabled={usage?.isLimitReached}
          tooltip={usage?.isLimitReached ? "Upgrade to create more summaries" : "Create new summary"}
        />
      )}
    </div>
  )
}