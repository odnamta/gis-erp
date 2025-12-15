import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { OpsDashboard } from '@/components/dashboard/ops'
import {
  fetchDashboardKPIs,
  fetchBudgetAlerts,
  fetchExceededBudgetCount,
  fetchRecentActivity,
  fetchOperationsQueue,
  fetchManagerMetrics,
} from './actions'
import { getUserProfile } from '@/lib/permissions-server'
import { getOpsDashboardData } from '@/lib/ops-dashboard-utils'

export default async function DashboardPage() {
  // Get user profile for role-based rendering
  const profile = await getUserProfile()
  const userRole = profile?.role || 'viewer'

  // Render ops-specific dashboard for ops users
  if (userRole === 'ops') {
    const opsData = await getOpsDashboardData()
    return (
      <OpsDashboard 
        data={opsData} 
        userName={profile?.full_name || undefined} 
      />
    )
  }

  // Fetch all data in parallel for other roles
  const [kpis, alerts, alertCount, activities, queue, metrics] = await Promise.all([
    fetchDashboardKPIs(),
    fetchBudgetAlerts(),
    fetchExceededBudgetCount(),
    fetchRecentActivity(),
    fetchOperationsQueue(),
    fetchManagerMetrics(),
  ])

  return (
    <DashboardClient
      initialKPIs={kpis}
      initialAlerts={alerts}
      initialAlertCount={alertCount}
      initialActivities={activities}
      initialQueue={queue}
      initialMetrics={metrics}
      userRole={userRole}
    />
  )
}
