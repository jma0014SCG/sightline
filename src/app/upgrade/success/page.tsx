'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2, Home, FileText } from 'lucide-react'
import Link from 'next/link'

export default function UpgradeSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isProcessing, setIsProcessing] = useState(true)
  
  useEffect(() => {
    // Simulate processing time for webhook to complete
    const timer = setTimeout(() => {
      setIsProcessing(false)
      
      // Clear any localStorage counts to stop nagging
      if (typeof window !== 'undefined') {
        // Reset anonymous usage tracking
        localStorage.removeItem('sl_free_used')
        localStorage.removeItem('hasUsedFreeSummary')
        localStorage.removeItem('freeSummaryUsedAt')
      }
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [])
  
  const sessionId = searchParams.get('session_id')
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {isProcessing ? (
          <>
            {/* Processing State */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Loader2 className="h-16 w-16 text-primary-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 bg-primary-100 rounded-full" />
                  </div>
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Processing Your Upgrade
              </h1>
              
              <p className="text-gray-600 mb-6">
                We're activating your new plan. This usually takes just a moment...
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2" />
                  Setting up your account
                </div>
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2" />
                  Activating premium features
                </div>
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2" />
                  Updating your limits
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to Pro! 🎉
              </h1>
              
              <p className="text-gray-600 mb-8">
                Your upgrade was successful. You now have access to all Pro features.
              </p>
              
              {/* What's Included */}
              <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">
                  What's included in your plan:
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>25 video summaries per month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Advanced AI summarization</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Export to PDF & Markdown</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                >
                  <Home className="h-5 w-5 mr-2" />
                  Start Summarizing
                </Link>
                
                <Link
                  href="/library"
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-5 w-5 mr-2" />
                  View Your Library
                </Link>
              </div>
              
              {/* Session ID for debugging */}
              {sessionId && (
                <p className="mt-6 text-xs text-gray-400">
                  Session: {sessionId.substring(0, 20)}...
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}