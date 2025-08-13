'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Plus, Loader2, Trash2, AlertCircle, Search } from 'lucide-react'
import { URLInput } from '@/components/molecules/URLInput'
import { SummaryCard } from '@/components/molecules/SummaryCard'
import { LibraryControls, type LibraryFilters } from '@/components/molecules/LibraryControls'
import { QuickActionsBar } from '@/components/molecules/QuickActionsBar'
import { ShareModal } from '@/components/molecules/ShareModal'
import { TagStatsBar } from '@/components/molecules/TagStatsBar'
import { Skeleton } from '@/components/atoms/Skeleton'
import { FloatingActionButton } from '@/components/atoms/FloatingActionButton'
import { api } from '@/components/providers/TRPCProvider'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { useProgressTracking } from '@/lib/hooks/useProgressTracking'
import { useToast } from '@/components/providers/ToastProvider'

export default function LibraryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const utils = api.useUtils()
  
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
    onComplete: async () => {
      console.log('Progress tracking completed')
      setCurrentTaskId(null)
      
      // Invalidate the library query to refresh the list
      await utils.library.getAll.invalidate()
      
      // Refresh the page to ensure all data is up to date
      router.refresh()
      
      // Show success toast
      toast.success('Summary created successfully!')
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
      
      // If we got a real task_id from backend, switch to using it for progress tracking
      if (summary.task_id && summary.task_id !== currentTaskId) {
        console.log('🔄 Switching to real task_id:', summary.task_id)
        setCurrentTaskId(summary.task_id)
      }
      
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
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Library</h1>
            {usage && usage.monthlyLimit > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{usage.currentMonthUsage}/{usage.monthlyLimit}</span>
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      usage.isLimitReached ? "bg-amber-500" : "bg-blue-600"
                    )}
                    style={{
                      width: `${Math.min((usage.currentMonthUsage / usage.monthlyLimit) * 100, 100)}%`
                    }}
                  />
                </div>
                {usage.isLimitReached && (
                  <button 
                    onClick={() => router.push('/billing')}
                    className="text-xs text-amber-600 hover:text-amber-700 underline hover:no-underline"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tag Stats Bar - Visual Tag Cloud */}
      {(availableTags && availableTags.length > 0) || (availableCategories && availableCategories.length > 0) ? (
        <div className="mb-6">
          <TagStatsBar
            tags={availableTags || []}
            categories={availableCategories || []}
            selectedTags={filters.tags}
            selectedCategories={filters.categories}
            onTagClick={(tagName) => {
              const currentTags = filters.tags || []
              const newTags = currentTags.includes(tagName)
                ? currentTags.filter(t => t !== tagName)
                : [...currentTags, tagName]
              setFilters({ 
                ...filters, 
                tags: newTags.length > 0 ? newTags : undefined 
              })
            }}
            onCategoryClick={(categoryName) => {
              const currentCategories = filters.categories || []
              const newCategories = currentCategories.includes(categoryName)
                ? currentCategories.filter(c => c !== categoryName)
                : [...currentCategories, categoryName]
              setFilters({ 
                ...filters, 
                categories: newCategories.length > 0 ? newCategories : undefined 
              })
            }}
          />
        </div>
      ) : null}

      {/* Create New Summary Section */}
      <div ref={createSummaryRef} className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create New Summary</h2>
            <p className="text-sm text-gray-600">Paste a YouTube URL to generate an AI summary</p>
          </div>
        </div>
        
        <URLInput 
          onSubmit={handleCreateSummary}
          onSuccess={() => {
            console.log('URL input cleared after successful submission')
          }}
          isLoading={isCreatingSummary || createSummary.isPending}
          disabled={usage?.isLimitReached}
          placeholder="Paste YouTube URL here..."
          className="create-summary"
        />

        {/* Usage warning message only if limit reached */}
        {usage?.isLimitReached && (
          <div className="flex items-center gap-2 p-3 mt-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-amber-700">
              Monthly limit reached. Upgrade for unlimited summaries.
            </p>
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

      {/* Search and Filter Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded">
            <Search className="h-4 w-4 text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Search & Filter Your Summaries</h3>
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
            "grid gap-4",
            viewMode === 'grid' 
              ? "sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3" 
              : "grid-cols-1"
          )}>
            {allSummaries.map((summary) => (
              <SummaryCard 
                key={summary.id} 
                summary={summary}
                onDelete={handleDelete}
                onShare={handleShare}
                viewMode={viewMode}
                isSelected={selectedIds.includes(summary.id)}
                onSelect={handleSelectItem}
                showSelection={effectiveShowSelection}
              />
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

      {/* Empty state */}
      {!isLoading && allSummaries.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12">
          <div className="text-center">
            <Plus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              {filters.search ? 'No summaries found' : 'No summaries yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search 
                ? `No summaries match "${filters.search}". Try adjusting your filters.`
                : 'Get started by pasting a YouTube URL above'
              }
            </p>
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