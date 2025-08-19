import { useState, useEffect, useRef } from 'react'

interface ProgressData {
  progress: number
  stage: string
  status: 'queued' | 'processing' | 'completed' | 'error'
  task_id: string
}

interface UseProgressTrackingOptions {
  taskId: string | null
  interval?: number
  onComplete?: (data: ProgressData) => void
  onError?: (error: string) => void
}

interface PreviousTaskData {
  taskId: string
  progress: number
  stage: string
}

// Exponential backoff configuration
const BACKOFF_BASE = 1000 // Start at 1 second
const BACKOFF_MAX = 8000 // Max 8 seconds between retries
const BACKOFF_JITTER = 200 // ±200ms random jitter
const MAX_DURATION = 300000 // Give up after 300 seconds (5 minutes) for backend processing - increased for longer videos

export function useProgressTracking({
  taskId,
  interval = 1000,
  onComplete,
  onError
}: UseProgressTrackingOptions) {
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [status, setStatus] = useState<'queued' | 'processing' | 'completed' | 'error'>('queued')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousTaskRef = useRef<PreviousTaskData | null>(null)
  const retryCountRef = useRef(0)
  const startTimeRef = useRef<number | null>(null)
  const currentIntervalRef = useRef(BACKOFF_BASE)
  const consecutiveFailuresRef = useRef(0)

  useEffect(() => {
    if (!taskId) {
      // Reset state when no task
      setProgress(0)
      setStage('')
      setStatus('processing')
      previousTaskRef.current = null
      retryCountRef.current = 0
      startTimeRef.current = null
      currentIntervalRef.current = BACKOFF_BASE
      consecutiveFailuresRef.current = 0
      return
    }
    
    // Initialize start time for timeout tracking
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now()
      retryCountRef.current = 0
      currentIntervalRef.current = BACKOFF_BASE
      consecutiveFailuresRef.current = 0
    }

    // Check if this is a task ID transition
    const isTaskTransition = previousTaskRef.current && previousTaskRef.current.taskId !== taskId
    
    if (isTaskTransition) {
      console.log('🔄 Task ID transition detected:', {
        from: previousTaskRef.current?.taskId,
        to: taskId,
        preservedProgress: previousTaskRef.current?.progress
      })
      
      // For transitions from temp to real task ID, preserve progress if it's higher
      if (taskId && !taskId.startsWith('temp_') && previousTaskRef.current) {
        if (previousTaskRef.current.progress > 0) {
          console.log('📊 Preserving progress across task transition:', previousTaskRef.current.progress)
          // Don't reset progress, just update the stage to indicate transition
          setStage(previousTaskRef.current.stage + ' (switching to real-time tracking...)')
        }
      }
    }

    const fetchProgress = async () => {
      try {
        // Check timeout
        if (startTimeRef.current && Date.now() - startTimeRef.current > MAX_DURATION) {
          console.log('⏱️ Progress tracking timeout after 2 minutes')
          if (onError) {
            onError('Progress tracking timeout')
          }
          return
        }
        
        // Check if this is a temporary task ID (fallback to simulated progress)
        if (taskId?.startsWith('temp_')) {
          // Simulate progress for temporary tasks (optimized to 50 seconds with acceleration curve)
          const startTime = parseInt(taskId.split('_')[1])
          const elapsed = Date.now() - startTime
          const maxTime = 50000 // 50 seconds total
          const timeProgress = Math.min(elapsed / maxTime, 1)
          
          // Create an acceleration curve: slow start, fast middle, smooth finish
          const easedProgress = timeProgress < 0.5 
            ? 2 * timeProgress * timeProgress 
            : 1 - Math.pow(-2 * timeProgress + 2, 3) / 2
          
          const simulatedProgress = Math.min(Math.floor(easedProgress * 100), 100) // 100% in 50 seconds
          
          const stages = [
            'Connecting to YouTube...',
            'Downloading transcript...',
            'Processing video metadata...',
            'Analyzing content with AI...',
            'Extracting key insights...',
            'Generating comprehensive summary...',
            'Finalizing your results...'
          ]
          
          const stageIndex = Math.floor((simulatedProgress / 100) * stages.length)
          const currentStage = stages[Math.min(stageIndex, stages.length - 1)]
          
          // Only update progress if it's higher (prevent regression during task transitions)
          if (simulatedProgress >= progress) {
            setProgress(simulatedProgress)
            setStage(currentStage)
            
            // Mark as completed when we reach 100%
            if (simulatedProgress >= 100) {
              setStatus('completed')
              if (onComplete) {
                onComplete({
                  progress: 100,
                  stage: 'Summary ready!',
                  status: 'completed',
                  task_id: taskId
                })
              }
            } else {
              setStatus('processing')
            }
          }
          
          // Store current task data for potential transitions
          previousTaskRef.current = {
            taskId,
            progress: simulatedProgress,
            stage: currentStage
          }
          
          return
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
        const response = await fetch(`${backendUrl}/api/progress/${taskId}`)
        
        if (!response.ok) {
          // If real progress tracking fails, handle different scenarios
          if (response.status === 404) {
            // For the first few 404s, show "Queued..." status
            if (consecutiveFailuresRef.current < 3) {
              console.log('⏳ Task queued, waiting for processing to start...')
              setProgress(0)
              setStage('Queued...')
              setStatus('queued')
              consecutiveFailuresRef.current += 1
              
              // Increase polling interval with exponential backoff
              currentIntervalRef.current = Math.min(
                currentIntervalRef.current * 2,
                BACKOFF_MAX
              )
              return
            }
            
            // After 3 consecutive 404s, fall back to simulation
            console.log('⚠️ Backend progress not found after retries, using fallback simulation')
            const elapsed = Date.now() - (startTimeRef.current || Date.now())
            const maxTime = 50000 // 50 seconds
            const timeProgress = Math.min(elapsed / maxTime, 1)
            const easedProgress = timeProgress < 0.5 
              ? 2 * timeProgress * timeProgress 
              : 1 - Math.pow(-2 * timeProgress + 2, 3) / 2
            const simulatedProgress = Math.min(Math.floor(easedProgress * 100), 100)
            
            // Only update if progress is moving forward
            if (simulatedProgress >= progress) {
              setProgress(simulatedProgress)
              setStage('Processing your video...')
              setStatus('processing')
            }
            return
          }
          throw new Error(`HTTP ${response.status}`)
        }

        const data: ProgressData = await response.json()
        
        console.log('📊 Backend progress update:', data)
        
        // Reset failure count and backoff on successful response
        consecutiveFailuresRef.current = 0
        currentIntervalRef.current = BACKOFF_BASE
        
        // Only update progress if it's moving forward (prevent regression)
        if (data.progress >= progress || data.status === 'completed' || data.status === 'error') {
          setProgress(data.progress)
          setStage(data.stage)
          setStatus(data.status)
          
          // Store current task data for potential transitions
          previousTaskRef.current = {
            taskId,
            progress: data.progress,
            stage: data.stage
          }
        }

        if (data.status === 'completed') {
          console.log('✅ Progress tracking completed:', data)
          onComplete?.(data)
          // Stop polling when complete
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        } else if (data.status === 'error') {
          console.error('❌ Progress tracking error:', data.stage)
          onError?.(data.stage)
          // Stop polling on error
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      } catch (error) {
        retryCountRef.current += 1
        console.error(`Progress tracking error (attempt ${retryCountRef.current}):`, error)
        
        // If we've retried too many times, fall back to simulation
        if (retryCountRef.current >= 3) {
          console.log('⚠️ Max retries reached, falling back to simulation')
          // Fallback to basic simulation on error
          const elapsed = Date.now() - (parseInt(taskId?.split('_')[1] || '0') || Date.now())
          const maxTime = 50000 // 50 seconds
          const timeProgress = Math.min(elapsed / maxTime, 1)
          const easedProgress = timeProgress < 0.5 
            ? 2 * timeProgress * timeProgress 
            : 1 - Math.pow(-2 * timeProgress + 2, 3) / 2
          const simulatedProgress = Math.min(Math.floor(easedProgress * 100), 100)
          
          // Only update if progress is moving forward
          if (simulatedProgress >= progress) {
            setProgress(simulatedProgress)
            setStage('Processing your video...')
            setStatus('processing')
          }
        }
        // Otherwise, just continue with current progress and retry on next interval
      }
    }

    // Function to schedule next poll with exponential backoff
    const scheduleNextPoll = () => {
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * BACKOFF_JITTER * 2 - BACKOFF_JITTER
      const nextInterval = Math.max(100, currentIntervalRef.current + jitter)
      
      console.log(`⏱️ Next poll in ${Math.round(nextInterval)}ms (backoff: ${currentIntervalRef.current}ms)`)
      
      intervalRef.current = setTimeout(async () => {
        await fetchProgress()
        // Schedule next poll if still tracking
        if (status === 'processing' || status === 'queued') {
          scheduleNextPoll()
        }
      }, nextInterval)
    }
    
    // Start polling immediately
    fetchProgress().then(() => {
      // Schedule next poll after first fetch
      if (status === 'processing' || status === 'queued') {
        scheduleNextPoll()
      }
    })

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }
      retryCountRef.current = 0
      startTimeRef.current = null
      currentIntervalRef.current = BACKOFF_BASE
      consecutiveFailuresRef.current = 0
    }
  }, [taskId]) // Remove interval from deps since we're managing it internally

  return {
    progress,
    stage,
    status,
    isTracking: !!taskId && status === 'processing'
  }
}