'use client'

import { useState } from 'react'
import { URLInput } from '@/components/molecules/URLInput'
import { SummaryViewer } from '@/components/organisms/SummaryViewer'
import { Skeleton } from '@/components/atoms/Skeleton'

export default function DemoPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const mockSummary = {
    id: 'demo-1',
    videoTitle: 'How to Build a Successful Startup',
    channelName: 'TechTalks',
    content: `# How to Build a Successful Startup

This video provides comprehensive insights into building a successful startup from the ground up.

## Key Concepts Covered

### 1. Finding Product-Market Fit
The speaker emphasizes the importance of validating your idea before building. They suggest:
- Talking to at least 100 potential customers
- Building a minimal viable product (MVP)
- Iterating based on feedback

### 2. Building the Right Team
Success depends heavily on having the right people:
- Look for complementary skills
- Ensure cultural fit
- Establish clear equity agreements early

### 3. Fundraising Strategy
The video outlines a practical approach to raising capital:
- Bootstrap as long as possible
- Only raise what you need
- Focus on smart money, not just any money

## Action Items
1. Validate your idea with real customers
2. Build an MVP within 3 months
3. Establish key metrics to track progress
4. Network actively in your industry

## Conclusion
Building a successful startup requires persistence, adaptability, and a strong focus on solving real problems for real customers.`,
    keyPoints: [
      'Validate your idea with at least 100 potential customers before building',
      'Focus on finding product-market fit before scaling',
      'Build a strong team with complementary skills',
      'Bootstrap as long as possible and raise money strategically',
      'Track key metrics and iterate based on data'
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const handleSubmit = async (url: string) => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000))
    setIsLoading(false)
    setShowSummary(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900">Sightline.ai Demo</h1>
          <p className="mt-2 text-lg text-gray-600">
            Try out the UI without authentication
          </p>
        </div>

        {/* URL Input */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <URLInput 
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <div className="space-y-2 pt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
              <div className="h-2 w-2 animate-pulse rounded-full bg-primary-600" />
              Processing video...
            </div>
          </div>
        )}

        {/* Summary Display */}
        {showSummary && !isLoading && (
          <SummaryViewer summary={mockSummary} />
        )}

        {/* Info Box */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900">Demo Mode</h3>
          <p className="mt-1 text-sm text-blue-700">
            This is a UI demo. To use the full app, you&apos;ll need to set up:
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-blue-700">
            <li>Google OAuth credentials</li>
            <li>A PostgreSQL database (Neon)</li>
            <li>OpenAI API key</li>
          </ul>
        </div>
      </div>
    </div>
  )
}