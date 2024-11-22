// components/error-boundary.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function ErrorBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

export function ErrorBoundaryHandler({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <Card className="p-6 m-4 max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-4">Something went wrong</h2>
      <div className="mb-4 text-muted-foreground">
        {error.message || 'An unexpected error occurred'}
      </div>
      <div className="flex gap-4">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    </Card>
  )
}