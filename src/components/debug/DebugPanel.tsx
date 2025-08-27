'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useProgressTracking } from '@/lib/hooks/useProgressTracking'
import { api } from '@/components/providers/TRPCProvider'
import { LogViewer } from './LogViewer'
import { correlationStore, generateCorrelationId } from '@/lib/api/correlation'
import { createLogger } from '@/lib/logger'

export function DebugPanel() {
  const [testUrl, setTestUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  const [logs, setLogs] = useState<string[]>([])
  const [testTaskId, setTestTaskId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [showLogViewer, setShowLogViewer] = useState(false)
  const [currentCorrelationId, setCurrentCorrelationId] = useState<string | null>(null)
  const { isAuthenticated, user, isLoading, login } = useAuth()
  const logger = createLogger('debug-panel')
  
  // Test progress tracking
  const { progress, stage, status } = useProgressTracking({
    taskId: testTaskId,
    onComplete: (data) => {
      addLog(`✅ Progress completed: ${JSON.stringify(data)}`)
      setTestTaskId(null)
    },
    onError: (error) => {
      addLog(`❌ Progress error: ${error}`)
      setTestTaskId(null)
    }
  })

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev])
  }

  const createSummary = api.summary.create.useMutation({
    onSuccess: (data) => {
      addLog(`✅ Summary created successfully: ${data.id}`)
      addLog(`🆔 Task ID from backend: ${data.task_id}`)
      if (data.task_id) {
        setTestTaskId(data.task_id)
        addLog('🔄 Starting progress tracking with real task ID')
      }
    },
    onError: (error) => {
      addLog(`❌ Summary creation failed: ${error.message}`)
    }
  })

  const testSummarization = async () => {
    // Generate correlation ID for this flow
    const correlationId = generateCorrelationId('debug')
    const requestId = generateCorrelationId('req')
    setCurrentCorrelationId(correlationId)
    correlationStore.setContext({ correlationId, requestId, userId: user?.id })
    
    logger.info('Starting summarization test', {
      url: testUrl,
      authenticated: isAuthenticated,
      user: user?.email,
      correlationId,
    })
    
    addLog('🚀 Starting summarization test...')
    addLog(`🔗 Correlation ID: ${correlationId}`)
    addLog(`Auth status: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`)
    addLog(`User: ${user?.email || 'None'}`)
    addLog(`URL: ${testUrl}`)

    if (!isAuthenticated) {
      logger.warn('Not authenticated - cannot proceed')
      addLog('❌ Not authenticated - redirecting would happen here')
      return
    }

    try {
      addLog('📤 Calling createSummary mutation...')
      logger.info('Calling createSummary mutation', { url: testUrl })
      await createSummary.mutateAsync({ url: testUrl })
    } catch (error) {
      logger.error('Summarization failed', error as Error)
      addLog(`❌ Exception caught: ${error}`)
    }
  }

  const testAuth = async () => {
    addLog('🔍 Testing authentication...')
    try {
      const response = await fetch('/api/auth/session')
      const session = await response.json()
      addLog(`Session response: ${JSON.stringify(session, null, 2)}`)
    } catch (error) {
      addLog(`❌ Auth test failed: ${error}`)
    }
  }

  const testGoogleAuth = async () => {
    addLog('🔍 Testing Google OAuth...')
    try {
      // Test providers endpoint
      const providersRes = await fetch('/api/auth/providers')
      const providers = await providersRes.json()
      addLog(`Providers: ${JSON.stringify(providers, null, 2)}`)

      // Test signin URL
      addLog('🔗 Testing Google signin URL...')
      const signinUrl = '/api/auth/signin/google'
      addLog(`Google signin URL: ${signinUrl}`)
      
      // Try the login function
      addLog('🚀 Attempting login with useAuth hook...')
      await login()
      
    } catch (error) {
      addLog(`❌ Google OAuth test failed: ${error}`)
    }
  }

  const testTRPC = async () => {
    addLog('🔍 Testing tRPC connection...')
    try {
      // Test a simple tRPC call
      const response = await fetch('/api/trpc/auth.getSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: null, meta: { values: {} } })
      })
      const data = await response.json()
      addLog(`tRPC response: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      addLog(`❌ tRPC test failed: ${error}`)
    }
  }

  const testProgressTracking = async () => {
    addLog('🔄 Testing progress tracking...')
    
    // Generate a temp task ID to test simulation
    const tempTaskId = `temp_${Date.now()}_test`
    addLog(`🆔 Generated temp task ID: ${tempTaskId}`)
    setTestTaskId(tempTaskId)
    
    // Test will run for 10 seconds then stop
    setTimeout(() => {
      addLog('⏰ Stopping temp progress test')
      setTestTaskId(null)
    }, 10000)
  }

  const testBackendProgress = async () => {
    const correlationId = generateCorrelationId('debug-backend')
    setCurrentCorrelationId(correlationId)
    
    logger.info('Testing backend progress endpoint', { correlationId })
    addLog('🔍 Testing backend progress endpoint...')
    addLog(`🔗 Correlation ID: ${correlationId}`)
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      const testId = 'test-task-123'
      
      const response = await fetch(`${backendUrl}/api/progress/${testId}`, {
        headers: {
          'x-correlation-id': correlationId,
        },
      })
      const data = await response.json()
      logger.info('Backend response received', { status: response.status, data })
      addLog(`📊 Backend response: ${JSON.stringify(data, null, 2)}`)
      
      if (response.ok) {
        addLog('✅ Backend progress endpoint working')
      } else {
        addLog(`⚠️ Backend returned ${response.status}`)
      }
    } catch (error) {
      logger.error('Backend progress test failed', error as Error)
      addLog(`❌ Backend progress test failed: ${error}`)
    }
  }

  const testSyntheticSummary = async () => {
    const correlationId = generateCorrelationId('synthetic')
    setCurrentCorrelationId(correlationId)
    
    logger.info('Testing synthetic summary endpoint', { correlationId })
    addLog('🧪 Testing synthetic summary endpoint...')
    addLog(`🔗 Correlation ID: ${correlationId}`)
    
    try {
      const response = await fetch('/api/dev/synthetic-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
        },
        body: JSON.stringify({
          url: testUrl,
          simulateDelay: 2000,
        }),
      })
      
      const data = await response.json()
      logger.info('Synthetic summary received', { 
        status: response.status, 
        taskId: data.task_id,
        summaryId: data.id,
      })
      
      addLog(`✅ Synthetic summary created: ${data.id}`)
      addLog(`🆔 Task ID: ${data.task_id}`)
      addLog(`📝 Title: ${data.title}`)
      
      if (data.task_id) {
        setTestTaskId(data.task_id)
      }
    } catch (error) {
      logger.error('Synthetic summary test failed', error as Error)
      addLog(`❌ Synthetic test failed: ${error}`)
    }
  }

  const clearLogs = () => setLogs([])

  return (
    <div className={`fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 flex flex-col transition-all duration-300 ${
      expanded ? 'w-[500px] max-h-[600px]' : 'w-96 max-h-96'
    } overflow-hidden`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm">Debug Panel</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      <div className="mb-2 text-xs">
        <div>Auth: {isLoading ? 'Loading...' : isAuthenticated ? '✅ Yes' : '❌ No'}</div>
        <div>User: {user?.email || 'None'}</div>
        {currentCorrelationId && (
          <div className="mt-1 p-1 bg-purple-50 rounded">
            <div className="text-purple-700">CID: {currentCorrelationId}</div>
          </div>
        )}
        {testTaskId && (
          <div className="mt-1 p-2 bg-blue-50 rounded">
            <div>Progress: {progress}% ({status})</div>
            <div>Stage: {stage}</div>
            <div>Task ID: {testTaskId}</div>
          </div>
        )}
      </div>

      <div className="mb-2">
        <input
          type="text"
          value={testUrl}
          onChange={(e) => setTestUrl(e.target.value)}
          placeholder="YouTube URL"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-1"
        />
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={testSummarization}
            disabled={createSummary.isPending}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50"
          >
            {createSummary.isPending ? 'Testing...' : 'Test Summary'}
          </button>
          <button
            onClick={testProgressTracking}
            disabled={!!testTaskId}
            className="text-xs bg-indigo-500 text-white px-2 py-1 rounded disabled:opacity-50"
          >
            {testTaskId ? 'Tracking...' : 'Test Progress'}
          </button>
          <button
            onClick={testBackendProgress}
            className="text-xs bg-yellow-500 text-white px-2 py-1 rounded"
          >
            Test Backend
          </button>
          <button
            onClick={testAuth}
            className="text-xs bg-green-500 text-white px-2 py-1 rounded"
          >
            Test Auth
          </button>
          {expanded && (
            <>
              <button
                onClick={testTRPC}
                className="text-xs bg-purple-500 text-white px-2 py-1 rounded"
              >
                Test tRPC
              </button>
              <button
                onClick={testGoogleAuth}
                className="text-xs bg-red-500 text-white px-2 py-1 rounded"
              >
                Test OAuth
              </button>
              <button
                onClick={testSyntheticSummary}
                className="text-xs bg-purple-500 text-white px-2 py-1 rounded"
              >
                Synthetic
              </button>
              <button
                onClick={() => setShowLogViewer(!showLogViewer)}
                className={`text-xs px-2 py-1 rounded ${
                  showLogViewer ? 'bg-green-500 text-white' : 'bg-gray-300'
                }`}
              >
                Logs
              </button>
            </>
          )}
          <button
            onClick={clearLogs}
            className="text-xs bg-gray-500 text-white px-2 py-1 rounded"
          >
            Clear
          </button>
        </div>
      </div>

      {showLogViewer ? (
        <LogViewer 
          maxLogs={200} 
          filter={{ 
            correlationId: currentCorrelationId || undefined 
          }} 
        />
      ) : (
        <div className="flex-1 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
          {logs.length === 0 ? (
            <div className="text-gray-500">No logs yet. Click a test button.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1 font-mono whitespace-pre-wrap">
                {log}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}