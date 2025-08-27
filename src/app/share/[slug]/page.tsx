'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { SummaryViewer } from '@/components/organisms/SummaryViewer'
import { Skeleton } from '@/components/atoms/Skeleton'
import { api } from '@/lib/api/trpc'
import { Share2, Eye, ExternalLink, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function SharedSummaryPage() {
  const params = useParams()
  const slug = params.slug as string
  const [copied, setCopied] = useState(false)

  const { data: sharedSummary, isLoading, error } = api.share.getBySlug.useQuery(
    { slug },
    { 
      enabled: !!slug,
      retry: false, // Don't retry on 404s
    }
  )

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg bg-white p-6 shadow-sm">
                <Skeleton className="h-6 w-1/4 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    const is404 = error.data?.code === 'NOT_FOUND'
    const isExpired = error.data?.code === 'BAD_REQUEST' && error.message.includes('expired')
    const isPrivate = error.data?.code === 'FORBIDDEN'

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-3">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {is404 && 'Summary Not Found'}
              {isExpired && 'Link Expired'}
              {isPrivate && 'Private Summary'}
              {!is404 && !isExpired && !isPrivate && 'Access Denied'}
            </h1>
            
            <p className="text-gray-600 mb-6">
              {is404 && 'This shared summary could not be found. It may have been deleted or the link is incorrect.'}
              {isExpired && 'This shared link has expired and is no longer accessible.'}
              {isPrivate && 'This summary is private and cannot be viewed publicly.'}
              {!is404 && !isExpired && !isPrivate && 'You do not have permission to view this summary.'}
            </p>
            
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Visit Sightline
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!sharedSummary) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold">
                <ExternalLink className="h-5 w-5" />
                Sightline
              </Link>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Share2 className="h-4 w-4" />
                Shared Summary
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Eye className="h-4 w-4" />
                {sharedSummary.views} {sharedSummary.views === 1 ? 'view' : 'views'}
              </div>
              
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Share2 className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Author info */}
      {sharedSummary.summary.author && (
        <div className="bg-blue-50 border-b border-blue-100">
          <div className="mx-auto max-w-4xl px-4 py-3">
            <div className="flex items-center gap-3">
              {sharedSummary.summary.author.image && (
                <Image
                  src={sharedSummary.summary.author.image}
                  alt={sharedSummary.summary.author.name || 'User avatar'}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div className="text-sm">
                <span className="text-blue-800">
                  Shared by {sharedSummary.summary.author.name || 'Anonymous'}
                </span>
                <span className="text-blue-600 ml-2">
                  • {new Date(sharedSummary.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary content */}
      <main className="py-8">
        <SummaryViewer
          summary={{
            id: sharedSummary.summary.id,
            videoTitle: sharedSummary.summary.videoTitle,
            channelName: sharedSummary.summary.channelName,
            content: sharedSummary.summary.content,
            keyPoints: sharedSummary.summary.keyPoints,
            duration: sharedSummary.summary.duration,
            thumbnailUrl: sharedSummary.summary.thumbnailUrl,
            createdAt: sharedSummary.summary.createdAt,
            metadata: sharedSummary.summary.metadata,
          }}
          className="bg-gray-50"
        />
      </main>

      {/* Footer CTA */}
      <footer className="bg-white border-t border-gray-200">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Create your own AI summaries
            </h3>
            <p className="text-gray-600 mb-4">
              Turn any YouTube video into structured insights, key moments, and learning materials.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Get Started Free
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}