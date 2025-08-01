'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Plus, Loader2, Trash2, AlertCircle } from 'lucide-react'
import { URLInput } from '@/components/molecules/URLInput'
import { SummaryCard } from '@/components/molecules/SummaryCard'
import { LibraryControls, type LibraryFilters } from '@/components/molecules/LibraryControls'
import { QuickActionsBar } from '@/components/molecules/QuickActionsBar'
import { ShareModal } from '@/components/molecules/ShareModal'
import { Skeleton } from '@/components/atoms/Skeleton'
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
  })

  // Debounced filters for API calls (convert 'all' to undefined)
  const debouncedFilters = useMemo(() => ({
    ...filters,
    dateRange: filters.dateRange,
    durationRange: filters.durationRange,
  }), [filters])
  
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

  const handleCreateSummary = async (url: string) => {
    setIsCreatingSummary(true)
    
    // Generate a temporary task ID to start progress tracking immediately
    const tempTaskId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCurrentTaskId(tempTaskId)
    
    try {
      const result = await createSummary.mutateAsync({ url })
      
      // If the backend returns a real task_id, switch to that for more accurate tracking
      if (result.task_id && result.task_id !== tempTaskId) {
        setCurrentTaskId(result.task_id)
      }
      
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Library</h1>
        <p className="mt-2 text-gray-600">All your video summaries in one place</p>
      </div>

      {/* Usage Warning */}
      {usage?.isLimitReached && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="font-medium text-amber-800">Monthly limit reached</h3>
              <p className="text-sm text-amber-700">
                You&apos;ve created {usage.currentMonthUsage} of {usage.monthlyLimit} summaries this month.{' '}
                <button 
                  onClick={() => router.push('/billing')}
                  className="underline hover:no-underline"
                >
                  Upgrade to Pro
                </button>{' '}
                for unlimited summaries.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {usage && !usage.isLimitReached && usage.monthlyLimit > 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Monthly Usage</p>
              <p className="text-sm text-blue-700">
                {usage.currentMonthUsage} of {usage.monthlyLimit} summaries used
              </p>
            </div>
            <div className="text-right">
              <div className="h-2 w-32 rounded-full bg-blue-200">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{
                    width: `${Math.min((usage.currentMonthUsage / usage.monthlyLimit) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* URL Input */}
      <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
        <URLInput 
          onSubmit={handleCreateSummary}
          onSuccess={() => {
            console.log('URL input cleared after successful submission')
          }}
          isLoading={isCreatingSummary || createSummary.isPending}
          disabled={usage?.isLimitReached}
        />
        {usage?.isLimitReached && (
          <p className="mt-2 text-sm text-amber-700">
            You&apos;ve reached your monthly limit. Upgrade your plan to create more summaries.
          </p>
        )}

        {/* Progress indicator */}
        {createSummary.isPending && (
          <div className="mt-6">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center space-x-2 text-primary-700 mb-2">
                  <div className="h-2 w-2 bg-primary-600 rounded-full animate-pulse"></div>
                  <div className="h-2 w-2 bg-primary-600 rounded-full animate-pulse animation-delay-200"></div>
                  <div className="h-2 w-2 bg-primary-600 rounded-full animate-pulse animation-delay-400"></div>
                </div>
                <h3 className="font-semibold text-gray-900">Processing your video</h3>
                <p className="text-sm text-gray-600 mt-1">{processingStage}</p>
              </div>
              
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  {progress === 100 ? 'Complete! 🎉' : 'Estimated time: 15-30 seconds'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Library Controls */}
      <div className="mb-6">
        <LibraryControls
          filters={filters}
          onFiltersChange={setFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          totalCount={totalCount}
        />
      </div>

      {/* Quick Actions Bar */}
      {allSummaries.length > 0 && (
        <div className="mb-6">
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
            ? "sm:grid-cols-1 lg:grid-cols-2" 
            : "grid-cols-1"
        )}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-6">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
              <div className="mt-4 flex gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="mt-3 h-12 w-full" />
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
              ? "sm:grid-cols-1 lg:grid-cols-2" 
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
            <div className="mt-8 text-center">
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
    </div>
  )
}