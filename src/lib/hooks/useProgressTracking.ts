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

  useEffect(() => {
    if (!taskId) {
      // Reset state when no task
      setProgress(0)
      setStage('')
      setStatus('processing')
      return
    }

    const fetchProgress = async () => {
      try {
        // Check if this is a temporary task ID (fallback to simulated progress)
        if (taskId?.startsWith('temp_')) {
          // Simulate progress for temporary tasks
          const startTime = parseInt(taskId.split('_')[1])
          const elapsed = Date.now() - startTime
          const simulatedProgress = Math.min(Math.floor((elapsed / 30000) * 90), 90) // 90% in 30 seconds
          
          const stages = [
            'Connecting to YouTube...',
            'Downloading transcript...',
            'Analyzing content with AI...',
            'Extracting key insights...',
            'Generating your summary...'
          ]
          
          const stageIndex = Math.floor((simulatedProgress / 90) * stages.length)
          const currentStage = stages[Math.min(stageIndex, stages.length - 1)]
          
          setProgress(simulatedProgress)
          setStage(currentStage)
          setStatus('processing')
          return
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
        const response = await fetch(`${backendUrl}/api/progress/${taskId}`)
        
        if (!response.ok) {
          // If real progress tracking fails, fall back to simulation
          if (response.status === 404) {
            const elapsed = Date.now() - (parseInt(taskId || '0') || Date.now())
            const simulatedProgress = Math.min(Math.floor((elapsed / 30000) * 90), 90)
            setProgress(simulatedProgress)
            setStage('Processing your video...')
            setStatus('processing')
            return
          }
          throw new Error(`HTTP ${response.status}`)
        }

        const data: ProgressData = await response.json()
        
        setProgress(data.progress)
        setStage(data.stage)
        setStatus(data.status)

        if (data.status === 'completed') {
          onComplete?.(data)
          // Stop polling when complete
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        } else if (data.status === 'error') {
          onError?.(data.stage)
          // Stop polling on error
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      } catch (error) {
        console.error('Progress tracking error:', error)
        // Fallback to basic simulation on error
        const elapsed = Date.now() - (parseInt(taskId?.split('_')[1] || '0') || Date.now())
        const simulatedProgress = Math.min(Math.floor((elapsed / 30000) * 90), 90)
        setProgress(simulatedProgress)
        setStage('Processing your video...')
        setStatus('processing')
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
    }
  }, [taskId, interval, onComplete, onError])

  return {
    progress,
    stage,
    status,
    isTracking: !!taskId && status === 'processing'
  }
}