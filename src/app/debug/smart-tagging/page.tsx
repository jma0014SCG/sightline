'use client'

import { useState, useEffect } from 'react'
import { getSmartTaggingStatus, testOpenAIConnection, testClassificationService } from '@/app/actions/smart-tagging-debug'
import { RefreshCw, Database, Bot, Tag, Grid, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface SmartTaggingData {
  summary: {
    totalTags: number
    totalCategories: number
    recentSummariesCount: number
    unclassifiedCount: number
  }
  recentSummaries: Array<{
    id: string
    title: string
    createdAt: string
    userId: string
    tags: string[]
    tagTypes: string[]
    categories: string[]
  }>
  allTags: Array<{
    id: string
    name: string
    type: string
    createdAt: string
    usageCount: number
  }>
  allCategories: Array<{
    id: string
    name: string
    createdAt: string
    usageCount: number
  }>
  unclassifiedSummaries: Array<{
    id: string
    title: string
    createdAt: string
  }>
}

interface OpenAITestData {
  model: string
  response: string
  usage: any
}

export default function SmartTaggingDebugPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<SmartTaggingData | null>(null)
  const [openaiData, setOpenaiData] = useState<OpenAITestData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openaiError, setOpenaiError] = useState<string | null>(null)
  const [testingClassification, setTestingClassification] = useState(false)
  const [classificationTestResult, setClassificationTestResult] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    setOpenaiError(null)

    try {
      // Test database connection and get smart tagging data
      const dbResult = await getSmartTaggingStatus()
      if (dbResult.success) {
        setData(dbResult.data)
      } else {
        setError(dbResult.error || 'Failed to load database data')
      }

      // Test OpenAI connection
      const openaiResult = await testOpenAIConnection()
      if (openaiResult.success) {
        setOpenaiData(openaiResult.data)
      } else {
        setOpenaiError(openaiResult.error || 'Failed to test OpenAI connection')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  const testClassification = async () => {
    setTestingClassification(true)
    setClassificationTestResult(null)
    
    try {
      const result = await testClassificationService()
      setClassificationTestResult(result)
      
      // Reload data to see if the test created any tags/categories
      if (result.success) {
        setTimeout(() => {
          loadData()
        }, 2000)
      }
    } catch (error) {
      setClassificationTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setTestingClassification(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getTagColor = (type: string) => {
    switch (type) {
      case 'PERSON': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'COMPANY': return 'bg-green-100 text-green-700 border-green-200'
      case 'TECHNOLOGY': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'PRODUCT': return 'bg-pink-100 text-pink-700 border-pink-200'
      case 'CONCEPT': return 'bg-indigo-100 text-indigo-700 border-indigo-200'
      case 'FRAMEWORK': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'TOOL': return 'bg-teal-100 text-teal-700 border-teal-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Smart Tagging Debug</h1>
            <p className="text-gray-600 mt-2">Diagnostic information for AI-powered tagging system</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={testClassification}
              disabled={testingClassification}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Bot className={`h-4 w-4 ${testingClassification ? 'animate-pulse' : ''}`} />
              {testingClassification ? 'Testing...' : 'Test Classification'}
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Database Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold">Database Status</h3>
            </div>
            {error ? (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">Connection Failed</span>
              </div>
            ) : data ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Loading...</div>
            )}
          </div>

          {/* OpenAI Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bot className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold">OpenAI Status</h3>
            </div>
            {openaiError ? (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">API Failed</span>
              </div>
            ) : openaiData ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Loading...</div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Tag className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-semibold">Classification Stats</h3>
            </div>
            {data ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tags:</span>
                  <span className="font-medium">{data.summary.totalTags}</span>
                </div>
                <div className="flex justify-between">
                  <span>Categories:</span>
                  <span className="font-medium">{data.summary.totalCategories}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unclassified:</span>
                  <span className={`font-medium ${data.summary.unclassifiedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {data.summary.unclassifiedCount}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Loading...</div>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h4 className="font-medium text-red-800">Database Error</h4>
            </div>
            <p className="text-red-700 mt-2 text-sm">{error}</p>
          </div>
        )}

        {openaiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h4 className="font-medium text-red-800">OpenAI API Error</h4>
            </div>
            <p className="text-red-700 mt-2 text-sm">{openaiError}</p>
          </div>
        )}

        {/* Classification Test Results */}
        {classificationTestResult && (
          <div className={`rounded-lg shadow p-6 mb-6 ${classificationTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <h3 className="text-lg font-semibold mb-4">Classification Test Results</h3>
            {classificationTestResult.success ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Classification test completed successfully!</span>
                </div>
                {classificationTestResult.data?.result ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Categories:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {classificationTestResult.data.result.categories?.map((category: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {classificationTestResult.data.result.tags?.map((tag: any, idx: number) => (
                          <span key={idx} className={`px-2 py-1 text-xs rounded-full ${getTagColor(tag.type)}`}>
                            {tag.name} ({tag.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-yellow-700">Classification returned null - check console for details</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                <span>{classificationTestResult.error}</span>
              </div>
            )}
          </div>
        )}

        {/* OpenAI Test Results */}
        {openaiData && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">OpenAI Connection Test</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Model:</span>
                <p className="text-gray-900">{openaiData.model}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Response:</span>
                <p className="text-gray-900">{openaiData.response}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Tokens Used:</span>
                <p className="text-gray-900">{openaiData.usage?.total_tokens || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {data && (
          <>
            {/* Available Tags */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Available Tags ({data.allTags.length})</h3>
              {data.allTags.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.allTags.map((tag) => (
                    <div key={tag.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTagColor(tag.type)}`}>
                          {tag.name}
                        </span>
                        <span className="text-xs text-gray-500">({tag.type})</span>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{tag.usageCount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No tags found</p>
              )}
            </div>

            {/* Available Categories */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Available Categories ({data.allCategories.length})</h3>
              {data.allCategories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.allCategories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{category.usageCount}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No categories found</p>
              )}
            </div>

            {/* Recent Summaries */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Recent Summaries (Last 7 Days)</h3>
              {data.recentSummaries.length > 0 ? (
                <div className="space-y-4">
                  {data.recentSummaries.map((summary) => (
                    <div key={summary.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-gray-900 flex-1">{summary.title}</h4>
                        <span className="text-xs text-gray-500 ml-4">
                          {new Date(summary.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {summary.categories.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-gray-700">Categories:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {summary.categories.map((category, idx) => (
                                <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                                  {category}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {summary.tags.length > 0 && (
                          <div>
                            <span className="text-xs font-medium text-gray-700">Tags:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {summary.tags.map((tag, idx) => (
                                <span key={idx} className={`px-2 py-1 text-xs rounded-full ${getTagColor(summary.tagTypes[idx] || 'DEFAULT')}`}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {summary.tags.length === 0 && summary.categories.length === 0 && (
                          <div className="text-red-600 text-sm">⚠️ No classifications found</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent summaries found</p>
              )}
            </div>

            {/* Unclassified Summaries */}
            {data.unclassifiedSummaries.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-yellow-800">
                  Unclassified Summaries ({data.unclassifiedSummaries.length})
                </h3>
                <div className="space-y-3">
                  {data.unclassifiedSummaries.map((summary) => (
                    <div key={summary.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <span className="font-medium text-gray-900">{summary.title}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(summary.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}