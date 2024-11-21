// components/admin/trigger-cleanup.tsx
"use client"
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function TriggerCleanup() {
  const [isLoading, setIsLoading] = useState(false)

  const triggerCleanup = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CLEANUP_SECRET_KEY}`
        }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Cleanup failed')
      }

      alert(`Cleanup completed successfully`)
    } catch (error) {
      console.error('Cleanup error:', error)
      alert('Cleanup failed. Check console for details.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={triggerCleanup} 
      disabled={isLoading}
      className="w-32"
    >
      {isLoading ? 'Running...' : 'Run Cleanup'}
    </Button>
  )
}