/**
 * Custom hook for managing summary sharing functionality
 * 
 * @module useSharing
 * @category Hooks
 */

import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

export interface SharingState {
  isOpen: boolean
  summaryId: string
  summaryTitle: string
}

export interface SharingHandlers {
  handleShare: (summaryId: string, summaryTitle: string) => void
  handleClose: () => void
  openShareModal: (summaryId: string, summaryTitle: string) => void
  closeShareModal: () => void
}

/**
 * Hook for managing summary sharing modal state and actions
 */
export function useSharing() {
  const [shareModalState, setShareModalState] = useState<SharingState>({
    isOpen: false,
    summaryId: '',
    summaryTitle: '',
  })
  
  /**
   * Open the share modal for a specific summary
   */
  const handleShare = useCallback((summaryId: string, summaryTitle: string) => {
    logger.debug('Opening share modal', { summaryId, summaryTitle })
    
    setShareModalState({
      isOpen: true,
      summaryId,
      summaryTitle,
    })
  }, [])
  
  /**
   * Close the share modal and reset state
   */
  const handleClose = useCallback(() => {
    logger.debug('Closing share modal')
    
    setShareModalState({
      isOpen: false,
      summaryId: '',
      summaryTitle: '',
    })
  }, [])
  
  /**
   * Alias for handleShare - more explicit naming
   */
  const openShareModal = useCallback((summaryId: string, summaryTitle: string) => {
    handleShare(summaryId, summaryTitle)
  }, [handleShare])
  
  /**
   * Alias for handleClose - more explicit naming
   */
  const closeShareModal = useCallback(() => {
    handleClose()
  }, [handleClose])
  
  /**
   * Share multiple summaries (for bulk operations)
   */
  const handleBulkShare = useCallback((summaryIds: string[], summaries: any[]) => {
    if (!summaryIds || summaryIds.length === 0) return
    
    // For now, just share the first selected summary
    if (summaryIds.length > 1) {
      logger.warn('Bulk sharing not fully supported, sharing first summary only')
      // Could show a toast notification here
    }
    
    const firstSummaryId = summaryIds[0]
    const summary = summaries.find(s => s.id === firstSummaryId)
    
    if (summary) {
      handleShare(firstSummaryId, summary.videoTitle || 'Untitled Summary')
    } else {
      logger.error('Could not find summary to share', { summaryId: firstSummaryId })
    }
  }, [handleShare])
  
  /**
   * Copy share link to clipboard (utility function)
   */
  const copyShareLink = useCallback(async (shareUrl: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      logger.info('Share link copied to clipboard')
      return true
    } catch (error) {
      logger.error('Failed to copy share link:', error)
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        logger.info('Share link copied using fallback method')
        return true
      } catch (fallbackError) {
        logger.error('Fallback copy method also failed:', fallbackError)
        return false
      }
    }
  }, [])
  
  /**
   * Generate share URL for a summary
   */
  const generateShareUrl = useCallback((summaryId: string, baseUrl?: string) => {
    const base = baseUrl || window.location.origin
    return `${base}/share/${summaryId}`
  }, [])
  
  /**
   * Share via Web Share API if available
   */
  const shareViaWebAPI = useCallback(async (summaryTitle: string, shareUrl: string) => {
    if (!navigator.share) {
      logger.debug('Web Share API not available')
      return false
    }
    
    try {
      await navigator.share({
        title: summaryTitle,
        text: `Check out this summary: ${summaryTitle}`,
        url: shareUrl,
      })
      logger.info('Shared via Web Share API')
      return true
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name !== 'AbortError') {
        logger.error('Web Share API error:', error)
      }
      return false
    }
  }, [])
  
  // State object
  const state: SharingState = shareModalState
  
  // Handlers object
  const handlers: SharingHandlers = {
    handleShare,
    handleClose,
    openShareModal,
    closeShareModal,
  }
  
  // Utility functions
  const utils = {
    handleBulkShare,
    copyShareLink,
    generateShareUrl,
    shareViaWebAPI,
  }
  
  // Computed values
  const computed = {
    isWebShareSupported: typeof navigator !== 'undefined' && !!navigator.share,
    hasActiveShare: shareModalState.isOpen && shareModalState.summaryId,
  }
  
  return {
    state,
    handlers,
    utils,
    computed,
  }
}