import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/permissions-server'
import { ActivityLogClient } from './activity-log-client'
import { getActivityLogs, getActivityLogUsers } from './actions'

export default async function ActivityLogPage() {
  const profile = await getUserProfile()

  // Redirect if not authenticated
  if (!profile) {
    redirect('/login')
  }

  // Fetch initial data with default filters
  const defaultFilters = {
    actionType: 'all',
    entityType: 'all',
    userId: 'all',
    dateRange: 'last7' as const,
  }

  const [logsResult, users] = await Promise.all([
    getActivityLogs(defaultFilters, 1, 25),
    getActivityLogUsers(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Activity Log</h2>
        <p className="text-muted-foreground">
          View system activity and user actions
        </p>
      </div>

      <ActivityLogClient
        initialLogs={logsResult.logs}
        initialTotal={logsResult.total}
        users={users}
        userProfile={profile}
      />
    </div>
  )
}
