'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard/error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <p className="text-sm font-medium text-white/60 mb-1">Algo salió mal</p>
      <p className="text-xs text-gray-600 mb-5 max-w-xs">{error.message}</p>
      <button
        onClick={reset}
        className="text-xs text-violet-400 hover:text-violet-300 transition-colors border border-violet-500/20 rounded-lg px-4 py-2"
      >
        Reintentar
      </button>
    </div>
  )
}
