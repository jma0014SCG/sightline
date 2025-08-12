'use client'

import { useState, useEffect, useCallback } from 'react'
import { LogEntry, getLogCollector } from '@/lib/logger'

interface LogViewerProps {
  maxLogs?: number
  filter?: {
    level?: string[]
    component?: string
    correlationId?: string
  }
}

export function LogViewer({ maxLogs = 100, filter }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [levelFilter, setLevelFilter] = useState<Set<string>>(
    new Set(filter?.level || ['info', 'warn', 'error', 'fatal'])
  )
  const [componentFilter, setComponentFilter] = useState(filter?.component || '')
  const [correlationFilter, setCorrelationFilter] = useState(filter?.correlationId || '')

  useEffect(() => {
    const collector = getLogCollector()
    if (!collector) return

    // Load existing logs from buffer
    const buffer = collector.getBuffer()
    setLogs(buffer.slice(-maxLogs))

    // Subscribe to new logs
    const unsubscribe = collector.subscribe((entry: LogEntry) => {
      setLogs(prev => {
        const newLogs = [...prev, entry]
        if (newLogs.length > maxLogs) {
          return newLogs.slice(-maxLogs)
        }
        return newLogs
      })
    })

    return unsubscribe
  }, [maxLogs])

  const filteredLogs = logs.filter(log => {
    if (!levelFilter.has(log.level)) return false
    if (componentFilter && !log.component.includes(componentFilter)) return false
    if (correlationFilter && log.correlationId !== correlationFilter) return false
    return true
  })

  const toggleLevel = (level: string) => {
    setLevelFilter(prev => {
      const newSet = new Set(prev)
      if (newSet.has(level)) {
        newSet.delete(level)
      } else {
        newSet.add(level)
      }
      return newSet
    })
  }

  const clearLogs = () => {
    const collector = getLogCollector()
    if (collector) {
      collector.clear()
    }
    setLogs([])
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'text-gray-500'
      case 'info': return 'text-blue-600'
      case 'warn': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      case 'fatal': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  const getLevelBgColor = (level: string) => {
    switch (level) {
      case 'debug': return 'bg-gray-50'
      case 'info': return 'bg-blue-50'
      case 'warn': return 'bg-yellow-50'
      case 'error': return 'bg-red-50'
      case 'fatal': return 'bg-purple-50'
      default: return 'bg-gray-50'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between p-2 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          {/* Level filters */}
          {['debug', 'info', 'warn', 'error', 'fatal'].map(level => (
            <button
              key={level}
              onClick={() => toggleLevel(level)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                levelFilter.has(level)
                  ? `${getLevelBgColor(level)} ${getLevelColor(level)}`
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {level.toUpperCase()}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 text-xs rounded ${
              autoScroll ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Auto-scroll
          </button>
          <button
            onClick={clearLogs}
            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 p-2 border-b bg-gray-50">
        <input
          type="text"
          placeholder="Filter by component..."
          value={componentFilter}
          onChange={(e) => setComponentFilter(e.target.value)}
          className="flex-1 px-2 py-1 text-xs border rounded"
        />
        <input
          type="text"
          placeholder="Correlation ID..."
          value={correlationFilter}
          onChange={(e) => setCorrelationFilter(e.target.value)}
          className="px-2 py-1 text-xs border rounded w-32"
        />
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto font-mono text-xs p-2 bg-gray-900">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            No logs matching filter criteria
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div
              key={index}
              className={`mb-1 p-1 rounded hover:bg-gray-800 ${getLevelBgColor(log.level)} bg-opacity-10`}
            >
              <div className="flex items-start gap-2">
                <span className="text-gray-500 whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
                <span className={`font-semibold ${getLevelColor(log.level)} uppercase`}>
                  [{log.level}]
                </span>
                <span className="text-cyan-400">[{log.component}]</span>
                {log.correlationId && (
                  <span className="text-purple-400 text-[10px]">
                    [{log.correlationId}]
                  </span>
                )}
                <span className="text-gray-200 flex-1">{log.message}</span>
              </div>
              
              {/* Metadata */}
              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="ml-12 mt-1 text-gray-400">
                  {Object.entries(log.metadata).map(([key, value]) => (
                    <div key={key} className="inline-block mr-4">
                      <span className="text-gray-500">{key}:</span>{' '}
                      <span className="text-gray-300">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Error details */}
              {log.error && (
                <div className="ml-12 mt-1 text-red-400">
                  <div>Error: {log.error.message}</div>
                  {log.error.stack && (
                    <pre className="text-[10px] text-red-300 mt-1">
                      {log.error.stack}
                    </pre>
                  )}
                </div>
              )}
              
              {/* Stage info */}
              {log.stage && (
                <div className="ml-12 mt-1 text-green-400">
                  Stage: {log.stage} ({log.metadata?.progress}%)
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Status bar */}
      <div className="p-2 border-t bg-gray-50 text-xs text-gray-600">
        Showing {filteredLogs.length} of {logs.length} logs
      </div>
    </div>
  )
}