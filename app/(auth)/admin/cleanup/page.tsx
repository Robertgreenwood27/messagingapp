// app/(auth)/admin/cleanup/page.tsx
import { CleanupStats } from '@/components/admin/cleanup-stats'
import { CleanupLogs } from '@/components/admin/cleanup-logs'
import { TriggerCleanup } from '@/components/admin/trigger-cleanup'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function CleanupDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Message Cleanup Dashboard</h1>
        <TriggerCleanup />
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cleanup Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <CleanupStats />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Cleanup Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <CleanupLogs />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}