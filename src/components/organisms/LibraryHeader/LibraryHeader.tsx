/**
 * Library header with metrics dashboard and usage progress
 * 
 * @module LibraryHeader
 * @category Components
 */

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export interface LibraryHeaderProps {
  /** Total number of summaries */
  totalCount?: number
  /** Usage statistics */
  usage?: {
    currentMonthUsage: number
    monthlyLimit: number
    isLimitReached: boolean
  }
  /** Custom className */
  className?: string
}

export function LibraryHeader({
  totalCount,
  usage,
  className,
}: LibraryHeaderProps) {
  const router = useRouter()
  
  return (
    <div className={cn(
      "relative bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-gray-100 rounded-2xl mb-8 overflow-hidden",
      className
    )}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03]"></div>
      
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
              Your Knowledge Library
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
              Transform YouTube videos into actionable insights. Build your personal learning repository with AI-powered summaries.
            </p>
          </div>
          
          {/* Learning Metrics Dashboard */}
          <div className="flex items-center gap-8">
            {/* Total Summaries */}
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {totalCount || 0}
              </div>
              <div className="text-sm text-gray-500 font-medium">Summaries</div>
            </div>
            
            {/* Estimated Time Saved */}
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {Math.round((totalCount || 0) * 0.8)}h
              </div>
              <div className="text-sm text-gray-500 font-medium">Time Saved</div>
            </div>
            
            {/* Learning Streak (placeholder) */}
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                7
              </div>
              <div className="text-sm text-gray-500 font-medium">Day Streak</div>
            </div>
          </div>
        </div>
        
        {/* Usage Progress Bar (Enhanced) */}
        {usage && usage.monthlyLimit > 0 && (
          <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Monthly Usage</span>
                </div>
                <span className="text-sm text-gray-500">
                  {usage.currentMonthUsage} of {usage.monthlyLimit} summaries
                </span>
              </div>
              
              {usage.isLimitReached && (
                <button 
                  onClick={() => router.push('/billing')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-200"
                >
                  <span>Upgrade Plan</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-500 ease-out",
                  usage.isLimitReached 
                    ? "bg-gradient-to-r from-amber-500 to-orange-500" 
                    : "bg-gradient-to-r from-blue-500 to-indigo-500"
                )}
                style={{
                  width: `${Math.min((usage.currentMonthUsage / usage.monthlyLimit) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}