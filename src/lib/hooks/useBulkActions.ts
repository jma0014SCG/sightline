/**
 * Custom hook for bulk operations on summaries
 * 
 * @module useBulkActions
 * @category Hooks
 */

import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

export interface BulkActionsState {
  selectedIds: string[]
  showSelection: boolean
  isProcessing: boolean
}

export interface BulkActionsOptions {
  onBulkDelete?: (ids: string[]) => Promise<void>
  onBulkShare?: (ids: string[]) => void
  onBulkExport?: (ids: string[]) => void
}

export interface BulkActionsHandlers {
  handleSelectItem: (id: string, selected: boolean) => void
  handleSelectAll: (allIds: string[]) => void
  handleDeselectAll: () => void
  handleBulkDelete: (ids: string[]) => Promise<void>
  handleBulkShare: (ids: string[]) => void
  handleBulkExport: (summaries: any[]) => void
  setShowSelection: (show: boolean) => void
}

/**
 * Hook for managing bulk selection and operations
 */
export function useBulkActions(options: BulkActionsOptions = {}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showSelection, setShowSelection] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  /**
   * Handle individual item selection
   */
  const handleSelectItem = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => 
      selected 
        ? [...prev, id]
        : prev.filter(selectedId => selectedId !== id)
    )
  }, [])
  
  /**
   * Select all items
   */
  const handleSelectAll = useCallback((allIds: string[]) => {
    setSelectedIds(allIds)
    setShowSelection(true)
  }, [])
  
  /**
   * Deselect all items
   */
  const handleDeselectAll = useCallback(() => {
    setSelectedIds([])
    setShowSelection(false)
  }, [])
  
  /**
   * Handle bulk delete operation
   */
  const handleBulkDelete = useCallback(async (ids: string[]) => {
    if (!ids || ids.length === 0) return
    
    // Show confirmation dialog
    if (!confirm(`Are you sure you want to delete ${ids.length} summaries? This action cannot be undone.`)) {
      return
    }
    
    setIsProcessing(true)
    
    try {
      if (options.onBulkDelete) {
        await options.onBulkDelete(ids)
      } else {
        // Default implementation - delete each summary individually
        for (const id of ids) {
          try {
            // Note: This would need to be replaced with actual delete logic
            // when used in components that don't provide onBulkDelete
            logger.info(`Would delete summary ${id}`)
          } catch (error) {
            logger.error(`Failed to delete summary ${id}:`, error)
          }
        }
      }
      
      // Clear selection after successful delete
      setSelectedIds([])
      setShowSelection(false)
    } catch (error) {
      logger.error('Bulk delete failed:', error)
      throw error
    } finally {
      setIsProcessing(false)
    }
  }, [options])
  
  /**
   * Handle bulk share operation
   */
  const handleBulkShare = useCallback((ids: string[]) => {
    if (!ids || ids.length === 0) return
    
    // For now, just share the first selected summary
    if (ids.length > 1) {
      alert('Currently you can only share one summary at a time. Sharing the first selected summary.')
    }
    
    if (ids[0]) {
      if (options.onBulkShare) {
        options.onBulkShare(ids)
      } else {
        logger.info(`Would share summary ${ids[0]}`)
      }
    }
  }, [options])
  
  /**
   * Handle bulk export operation
   */
  const handleBulkExport = useCallback((summaries: any[]) => {
    const selectedSummaries = summaries.filter(s => selectedIds.includes(s.id))
    
    if (selectedSummaries.length === 0) {
      logger.error('No summaries found to export')
      return
    }
    
    try {
      if (options.onBulkExport) {
        options.onBulkExport(selectedIds)
      } else {
        // Default implementation - export as JSON
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
        
        logger.info(`Exported ${selectedSummaries.length} summaries`)
      }
    } catch (error) {
      logger.error('Failed to export summaries:', error)
      throw error
    }
  }, [selectedIds, options])
  
  // Auto-enable selection mode when items are selected
  const effectiveShowSelection = showSelection || selectedIds.length > 0
  
  // State object
  const state: BulkActionsState = {
    selectedIds,
    showSelection: effectiveShowSelection,
    isProcessing,
  }
  
  // Handlers object
  const handlers: BulkActionsHandlers = {
    handleSelectItem,
    handleSelectAll,
    handleDeselectAll,
    handleBulkDelete,
    handleBulkShare,
    handleBulkExport,
    setShowSelection,
  }
  
  // Computed values
  const computed = {
    hasSelection: selectedIds.length > 0,
    selectionCount: selectedIds.length,
    isMultipleSelected: selectedIds.length > 1,
  }
  
  return {
    state,
    handlers,
    computed,
  }
}