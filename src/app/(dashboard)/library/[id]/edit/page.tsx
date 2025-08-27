'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { api } from '@/lib/api/trpc'

export default function EditSummaryPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [content, setContent] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  const { data: summary, isLoading } = api.summary.getById.useQuery({ id })

  // Update content when summary loads
  if (summary && content !== summary.content && !hasChanges) {
    setContent(summary.content)
  }

  const updateSummary = api.summary.update.useMutation({
    onSuccess: () => {
      setHasChanges(false)
      router.push(`/library/${id}`)
    },
    onError: (error) => {
      console.error('Failed to update summary:', error)
    },
  })

  const handleContentChange = (value: string) => {
    setContent(value)
    setHasChanges(value !== summary?.content)
  }

  const handleSave = async () => {
    if (!hasChanges || !summary) return
    
    try {
      await updateSummary.mutateAsync({
        id: summary.id,
        content,
      })
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  const handleBack = () => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?')
      if (!confirmed) return
    }
    router.push(`/library/${id}`)
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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Summary
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Summary</h1>
            <p className="text-sm text-gray-500">{summary.videoTitle}</p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges || updateSummary.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {updateSummary.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {updateSummary.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Video Info */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-4">
          {summary.thumbnailUrl && (
            <Image
              src={summary.thumbnailUrl}
              alt={summary.videoTitle}
              width={160}
              height={96}
              className="h-24 w-40 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900">{summary.videoTitle}</h3>
            <p className="text-sm text-gray-600">{summary.channelName}</p>
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span>{Math.floor(summary.duration / 60)}:{(summary.duration % 60).toString().padStart(2, '0')}</span>
              <span>{new Date(summary.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Summary Content</h2>
            {hasChanges && (
              <span className="text-sm text-amber-600">Unsaved changes</span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Edit your summary content below. Supports Markdown formatting.
          </p>
        </div>
        
        <div className="p-4">
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-[400px] w-full resize-none border-0 p-0 text-sm leading-relaxed text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0"
            placeholder="Enter your summary content here..."
          />
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 text-sm text-gray-500">
        <p>
          <strong>Tip:</strong> You can use Markdown formatting like **bold**, *italic*, 
          # headings, and - bullet points to structure your summary.
        </p>
      </div>
    </div>
  )
}