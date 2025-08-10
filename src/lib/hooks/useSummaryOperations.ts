/**
 * Custom hook for summary CRUD operations
 * 
 * @module useSummaryOperations
 * @category Hooks
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/components/providers/TRPCProvider'
import { logger } from '@/lib/logger'
import { useProgressTracking } from './useProgressTracking'

export interface UseSummaryOperationsOptions {
  onSuccess?: () => void
  onError?: (error: any) => void
}

export interface SummaryOperationsState {
  isCreating: boolean
  isDeleting: boolean
  isUpdating: boolean
  currentTaskId: string | null
}

export interface SummaryOperationsActions {
  createSummary: (url: string, fingerprint?: string) => Promise<void>
  deleteSummary: (summaryId: string) => Promise<void>
  updateSummary: (summaryId: string, data: any) => Promise<void>
  claimAnonymousSummaries: (fingerprint: string) => Promise<number>
}

export interface SummaryOperationsProgress {
  progress: number
  stage: string
  status: 'processing' | 'completed' | 'error'
}

/**
 * Hook for managing summary operations with progress tracking
 */
export function useSummaryOperations(options: UseSummaryOperationsOptions = {}) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  
  // Get the utils to invalidate queries
  const utils = api.useUtils()
  
  // Real-time progress tracking
  const { progress, stage: processingStage, status: progressStatus } = useProgressTracking({
    taskId: currentTaskId,
    onComplete: () => {
      logger.debug('Progress tracking completed')
      setCurrentTaskId(null)
    },
    onError: (error) => {
      logger.error('Progress tracking error:', error)
      setCurrentTaskId(null)
    }
  })
  
  // Create summary mutation
  const createSummaryMutation = api.summary.create.useMutation({
    onSuccess: (summary) => {
      logger.info('✅ Summary created successfully:', summary)
      
      // Switch to the real task ID from backend if available and ensure completion is shown
      if (summary.taskId) {
        logger.debug('Switching to real task ID:', summary.taskId)
        setCurrentTaskId(summary.taskId)
        
        // Give the progress tracking time to pick up the completed status from backend
        setTimeout(() => {
          setCurrentTaskId(null)
        }, 2500) // Increased time to ensure completion is visible
      } else {
        // No task ID, stop tracking immediately
        setCurrentTaskId(null)
      }
      
      // Invalidate caches to show new summary and updated usage stats
      utils.library.getAll.invalidate()
      utils.billing.getUsageStats.invalidate()
      
      options.onSuccess?.()
    },
    onError: (error) => {
      logger.error('❌ Summarization failed:', error)
      setCurrentTaskId(null) // Stop progress tracking
      options.onError?.(error)
    }
  })
  
  // Delete summary mutation
  const deleteSummaryMutation = api.summary.delete.useMutation({
    onSuccess: () => {
      // Refresh the library list and usage stats
      utils.library.getAll.invalidate()
      utils.billing.getUsageStats.invalidate()
      options.onSuccess?.()
    },
    onError: (error) => {
      logger.error('Failed to delete summary:', error)
      options.onError?.(error)
    }
  })
  
  // Update summary mutation
  const updateSummaryMutation = api.summary.update.useMutation({
    onSuccess: () => {
      // Refresh the library list
      utils.library.getAll.invalidate()
      options.onSuccess?.()
    },
    onError: (error) => {
      logger.error('Failed to update summary:', error)
      options.onError?.(error)
    }
  })
  
  // Claim anonymous summaries mutation
  const claimAnonymousMutation = api.summary.claimAnonymous.useMutation({
    onSuccess: () => {
      // Refresh the library list
      utils.library.getAll.invalidate()
      utils.billing.getUsageStats.invalidate()
      options.onSuccess?.()
    },
    onError: (error) => {
      logger.error('Failed to claim anonymous summaries:', error)
      options.onError?.(error)
    }
  })
  
  /**
   * Create a new summary
   */
  const createSummary = useCallback(async (url: string, fingerprint?: string) => {
    setIsCreating(true)
    
    // Generate a temporary task ID to start progress tracking immediately
    const tempTaskId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setCurrentTaskId(tempTaskId)
    
    try {
      const result = await createSummaryMutation.mutateAsync({ url })
      
      // The real task ID switch is handled in the mutation's onSuccess callback
      // If no task ID is returned, we'll keep the temp ID for progress simulation
      if (!result?.taskId) {
        logger.warn('No task ID returned from backend, using temporary task ID for progress')
      }
      
      // Cache invalidation is handled by the mutation's onSuccess callback
    } catch (error) {
      logger.error('Failed to create summary:', error)
      setCurrentTaskId(null) // Stop progress tracking on error
      throw error // Re-throw to let the calling component handle the error
    } finally {
      setIsCreating(false)
    }
  }, [createSummaryMutation])
  
  /**
   * Delete a summary
   */
  const deleteSummary = useCallback(async (summaryId: string) => {
    setIsDeleting(true)
    
    try {
      await deleteSummaryMutation.mutateAsync({ id: summaryId })
    } catch (error) {
      logger.error('Failed to delete summary:', error)
      throw error // Re-throw so caller can handle
    } finally {
      setIsDeleting(false)
    }
  }, [deleteSummaryMutation])
  
  /**
   * Update a summary
   */
  const updateSummary = useCallback(async (summaryId: string, data: any) => {
    setIsUpdating(true)
    
    try {
      await updateSummaryMutation.mutateAsync({ id: summaryId, ...data })
    } catch (error) {
      logger.error('Failed to update summary:', error)
      throw error // Re-throw so caller can handle
    } finally {
      setIsUpdating(false)
    }
  }, [updateSummaryMutation])
  
  /**
   * Claim anonymous summaries
   */
  const claimAnonymousSummaries = useCallback(async (fingerprint: string) => {
    try {
      const result = await claimAnonymousMutation.mutateAsync({ browserFingerprint: fingerprint })
      return result.claimed || 0
    } catch (error) {
      logger.error('Failed to claim anonymous summaries:', error)
      throw error // Re-throw so caller can handle
    }
  }, [claimAnonymousMutation])
  
  // State object
  const state: SummaryOperationsState = {
    isCreating,
    isDeleting,
    isUpdating,
    currentTaskId,
  }
  
  // Actions object
  const actions: SummaryOperationsActions = {
    createSummary,
    deleteSummary,
    updateSummary,
    claimAnonymousSummaries,
  }
  
  // Progress object
  const progressData: SummaryOperationsProgress = {
    progress,
    stage: processingStage,
    status: progressStatus,
  }
  
  return {
    state,
    actions,
    progress: progressData,
    // Direct access to mutation states for more granular control
    mutations: {
      create: createSummaryMutation,
      delete: deleteSummaryMutation,
      update: updateSummaryMutation,
      claimAnonymous: claimAnonymousMutation,
    },
  }
}