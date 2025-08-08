# Progress Tracking Implementation Examples

**Real-time progress tracking for long-running summarization tasks**

## Overview

Sightline.ai uses UUID-based task tracking to provide real-time progress updates during AI processing. This enables users to see accurate progress stages without blocking the UI.

## Frontend Implementation

### React Hook for Progress Tracking

```typescript
import { useState, useEffect, useCallback } from 'react'

interface ProgressState {
  progress: number
  stage: string
  status: 'processing' | 'completed' | 'error'
  error?: string
}

export function useProgressTracking(taskId: string | null) {
  const [progressState, setProgressState] = useState<ProgressState>({
    progress: 0,
    stage: 'Initializing...',
    status: 'processing'
  })

  const pollProgress = useCallback(async () => {
    if (!taskId) return

    try {
      const response = await fetch(`/api/progress/${taskId}`)
      const data = await response.json()

      setProgressState({
        progress: data.progress,
        stage: data.stage,
        status: data.status,
        error: data.error
      })

      // Continue polling if still processing
      if (data.status === 'processing' && data.progress < 100) {
        setTimeout(pollProgress, 2000) // Poll every 2 seconds
      }
    } catch (error) {
      console.error('Progress polling failed:', error)
      setProgressState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to track progress'
      }))
    }
  }, [taskId])

  useEffect(() => {
    if (taskId) {
      pollProgress()
    }
  }, [taskId, pollProgress])

  return progressState
}
```

### Progress UI Component

```typescript
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ProgressTrackerProps {
  taskId: string | null
  onComplete?: (result: any) => void
}

export function ProgressTracker({ taskId, onComplete }: ProgressTrackerProps) {
  const { progress, stage, status, error } = useProgressTracking(taskId)

  // Handle completion
  useEffect(() => {
    if (status === 'completed' && onComplete) {
      onComplete({ progress, stage })
    }
  }, [status, onComplete, progress, stage])

  if (status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error || 'Processing failed. Please try again.'}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <Progress value={progress} className="w-full" />
      <div className="text-sm text-muted-foreground text-center">
        {stage}
      </div>
      {progress < 100 && (
        <div className="text-xs text-center">
          {progress}% complete
        </div>
      )}
    </div>
  )
}
```

### Integration with Summary Creation

```typescript
export function CreateSummaryForm() {
  const [taskId, setTaskId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const createSummary = api.summary.create.useMutation({
    onSuccess: (data) => {
      setTaskId(data.task_id)
      setIsProcessing(true)
    },
    onError: (error) => {
      toast.error(`Failed to create summary: ${error.message}`)
    }
  })

  const handleProgressComplete = useCallback(async () => {
    setIsProcessing(false)
    
    // Refresh summary data from tRPC
    await utils.summary.getById.invalidate()
    await utils.library.getAll.invalidate()
    
    toast.success('Summary created successfully!')
    
    // Navigate to summary page
    router.push(`/library/${summaryId}`)
  }, [summaryId, utils, router])

  const handleSubmit = async (url: string) => {
    try {
      await createSummary.mutateAsync({ url })
    } catch (error) {
      // Error handling in mutation callback
    }
  }

  return (
    <div className="space-y-6">
      <URLInput 
        onSubmit={handleSubmit}
        disabled={isProcessing}
      />
      
      {isProcessing && (
        <ProgressTracker 
          taskId={taskId}
          onComplete={handleProgressComplete}
        />
      )}
    </div>
  )
}
```

## Backend Implementation

### FastAPI Progress Service

```python
import asyncio
from typing import Dict, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ProgressState:
    progress: int
    stage: str
    status: str
    task_id: str
    updated_at: datetime
    error: Optional[str] = None

class ProgressService:
    def __init__(self):
        self._tasks: Dict[str, ProgressState] = {}
        self._cleanup_interval = 3600  # 1 hour
        
    async def start_task(self, task_id: str, initial_stage: str = "Initializing..."):
        """Initialize progress tracking for a new task"""
        self._tasks[task_id] = ProgressState(
            progress=0,
            stage=initial_stage,
            status="processing",
            task_id=task_id,
            updated_at=datetime.utcnow()
        )
        
    async def update_progress(
        self, 
        task_id: str, 
        progress: int, 
        stage: str,
        status: str = "processing"
    ):
        """Update progress for an existing task"""
        if task_id in self._tasks:
            self._tasks[task_id].progress = progress
            self._tasks[task_id].stage = stage
            self._tasks[task_id].status = status
            self._tasks[task_id].updated_at = datetime.utcnow()
            
    async def set_error(self, task_id: str, error_message: str):
        """Mark task as failed with error message"""
        if task_id in self._tasks:
            self._tasks[task_id].status = "error"
            self._tasks[task_id].error = error_message
            self._tasks[task_id].updated_at = datetime.utcnow()
            
    async def get_progress(self, task_id: str) -> Optional[ProgressState]:
        """Get current progress state for a task"""
        return self._tasks.get(task_id)
        
    async def cleanup_completed(self):
        """Remove old completed/failed tasks to prevent memory leaks"""
        cutoff = datetime.utcnow().timestamp() - self._cleanup_interval
        
        to_remove = [
            task_id for task_id, state in self._tasks.items()
            if state.updated_at.timestamp() < cutoff
            and state.status in ["completed", "error"]
        ]
        
        for task_id in to_remove:
            del self._tasks[task_id]

# Global progress service instance
progress_service = ProgressService()
```

### Progress Endpoint

```python
from fastapi import HTTPException

@app.get("/api/progress/{task_id}")
async def get_progress(task_id: str):
    """Get current progress for a task"""
    
    progress_state = await progress_service.get_progress(task_id)
    
    if not progress_state:
        raise HTTPException(
            status_code=404, 
            detail=f"Task {task_id} not found"
        )
    
    return {
        "progress": progress_state.progress,
        "stage": progress_state.stage,
        "status": progress_state.status,
        "task_id": progress_state.task_id,
        "error": progress_state.error
    }

@app.delete("/api/progress/{task_id}")
async def cleanup_progress(task_id: str):
    """Clean up completed progress data"""
    if task_id in progress_service._tasks:
        del progress_service._tasks[task_id]
    
    return {"status": "cleaned"}
```

### Integration in Processing Pipeline

```python
async def process_summary_with_progress(
    url: str, 
    user_id: str, 
    task_id: str
):
    """Complete summary processing with progress updates"""
    
    try:
        # Stage 1: Initialize
        await progress_service.update_progress(
            task_id, 5, "Connecting to YouTube..."
        )
        
        # Stage 2: Get video metadata
        video_metadata = await get_video_metadata(url)
        await progress_service.update_progress(
            task_id, 25, "Fetching video information..."
        )
        
        # Stage 3: Download transcript
        transcript = await get_video_transcript(url)
        await progress_service.update_progress(
            task_id, 40, "Downloading transcript..."
        )
        
        # Stage 4: AI processing
        await progress_service.update_progress(
            task_id, 60, "Analyzing content with AI..."
        )
        summary = await process_with_openai(transcript, video_metadata)
        
        # Stage 5: Generate final summary
        await progress_service.update_progress(
            task_id, 80, "Generating your summary..."
        )
        
        # Stage 6: Store in database
        stored_summary = await store_summary(user_id, summary, video_metadata)
        
        # Stage 7: Complete
        await progress_service.update_progress(
            task_id, 100, "Summary ready!", "completed"
        )
        
        return stored_summary
        
    except Exception as e:
        await progress_service.set_error(task_id, str(e))
        raise
```

## Error Handling Patterns

### Frontend Error Recovery

```typescript
export function useProgressTrackingWithRetry(taskId: string | null) {
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  
  const pollProgressWithRetry = useCallback(async () => {
    try {
      const response = await fetch(`/api/progress/${taskId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      // Reset retry count on successful request
      setRetryCount(0)
      
      return data
    } catch (error) {
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1)
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        return pollProgressWithRetry()
      } else {
        throw error
      }
    }
  }, [taskId, retryCount, maxRetries])

  // ... rest of implementation
}
```

### Backend Error Recovery

```python
async def process_with_error_recovery(task_id: str, url: str):
    """Process summary with automatic error recovery"""
    
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            return await process_summary_with_progress(url, task_id)
        except TransientError as e:
            retry_count += 1
            wait_time = 2 ** retry_count  # Exponential backoff
            
            await progress_service.update_progress(
                task_id, 
                -1,  # Indicate retry
                f"Retrying... ({retry_count}/{max_retries})"
            )
            
            await asyncio.sleep(wait_time)
            
        except PermanentError as e:
            await progress_service.set_error(task_id, str(e))
            raise
    
    # All retries exhausted
    await progress_service.set_error(task_id, "Maximum retries exceeded")
    raise Exception("Processing failed after multiple attempts")
```

## Testing

### Frontend Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useProgressTracking } from '@/hooks/useProgressTracking'

// Mock fetch
global.fetch = jest.fn()

describe('useProgressTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should poll progress and update state', async () => {
    const mockResponses = [
      { progress: 25, stage: 'Processing...', status: 'processing' },
      { progress: 100, stage: 'Complete!', status: 'completed' }
    ]
    
    let callCount = 0
    ;(fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockResponses[callCount++])
      })
    )

    const { result } = renderHook(() => useProgressTracking('task-123'))

    await waitFor(() => {
      expect(result.current.progress).toBe(100)
      expect(result.current.status).toBe('completed')
    })

    expect(fetch).toHaveBeenCalledWith('/api/progress/task-123')
  })
})
```

### Backend Testing

```python
import pytest
from unittest.mock import AsyncMock
from api.services.progress_service import ProgressService

@pytest.fixture
async def progress_service():
    return ProgressService()

@pytest.mark.asyncio
async def test_progress_tracking(progress_service):
    task_id = "test-task-123"
    
    # Start task
    await progress_service.start_task(task_id, "Starting...")
    
    # Update progress
    await progress_service.update_progress(task_id, 50, "Halfway done")
    
    # Get progress
    state = await progress_service.get_progress(task_id)
    
    assert state.progress == 50
    assert state.stage == "Halfway done"
    assert state.status == "processing"
```

---

**Related Documentation**:
- [FastAPI Progress Endpoint](../fastapi/progress.md)
- [tRPC Summary Procedures](../trpc/summary.md)
- [Error Handling Patterns](error-handling.md)