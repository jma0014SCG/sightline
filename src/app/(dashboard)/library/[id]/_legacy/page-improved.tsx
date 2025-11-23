'use client'

import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { SummaryViewer } from '@/components/organisms/SummaryViewer'
import { SummaryViewerImproved } from '@/components/organisms/SummaryViewer/SummaryViewerImproved'
import { SummaryHeader } from '@/components/molecules/SummaryHeader'
import { SummaryHeaderCompact } from '@/components/molecules/SummaryHeader/SummaryHeaderCompact'
import { api } from '@/components/providers/TRPCProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { useFeatureFlag } from '@/lib/feature-flags'

export default function ImprovedSummaryPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = params.id as string
  
  // Feature flag to control which layout to use
  const useImprovedLayout = useFeatureFlag('improvedSummaryLayout')

  const { data: summary, isLoading } = api.summary.getById.useQuery({ id })
  const deleteMutation = api.summary.delete.useMutation({
    onSuccess: () => {
      toast.success('Summary deleted successfully')
      router.push('/library')
    },
    onError: () => {
      toast.error('Failed to delete summary')
    }
  })

  const handleTagClick = (tagName: string) => {
    router.push(`/library?tag=${encodeURIComponent(tagName)}`)
  }

  const handleCategoryClick = (categoryName: string) => {
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
          summary={summary}
          onBack={() => router.push('/library')}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Improved Summary Content with new layout */}
        <SummaryViewerImproved summary={summary} />
      </div>
    )
  }

  // Fall back to original layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Original Header with Tags and Categories */}
      <SummaryHeader
        summary={summary}
        onBack={() => router.push('/library')}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTagClick={handleTagClick}
        onCategoryClick={handleCategoryClick}
      />

      {/* Original Summary Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <SummaryViewer summary={summary} />
      </main>
    </div>
  )
}