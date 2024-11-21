// components/admin/cleanup-logs.tsx
"use client"
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function CleanupLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setLogs(data)
      }
      
      setLoading(false)
    }

    fetchLogs()

    // Set up real-time subscription for new logs
    const supabase = createClient()
    const subscription = supabase
      .channel('cleanup_logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cleanup_logs'
      }, (payload) => {
        setLogs(current => [payload.new, ...current.slice(0, 9)])
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return <div>Loading logs...</div>
  }

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-muted">
          <tr>
            <th className="px-6 py-3">Time</th>
            <th className="px-6 py-3">Messages Deleted</th>
            <th className="px-6 py-3">Duration</th>
            <th className="px-6 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log: any) => (
            <tr key={log.id} className="border-b">
              <td className="px-6 py-4">
                {new Date(log.executed_at).toLocaleString()}
              </td>
              <td className="px-6 py-4">{log.messages_deleted}</td>
              <td className="px-6 py-4">{log.duration_ms}ms</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  log.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {log.error ? 'Failed' : 'Success'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}