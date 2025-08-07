'use client'

import { useEffect, useState } from 'react'
import { Activity, Zap, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WebVitalMetric {
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  threshold: number
  unit: string
  description: string
}

interface PerformanceData {
  webVitals: WebVitalMetric[]
  apiMetrics: {
    averageResponseTime: number
    errorRate: number
    totalRequests: number
    slowRequests: number
  }
  businessMetrics: {
    summariesCreated: number
    averageCreationTime: number
    aiProcessingTime: number
    transcriptFetchTime: number
  }
  lastUpdated: Date
}

const getWebVitalColor = (rating: string) => {
  switch (rating) {
    case 'good':
      return 'text-green-600 border-green-200 bg-green-50'
    case 'needs-improvement':
      return 'text-yellow-600 border-yellow-200 bg-yellow-50'
    case 'poor':
      return 'text-red-600 border-red-200 bg-red-50'
    default:
      return 'text-gray-600 border-gray-200 bg-gray-50'
  }
}

const getWebVitalIcon = (rating: string) => {
  switch (rating) {
    case 'good':
      return <CheckCircle className="w-4 h-4" />
    case 'needs-improvement':
      return <AlertTriangle className="w-4 h-4" />
    case 'poor':
      return <XCircle className="w-4 h-4" />
    default:
      return <Activity className="w-4 h-4" />
  }
}

const formatMetricValue = (value: number, unit: string) => {
  if (unit === 'ms') {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}s`
    }
    return `${Math.round(value)}ms`
  }
  if (unit === 'score') {
    return value.toFixed(3)
  }
  return value.toString()
}

const getProgressValue = (value: number, threshold: number) => {
  return Math.min((value / threshold) * 100, 100)
}

export function PerformanceWidget() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // In a real implementation, this would fetch from your monitoring API
    // For now, we'll simulate performance data
    const fetchPerformanceData = () => {
      try {
        // Simulate real-time Web Vitals data
        const mockWebVitals: WebVitalMetric[] = [
          {
            name: 'LCP',
            value: 2100,
            rating: 'good',
            threshold: 2500,
            unit: 'ms',
            description: 'Largest Contentful Paint',
          },
          {
            name: 'FID',
            value: 85,
            rating: 'good',
            threshold: 100,
            unit: 'ms',
            description: 'First Input Delay',
          },
          {
            name: 'CLS',
            value: 0.08,
            rating: 'good',
            threshold: 0.1,
            unit: 'score',
            description: 'Cumulative Layout Shift',
          },
          {
            name: 'FCP',
            value: 1650,
            rating: 'good',
            threshold: 1800,
            unit: 'ms',
            description: 'First Contentful Paint',
          },
          {
            name: 'TTFB',
            value: 320,
            rating: 'good',
            threshold: 800,
            unit: 'ms',
            description: 'Time to First Byte',
          },
        ]

        const mockData: PerformanceData = {
          webVitals: mockWebVitals,
          apiMetrics: {
            averageResponseTime: 245,
            errorRate: 0.3,
            totalRequests: 1247,
            slowRequests: 12,
          },
          businessMetrics: {
            summariesCreated: 34,
            averageCreationTime: 38000,
            aiProcessingTime: 12000,
            transcriptFetchTime: 4500,
          },
          lastUpdated: new Date(),
        }

        setPerformanceData(mockData)
        setIsLoading(false)
      } catch (err) {
        setError('Failed to load performance data')
        setIsLoading(false)
      }
    }

    fetchPerformanceData()
    
    // Update every 30 seconds
    const interval = setInterval(fetchPerformanceData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Performance Monitor
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Performance Monitor
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-32 text-red-600">
            <XCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        </div>
      </div>
    )
  }

  if (!performanceData) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Core Web Vitals */}
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Core Web Vitals
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Real user performance metrics from the field
          </p>
        </div>
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {performanceData.webVitals.map((metric) => (
              <div
                key={metric.name}
                className={`p-4 rounded-lg border ${getWebVitalColor(metric.rating)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getWebVitalIcon(metric.rating)}
                    <span className="font-semibold">{metric.name}</span>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-1 text-xs rounded-full font-medium",
                      metric.rating === 'good' 
                        ? "bg-green-100 text-green-800" 
                        : metric.rating === 'needs-improvement'
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    )}
                  >
                    {metric.rating.replace('-', ' ')}
                  </span>
                </div>
                <div className="mb-2">
                  <div className="text-2xl font-bold">
                    {formatMetricValue(metric.value, metric.unit)}
                  </div>
                  <div className="text-sm opacity-75">
                    Target: {formatMetricValue(metric.threshold, metric.unit)}
                  </div>
                </div>
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        metric.rating === 'good' ? "bg-green-500" :
                        metric.rating === 'needs-improvement' ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{
                        width: `${Math.min(getProgressValue(metric.value, metric.threshold), 100)}%`
                      }}
                    />
                  </div>
                </div>
                <div className="text-xs opacity-75">{metric.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Performance */}
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            API Performance
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Backend API response times and error rates
          </p>
        </div>
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
              <div className="text-sm font-medium text-blue-800 mb-1">
                Avg Response Time
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {performanceData.apiMetrics.averageResponseTime}ms
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-green-50 border-green-200">
              <div className="text-sm font-medium text-green-800 mb-1">
                Success Rate
              </div>
              <div className="text-2xl font-bold text-green-900">
                {(100 - performanceData.apiMetrics.errorRate).toFixed(1)}%
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
              <div className="text-sm font-medium text-purple-800 mb-1">
                Total Requests
              </div>
              <div className="text-2xl font-bold text-purple-900">
                {performanceData.apiMetrics.totalRequests.toLocaleString()}
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
              <div className="text-sm font-medium text-orange-800 mb-1">
                Slow Requests
              </div>
              <div className="text-2xl font-bold text-orange-900">
                {performanceData.apiMetrics.slowRequests}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Metrics */}
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Business Metrics
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Key business performance indicators
          </p>
        </div>
        <div className="p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-lg border bg-indigo-50 border-indigo-200">
              <div className="text-sm font-medium text-indigo-800 mb-1">
                Summaries Created
              </div>
              <div className="text-2xl font-bold text-indigo-900">
                {performanceData.businessMetrics.summariesCreated}
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-cyan-50 border-cyan-200">
              <div className="text-sm font-medium text-cyan-800 mb-1">
                Avg Creation Time
              </div>
              <div className="text-2xl font-bold text-cyan-900">
                {Math.round(performanceData.businessMetrics.averageCreationTime / 1000)}s
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-pink-50 border-pink-200">
              <div className="text-sm font-medium text-pink-800 mb-1">
                AI Processing
              </div>
              <div className="text-2xl font-bold text-pink-900">
                {Math.round(performanceData.businessMetrics.aiProcessingTime / 1000)}s
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-emerald-50 border-emerald-200">
              <div className="text-sm font-medium text-emerald-800 mb-1">
                Transcript Fetch
              </div>
              <div className="text-2xl font-bold text-emerald-900">
                {Math.round(performanceData.businessMetrics.transcriptFetchTime / 1000)}s
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {performanceData.lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  )
}