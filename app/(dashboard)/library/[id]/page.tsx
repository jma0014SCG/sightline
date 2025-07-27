'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { SummaryViewer } from '@/components/organisms/SummaryViewer'
import { api } from '@/components/providers/TRPCProvider'

export default function SummaryPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: summary, isLoading } = api.summary.getById.useQuery({ id })

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="text-center">
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/library')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Library
        </button>
      </div>

      {/* Summary viewer */}
      <SummaryViewer summary={summary} />
    </div>
  )
}