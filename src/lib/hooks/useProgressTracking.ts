import { useState, useEffect, useRef } from 'react'

interface ProgressData {
  progress: number
  stage: string
  status: 'processing' | 'completed' | 'error'
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

export function useProgressTracking({
  taskId,
  interval = 1000,
  onComplete,
  onError
}: UseProgressTrackingOptions) {
  const [progress, setProgress] = useState(0)
  const [stage, setStage] = useState('')
  const [status, setStatus] = useState<'processing' | 'completed' | 'error'>('processing')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousTaskRef = useRef<PreviousTaskData | null>(null)
  const retryCountRef = useRef(0)

  useEffect(() => {
    if (!taskId) {
      // Reset state when no task
      setProgress(0)
      setStage('')
      setStatus('processing')
      previousTaskRef.current = null
      return
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
        retryCountRef.current = 0 // Reset retry count on successful fetch attempt
        
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
          
          const simulatedProgress = Math.min(Math.floor(easedProgress * 95), 95) // 95% in 50 seconds
          
          const stages = [
            'Connecting to YouTube...',
            'Downloading transcript...',
            'Processing video metadata...',
            'Analyzing content with AI...',
            'Extracting key insights...',
            'Generating comprehensive summary...',
            'Finalizing your results...'
          ]
          
          const stageIndex = Math.floor((simulatedProgress / 95) * stages.length)
          const currentStage = stages[Math.min(stageIndex, stages.length - 1)]
          
          // Only update progress if it's higher (prevent regression during task transitions)
          if (simulatedProgress >= progress) {
            setProgress(simulatedProgress)
            setStage(currentStage)
            setStatus('processing')
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
          // If real progress tracking fails, fall back to simulation but preserve existing progress
          if (response.status === 404) {
            console.log('⚠️ Backend progress not found, using fallback simulation')
            const elapsed = Date.now() - (parseInt(taskId?.split('_')[1] || taskId || '0') || Date.now())
            const maxTime = 50000 // 50 seconds
            const timeProgress = Math.min(elapsed / maxTime, 1)
            const easedProgress = timeProgress < 0.5 
              ? 2 * timeProgress * timeProgress 
              : 1 - Math.pow(-2 * timeProgress + 2, 3) / 2
            const simulatedProgress = Math.min(Math.floor(easedProgress * 95), 95)
            
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
          // Ensure we show 100% progress and clear completion message
          setProgress(100)
          setStage('Summary ready! ✅')
          setStatus('completed')
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
          const simulatedProgress = Math.min(Math.floor(easedProgress * 95), 95)
          
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

    // Start polling immediately
    fetchProgress()
    
    // Set up interval polling
    intervalRef.current = setInterval(fetchProgress, interval)

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      retryCountRef.current = 0
    }
  }, [taskId, interval, onComplete, onError, progress]) // Add progress to deps to check transitions

  return {
    progress,
    stage,
    status,
    isTracking: !!taskId && status === 'processing'
  }
}