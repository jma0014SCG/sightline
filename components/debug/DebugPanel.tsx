'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { api } from '@/lib/api/trpc'

export function DebugPanel() {
  const [testUrl, setTestUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  const [logs, setLogs] = useState<string[]>([])
  const { isAuthenticated, user, isLoading, login } = useAuth()

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev])
  }

  const createSummary = api.summary.create.useMutation({
    onSuccess: (data) => {
      addLog(`✅ Summary created successfully: ${data.id}`)
    },
    onError: (error) => {
      addLog(`❌ Summary creation failed: ${error.message}`)
    }
  })

  const testSummarization = async () => {
    addLog('🚀 Starting summarization test...')
    addLog(`Auth status: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`)
    addLog(`User: ${user?.email || 'None'}`)
    addLog(`URL: ${testUrl}`)

    if (!isAuthenticated) {
      addLog('❌ Not authenticated - redirecting would happen here')
      return
    }

    try {
      addLog('📤 Calling createSummary mutation...')
      await createSummary.mutateAsync({ url: testUrl })
    } catch (error) {
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

  const clearLogs = () => setLogs([])

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-h-96 overflow-hidden flex flex-col">
      <h3 className="font-bold text-sm mb-2">Debug Panel</h3>
      
      <div className="mb-2 text-xs">
        <div>Auth: {isLoading ? 'Loading...' : isAuthenticated ? '✅ Yes' : '❌ No'}</div>
        <div>User: {user?.email || 'None'}</div>
      </div>

      <div className="mb-2">
        <input
          type="text"
          value={testUrl}
          onChange={(e) => setTestUrl(e.target.value)}
          placeholder="YouTube URL"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 mb-1"
        />
        <div className="flex gap-1">
          <button
            onClick={testSummarization}
            disabled={createSummary.isPending}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50"
          >
            {createSummary.isPending ? 'Testing...' : 'Test Summary'}
          </button>
          <button
            onClick={testAuth}
            className="text-xs bg-green-500 text-white px-2 py-1 rounded"
          >
            Test Auth
          </button>
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
            onClick={clearLogs}
            className="text-xs bg-gray-500 text-white px-2 py-1 rounded"
          >
            Clear
          </button>
        </div>
      </div>

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
    </div>
  )
}