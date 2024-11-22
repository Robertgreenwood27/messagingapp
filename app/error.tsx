// app/error.tsx
'use client'

import { ErrorBoundaryHandler } from '@/components/error-boundary'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <ErrorBoundaryHandler error={error} reset={reset} />
}