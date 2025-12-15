import { DashboardClient } from '@/components/dashboard/dashboard-client'
import {
  fetchDashboardKPIs,
  fetchBudgetAlerts,
  fetchExceededBudgetCount,
  fetchRecentActivity,
  fetchOperationsQueue,
  fetchManagerMetrics,
} from './actions'

export default async function DashboardPage() {
  // Fetch all data in parallel
  const [kpis, alerts, alertCount, activities, queue, metrics] = await Promise.all([
    fetchDashboardKPIs(),
    fetchBudgetAlerts(),
    fetchExceededBudgetCount(),
    fetchRecentActivity(),
    fetchOperationsQueue(),
    fetchManagerMetrics(),
  ])

  // TODO: Get user role from auth context for role-based rendering
  const userRole = 'admin' // Placeholder - will be replaced with actual auth

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
