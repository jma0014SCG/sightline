'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Something went wrong!</h2>
        <p className="mt-2 text-gray-600">An unexpected error occurred.</p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}