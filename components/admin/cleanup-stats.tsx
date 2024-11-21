// components/admin/cleanup-stats.tsx
"use client"
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'

export function CleanupStats() {
  const [stats, setStats] = useState({
    totalMessagesDeleted: 0,
    averageDuration: 0,
    lastCleanup: null,
    errorRate: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('messages_deleted, duration_ms, error, executed_at')
        .order('executed_at', { ascending: false })
        .limit(100)

      if (!error && data) {
        const totalMessages = data.reduce((sum, log) => sum + log.messages_deleted, 0)
        const avgDuration = data.reduce((sum, log) => sum + log.duration_ms, 0) / data.length
        const errorCount = data.filter(log => log.error).length
        const errorRate = (errorCount / data.length) * 100

        setStats({
          totalMessagesDeleted: totalMessages,
          averageDuration: avgDuration,
          lastCleanup: data[0]?.executed_at,
          errorRate
        })
      }
      
      setLoading(false)
    }

    fetchStats()
  }, [])

  if (loading) {
    return <div>Loading statistics...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.totalMessagesDeleted}</div>
          <div className="text-sm text-muted-foreground">Messages Deleted</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{Math.round(stats.averageDuration)}ms</div>
          <div className="text-sm text-muted-foreground">Average Duration</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">
            {stats.lastCleanup ? new Date(stats.lastCleanup).toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-sm text-muted-foreground">Last Cleanup</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.errorRate.toFixed(1)}%</div>
          <div className="text-sm text-muted-foreground">Error Rate</div>
        </CardContent>
      </Card>
    </div>
  )
}