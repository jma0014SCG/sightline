/**
 * Progress tracking and streaming service for summary creation
 * 
 * @module ProgressService
 * @category Services
 */

import { EventEmitter } from 'events'
import { observable } from '@trpc/server/observable'
import { logger } from '@/lib/logger'
import type { ProgressEvent, ServiceResult } from './types'

/**
 * In-memory storage for progress tracking
 * In production, consider using Redis or a similar cache
 */
const progressStore = new Map<string, ProgressEvent>()

/**
 * Event emitter for progress updates
 */
const progressEmitter = new EventEmitter()

/**
 * Progress stages for summary creation
 */
export const PROGRESS_STAGES = {
  INITIALIZING: 'Initializing summary creation...',
  FETCHING_VIDEO: 'Fetching video information...',
  EXTRACTING_TRANSCRIPT: 'Extracting transcript...',
  PROCESSING_TRANSCRIPT: 'Processing transcript with AI...',
  GENERATING_SUMMARY: 'Generating summary...',
  EXTRACTING_INSIGHTS: 'Extracting key insights...',
  CLASSIFYING_CONTENT: 'Classifying content...',
  FINALIZING: 'Finalizing summary...',
  COMPLETED: 'Summary created successfully!',
  ERROR: 'An error occurred during processing',
} as const

/**
 * Progress percentages for each stage
 */
const STAGE_PROGRESS: Record<string, number> = {
  [PROGRESS_STAGES.INITIALIZING]: 5,
  [PROGRESS_STAGES.FETCHING_VIDEO]: 15,
  [PROGRESS_STAGES.EXTRACTING_TRANSCRIPT]: 30,
  [PROGRESS_STAGES.PROCESSING_TRANSCRIPT]: 50,
  [PROGRESS_STAGES.GENERATING_SUMMARY]: 70,
  [PROGRESS_STAGES.EXTRACTING_INSIGHTS]: 85,
  [PROGRESS_STAGES.CLASSIFYING_CONTENT]: 95,
  [PROGRESS_STAGES.FINALIZING]: 98,
  [PROGRESS_STAGES.COMPLETED]: 100,
  [PROGRESS_STAGES.ERROR]: 0,
}

/**
 * Service for managing progress tracking
 */
export class ProgressService {
  /**
   * Generate a unique task ID
   * 
   * @returns A unique task identifier
   */
  static generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Initialize progress tracking for a task
   * 
   * @param taskId - The task ID to track
   * @returns The initial progress event
   */
  static initializeProgress(taskId: string): ProgressEvent {
    const event: ProgressEvent = {
      taskId,
      progress: 0,
      stage: PROGRESS_STAGES.INITIALIZING,
      status: 'processing',
      timestamp: new Date(),
    }
    
    progressStore.set(taskId, event)
    progressEmitter.emit(`progress:${taskId}`, event)
    
    logger.debug('Initialized progress tracking', { taskId })
    
    return event
  }
  
  /**
   * Update progress for a task
   * 
   * @param taskId - The task ID
   * @param stage - The current stage
   * @param metadata - Optional metadata
   * @returns The updated progress event
   */
  static updateProgress(
    taskId: string,
    stage: string,
    metadata?: Record<string, any>
  ): ServiceResult<ProgressEvent> {
    try {
      const progress = STAGE_PROGRESS[stage] || 0
      
      const event: ProgressEvent = {
        taskId,
        progress,
        stage,
        status: stage === PROGRESS_STAGES.COMPLETED ? 'completed' : 
                stage === PROGRESS_STAGES.ERROR ? 'error' : 'processing',
        timestamp: new Date(),
        metadata,
      }
      
      progressStore.set(taskId, event)
      progressEmitter.emit(`progress:${taskId}`, event)
      
      logger.debug('Updated progress', { taskId, stage, progress })
      
      return {
        success: true,
        data: event,
      }
    } catch (error) {
      logger.error('Failed to update progress', { error, taskId, stage })
      return {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: 'Failed to update progress',
          details: error,
        },
      }
    }
  }
  
  /**
   * Get current progress for a task
   * 
   * @param taskId - The task ID
   * @returns The current progress event or null
   */
  static getProgress(taskId: string): ProgressEvent | null {
    return progressStore.get(taskId) || null
  }
  
  /**
   * Mark a task as completed
   * 
   * @param taskId - The task ID
   * @param metadata - Optional completion metadata
   * @returns The final progress event
   */
  static completeProgress(
    taskId: string,
    metadata?: Record<string, any>
  ): ServiceResult<ProgressEvent> {
    return this.updateProgress(taskId, PROGRESS_STAGES.COMPLETED, metadata)
  }
  
  /**
   * Mark a task as failed
   * 
   * @param taskId - The task ID
   * @param error - Error details
   * @returns The error progress event
   */
  static failProgress(
    taskId: string,
    error: any
  ): ServiceResult<ProgressEvent> {
    return this.updateProgress(taskId, PROGRESS_STAGES.ERROR, {
      error: error?.message || 'Unknown error',
      details: error,
    })
  }
  
  /**
   * Clean up progress data for a task
   * 
   * @param taskId - The task ID
   * @param delayMs - Delay before cleanup (default: 5 minutes)
   */
  static cleanupProgress(taskId: string, delayMs: number = 5 * 60 * 1000): void {
    setTimeout(() => {
      progressStore.delete(taskId)
      logger.debug('Cleaned up progress data', { taskId })
    }, delayMs)
  }
  
  /**
   * Create an observable for progress updates
   * 
   * @param taskId - The task ID to observe
   * @returns An observable that emits progress events
   */
  static createProgressObservable(taskId: string) {
    return observable<ProgressEvent>((observer) => {
      // Send current progress immediately if available
      const currentProgress = this.getProgress(taskId)
      if (currentProgress) {
        observer.next(currentProgress)
      }
      
      // Listen for updates
      const handler = (event: ProgressEvent) => {
        observer.next(event)
        
        // Complete the observable when task is done
        if (event.status === 'completed' || event.status === 'error') {
          observer.complete()
        }
      }
      
      progressEmitter.on(`progress:${taskId}`, handler)
      
      // Cleanup on unsubscribe
      return () => {
        progressEmitter.off(`progress:${taskId}`, handler)
      }
    })
  }
  
  /**
   * Simulate progress for a task (useful for demos or when real progress is unavailable)
   * 
   * @param taskId - The task ID
   * @param durationMs - Total duration for the simulation
   * @returns Promise that resolves when simulation is complete
   */
  static async simulateProgress(
    taskId: string,
    durationMs: number = 30000
  ): Promise<void> {
    const stages = Object.values(PROGRESS_STAGES).filter(
      s => s !== PROGRESS_STAGES.ERROR && s !== PROGRESS_STAGES.COMPLETED
    )
    
    const stageDelay = durationMs / stages.length
    
    this.initializeProgress(taskId)
    
    for (const stage of stages) {
      await new Promise(resolve => setTimeout(resolve, stageDelay))
      this.updateProgress(taskId, stage)
    }
    
    this.completeProgress(taskId)
    this.cleanupProgress(taskId)
  }
  
  /**
   * Get all active tasks
   * 
   * @returns Array of active task IDs
   */
  static getActiveTasks(): string[] {
    return Array.from(progressStore.keys())
  }
  
  /**
   * Clear all progress data (useful for cleanup or testing)
   */
  static clearAll(): void {
    progressStore.clear()
    progressEmitter.removeAllListeners()
    logger.debug('Cleared all progress data')
  }
  
  /**
   * Get progress statistics
   * 
   * @returns Statistics about current progress tracking
   */
  static getStats(): {
    totalTasks: number
    activeTasks: number
    completedTasks: number
    errorTasks: number
  } {
    const tasks = Array.from(progressStore.values())
    
    return {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.status === 'processing').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      errorTasks: tasks.filter(t => t.status === 'error').length,
    }
  }
}