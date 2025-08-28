'use client'

import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { SummaryViewer, SummaryViewerImproved } from '@/components/organisms/SummaryViewer'
import { SummaryHeader, SummaryHeaderCompact } from '@/components/molecules/SummaryHeader'
import { api } from '@/components/providers/TRPCProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { useFeatureFlag } from '@/lib/feature-flags'

export default function SummaryPage() {
  const params = useParams()
  const router = useRouter()
  const { showError, showSuccess } = useToast()
  const id = params.id as string
  
  // Feature flag for improved layout
  const useImprovedLayout = useFeatureFlag('improvedSummaryLayout')

  // Poll for tags every 3 seconds if they're not loaded yet
  // Stop polling after 30 seconds or when tags are found
  const { data: summary, isLoading } = api.summary.getById.useQuery(
    { id },
    {
      // Refetch every 3 seconds if no tags/categories yet
      refetchInterval: (data) => {
        // Stop polling if we have tags/categories or after 30 seconds
        if (!data) return 3000 // Keep polling while loading
        
        const hasTags = data?.tags && data.tags.length > 0
        const hasCategories = data?.categories && data.categories.length > 0
        
        // Stop polling if we have tags/categories
        if (hasTags || hasCategories) {
          return false // Stop polling
        }
        
        // Continue polling for up to 30 seconds
        const createdAt = data?.createdAt ? new Date(data.createdAt).getTime() : Date.now()
        const now = Date.now()
        const elapsedSeconds = (now - createdAt) / 1000
        
        if (elapsedSeconds > 30) {
          return false // Stop polling after 30 seconds
        }
        
        return 3000 // Poll every 3 seconds
      },
      // Keep data fresh
      refetchOnWindowFocus: true,
    }
  )
  const deleteMutation = api.summary.delete.useMutation({
    onSuccess: () => {
      showSuccess('Summary deleted successfully')
      router.push('/library')
    },
    onError: () => {
      showError('Failed to delete summary')
    }
  })

  const handleTagClick = (tagName: string) => {
    // Navigate to library with tag filter
    router.push(`/library?tag=${encodeURIComponent(tagName)}`)
  }

  const handleCategoryClick = (categoryName: string) => {
    // Navigate to library with category filter
    router.push(`/library?category=${encodeURIComponent(categoryName)}`)
  }

  const handleEdit = () => {
    router.push(`/library/${id}/edit`)
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this summary?')) {
      await deleteMutation.mutateAsync({ id })
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Summary not found</h2>
        <p className="mt-2 text-gray-600">This summary may have been deleted.</p>
        <button
          onClick={() => router.push('/library')}
          className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Back to Library
        </button>
      </div>
    )
  }

  // Use improved layout if feature flag is enabled
  if (useImprovedLayout) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Compact Header without duplication */}
        <SummaryHeaderCompact
          summary={summary as any}
          onBack={() => router.push('/library')}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Improved Summary Content with new layout */}
        <SummaryViewerImproved summary={summary as any} />
      </div>
    )
  }

  // Original layout (fallback)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Tags and Categories */}
      <SummaryHeader
        summary={summary}
        onBack={() => router.push('/library')}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTagClick={handleTagClick}
        onCategoryClick={handleCategoryClick}
      />

      {/* Summary Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <SummaryViewer summary={summary as any} />
      </main>
    </div>
  )
}