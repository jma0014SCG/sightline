'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Plus, Search } from 'lucide-react'
import { SummaryCard } from '@/components/molecules/SummaryCard'
import { LibraryControls } from '@/components/molecules/LibraryControls'
import { QuickActionsBar } from '@/components/molecules/QuickActionsBar'
import { ShareModal } from '@/components/molecules/ShareModal'
import { ConfirmationModal } from '@/components/molecules/ConfirmationModal'
import { Skeleton } from '@/components/atoms/Skeleton'
import { FloatingActionButton } from '@/components/atoms/FloatingActionButton'
import { LibraryHeader } from '@/components/organisms/LibraryHeader'
import { CreateSummarySection } from '@/components/organisms/CreateSummarySection'
import { EmptyLibraryState } from '@/components/organisms/EmptyLibraryState'
import { api } from '@/components/providers/TRPCProvider'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'
import { useSummaryOperations } from '@/lib/hooks/useSummaryOperations'
import { useBulkActions } from '@/lib/hooks/useBulkActions'
import { useLibraryFilters } from '@/lib/hooks/useLibraryFilters'
import { useSharing } from '@/lib/hooks/useSharing'

export default function LibraryPage() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showFab, setShowFab] = useState(true)
  const createSummaryRef = useRef<HTMLDivElement>(null)
  
  // Custom hooks
  const summaryOps = useSummaryOperations({
    onSuccess: () => {
      logger.info('Summary operation completed successfully')
    },
    onError: (error) => {
      logger.error('Summary operation failed:', error)
    }
  })
  
  const bulkActions = useBulkActions({
    onBulkDelete: async (ids: string[]) => {
      for (const id of ids) {
        await summaryOps.actions.deleteSummary(id)
      }
    },
    onBulkShare: (ids: string[]) => {
      const summary = allSummaries.find(s => s.id === ids[0])
      if (summary) {
        sharing.handlers.handleShare(ids[0], summary.videoTitle)
      }
    },
  })
  
  const filters = useLibraryFilters()
  const sharing = useSharing()
  
  // Get usage stats
  const { data: usage } = api.billing.getUsageStats.useQuery()
  
  // Fetch summaries with filters
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = api.library.getAll.useInfiniteQuery(
    {
      limit: 20,
      ...filters.state.debouncedFilters,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )
  
  // Flatten data for display
  const allSummaries = useMemo(() => {
    return data?.pages.flatMap(page => page.items) || []
  }, [data])

  const totalCount = useMemo(() => {
    return data?.pages[0]?.items.length !== undefined 
      ? data.pages.reduce((acc, page) => acc + page.items.length, 0)
      : undefined
  }, [data])
  
  // Handle delete confirmation
  const handleDelete = useCallback((summaryId: string) => {
    setShowDeleteConfirm(summaryId)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!showDeleteConfirm) return
    
    try {
      await summaryOps.actions.deleteSummary(showDeleteConfirm)
      setShowDeleteConfirm(null)
    } catch (error) {
      logger.error('Failed to delete summary:', error)
    }
  }, [showDeleteConfirm, summaryOps.actions])

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
      <LibraryHeader 
        totalCount={totalCount}
        usage={usage}
      />

      {/* Enhanced Create New Summary Section */}
      <CreateSummarySection
        ref={createSummaryRef}
        onCreateSummary={summaryOps.actions.createSummary}
        onSuccess={() => {
          logger.info('URL input cleared after successful submission')
        }}
        isLoading={summaryOps.state.isCreating || summaryOps.mutations.create.isPending}
        disabled={usage?.isLimitReached}
        progress={summaryOps.progress}
        usage={usage}
      />

      {/* Enhanced Search and Filter Section */}
      <div className="mb-8">
        <div className="bg-white/70 backdrop-blur-lg border border-gray-200/60 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 rounded-lg">
                <Search className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Search & Filter</h3>
                <p className="text-xs text-gray-500">Find exactly what you&apos;re looking for</p>
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
            filters={filters.state.filters}
            onFiltersChange={filters.handlers.setFilters}
            viewMode={filters.state.viewMode}
            onViewModeChange={filters.handlers.setViewMode}
            totalCount={totalCount}
            availableTags={filters.data.availableTags}
            availableCategories={filters.data.availableCategories}
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      {allSummaries.length > 0 && (
        <div className="mb-4">
          <QuickActionsBar
            selectedIds={bulkActions.state.selectedIds}
            onSelectAll={() => bulkActions.handlers.handleSelectAll(allSummaries.map(s => s.id))}
            onDeselectAll={bulkActions.handlers.handleDeselectAll}
            onBulkDelete={bulkActions.handlers.handleBulkDelete}
            onBulkShare={bulkActions.handlers.handleBulkShare}
            onBulkExport={() => bulkActions.handlers.handleBulkExport(allSummaries)}
            totalCount={allSummaries.length}
          />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className={cn(
          "grid gap-4",
          filters.state.viewMode === 'grid' 
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
            filters.state.viewMode === 'grid' 
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
                  onShare={sharing.handlers.handleShare}
                  viewMode={filters.state.viewMode}
                  isSelected={bulkActions.state.selectedIds.includes(summary.id)}
                  onSelect={bulkActions.handlers.handleSelectItem}
                  showSelection={bulkActions.state.showSelection}
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
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-700 border-t-transparent" />
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

      {/* Empty State */}
      {!isLoading && allSummaries.length === 0 && (
        <EmptyLibraryState
          isSearchResults={!!filters.state.filters.search}
          searchQuery={filters.state.filters.search}
          onClearSearch={filters.handlers.clearSearch}
          onCreateSummary={handleFabClick}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!showDeleteConfirm}
        title="Delete Summary"
        description="Are you sure you want to delete this summary? This action cannot be undone."
        confirmText={summaryOps.mutations.delete.isPending ? 'Deleting...' : 'Delete'}
        isLoading={summaryOps.mutations.delete.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(null)}
        variant="danger"
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={sharing.state.isOpen}
        onClose={sharing.handlers.handleClose}
        summaryId={sharing.state.summaryId}
        summaryTitle={sharing.state.summaryTitle}
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