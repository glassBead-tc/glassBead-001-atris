'use client'

import { useEffect } from 'react'

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Chat error:', error)
  }, [error])

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Chat Error
        </h2>
        <p className="text-red-600 dark:text-red-300 mb-4">
          {error.message || 'Failed to load chat. Please try again.'}
        </p>
        <button
          onClick={reset}
          className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 px-4 py-2 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
