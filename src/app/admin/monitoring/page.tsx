'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { PerformanceWidget } from '@/components/monitoring/PerformanceWidget'
import { Activity, AlertTriangle, Users, Zap, DollarSign, TrendingUp, Eye, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminMetrics {
  totalUsers: number
  activeUsers24h: number
  summariesCreated24h: number
  totalSummariesCreated: number
  errorRate24h: number
  averageResponseTime: number
  openaiCosts24h: number
  openaiCostsMonth: number
  planDistribution: {
    FREE: number
    PRO: number
    ENTERPRISE: number
  }
  topErrors: Array<{
    message: string
    count: number
    lastOccurred: string
  }>
  slowestEndpoints: Array<{
    endpoint: string
    averageTime: number
    callCount: number
  }>
}

export default function AdminMonitoringPage() {
  const { user, isLoaded } = useUser()
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')

  // Check if user is admin
  const isAdmin = user?.publicMetadata?.role === 'admin' || 
    user?.emailAddresses?.[0]?.emailAddress?.includes('@sightline.ai') ||
    user?.emailAddresses?.[0]?.emailAddress === 'jma0014@gmail.com'

  useEffect(() => {
    if (!isLoaded) return
    
    if (!isAdmin) {
      setError('Access denied. Admin privileges required.')
      setIsLoading(false)
      return
    }

    // In a real implementation, this would fetch from your monitoring API
    const fetchAdminMetrics = async () => {
      try {
        // Mock data for demonstration
        const mockMetrics: AdminMetrics = {
          totalUsers: 2847,
          activeUsers24h: 234,
          summariesCreated24h: 89,
          totalSummariesCreated: 15420,
          errorRate24h: 0.8,
          averageResponseTime: 1250,
          openaiCosts24h: 45.67,
          openaiCostsMonth: 1234.56,
          planDistribution: {
            FREE: 2456,
            PRO: 378,
            ENTERPRISE: 13
          },
          topErrors: [
            {
              message: 'YouTube transcript not available',
              count: 23,
              lastOccurred: '2 hours ago'
            },
            {
              message: 'OpenAI API rate limit exceeded',
              count: 12,
              lastOccurred: '45 minutes ago'
            },
            {
              message: 'Invalid YouTube URL format',
              count: 8,
              lastOccurred: '1 hour ago'
            }
          ],
          slowestEndpoints: [
            {
              endpoint: 'mutation:summary.create',
              averageTime: 35000,
              callCount: 89
            },
            {
              endpoint: 'mutation:summary.createAnonymous',
              averageTime: 32000,
              callCount: 156
            },
            {
              endpoint: 'query:library.getAll',
              averageTime: 450,
              callCount: 1247
            }
          ]
        }
        
        setMetrics(mockMetrics)
        setIsLoading(false)
      } catch (err) {
        setError('Failed to fetch admin metrics')
        setIsLoading(false)
      }
    }

    fetchAdminMetrics()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAdminMetrics, 30000)
    return () => clearInterval(interval)
  }, [isLoaded, isAdmin])

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">{error || 'Admin privileges required to view this page.'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">No Data Available</h2>
            <p className="text-gray-600">Unable to load monitoring metrics.</p>
          </div>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Monitoring</h1>
              <p className="text-gray-600 mt-2">Real-time system performance and business metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
                className="bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <div className="text-sm text-gray-500">
                Updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.totalUsers)}</p>
                <p className="text-sm text-green-600">+{metrics.activeUsers24h} active today</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Summaries Today</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(metrics.summariesCreated24h)}</p>
                <p className="text-sm text-gray-500">{formatNumber(metrics.totalSummariesCreated)} total</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.averageResponseTime}ms</p>
                <p className={cn(
                  "text-sm",
                  metrics.errorRate24h < 1 ? "text-green-600" : metrics.errorRate24h < 5 ? "text-yellow-600" : "text-red-600"
                )}>
                  {metrics.errorRate24h}% error rate
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">OpenAI Costs</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.openaiCosts24h)}</p>
                <p className="text-sm text-gray-500">{formatCurrency(metrics.openaiCostsMonth)} this month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Plan Distribution</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{formatNumber(metrics.planDistribution.FREE)}</div>
              <div className="text-sm text-gray-600">Free Plan</div>
              <div className="text-xs text-gray-500">
                {((metrics.planDistribution.FREE / metrics.totalUsers) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-900">{formatNumber(metrics.planDistribution.PRO)}</div>
              <div className="text-sm text-blue-600">Pro Plan</div>
              <div className="text-xs text-blue-500">
                {((metrics.planDistribution.PRO / metrics.totalUsers) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-900">{formatNumber(metrics.planDistribution.ENTERPRISE)}</div>
              <div className="text-sm text-purple-600">Enterprise</div>
              <div className="text-xs text-purple-500">
                {((metrics.planDistribution.ENTERPRISE / metrics.totalUsers) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Performance Widget */}
        <PerformanceWidget />

        {/* Error Monitoring & Slow Endpoints */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Errors */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Top Errors (24h)
            </h3>
            <div className="space-y-3">
              {metrics.topErrors.map((error, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-900 truncate">{error.message}</p>
                    <p className="text-xs text-red-600">Last: {error.lastOccurred}</p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {error.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Slowest Endpoints */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-500" />
              Slowest Endpoints (24h)
            </h3>
            <div className="space-y-3">
              {metrics.slowestEndpoints.map((endpoint, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-yellow-900 truncate">{endpoint.endpoint}</p>
                    <p className="text-xs text-yellow-600">{endpoint.callCount} calls</p>
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <p className="text-sm font-bold text-yellow-900">{endpoint.averageTime}ms</p>
                    <p className="text-xs text-yellow-600">avg</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Eye className="w-4 h-4" />
            <span className="text-sm">Monitoring data updates every 30 seconds</span>
          </div>
        </div>
      </div>
    </div>
  )
}