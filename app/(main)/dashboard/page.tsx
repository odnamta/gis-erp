import { DashboardSelector } from '@/components/dashboard/dashboard-selector'
import {
  fetchDashboardKPIs,
  fetchBudgetAlerts,
  fetchExceededBudgetCount,
  fetchRecentActivity,
  fetchOperationsQueue,
  fetchManagerMetrics,
  fetchFinanceDashboardData,
  fetchSalesDashboardData,
  fetchManagerDashboardData,
  fetchAdminDashboardData,
} from './actions'
import { getSalesEngineeringDashboardData } from './sales-engineering-actions'
import { getUserProfile } from '@/lib/permissions-server'
import { getOpsDashboardData } from '@/lib/ops-dashboard-utils'
import { getEnhancedOpsDashboardData } from '@/lib/ops-dashboard-enhanced-utils'
import { getUserOnboardingProgress } from '@/lib/onboarding-actions'
import { fetchCachedOwnerDashboardData } from '@/lib/dashboard-cache-actions'

// Hutami's email - Marketing Manager who also manages Engineering
const HUTAMI_EMAIL = 'hutamiarini@gama-group.co'

export default async function DashboardPage() {
  // Get user profile for role-based rendering
  const profile = await getUserProfile()
  const userRole = profile?.role || 'viewer'
  const userEmail = profile?.email || ''
  const userId = profile?.id || ''

  // Fetch onboarding data for all users
  const onboardingData = userId ? await getUserOnboardingProgress(userId) : null

  // For owner users, use optimized cached data fetching
  // Priority: Owner KPIs load first (cached), then other dashboards load progressively
  if (userRole === 'owner') {
    // Fetch owner data with caching (fast path - should be < 500ms when cached)
    const cachedOwnerData = await fetchCachedOwnerDashboardData()
    
    // Fetch other dashboard data in parallel for preview mode support
    const [
      opsData,
      enhancedOpsData,
      financeData,
      salesData,
      salesEngineeringData,
      managerData,
      adminData,
      kpis,
      alerts,
      alertCount,
      activities,
      queue,
      metrics,
    ] = await Promise.all([
      getOpsDashboardData(),
      getEnhancedOpsDashboardData(),
      fetchFinanceDashboardData(),
      fetchSalesDashboardData(),
      getSalesEngineeringDashboardData(),
      fetchManagerDashboardData(),
      fetchAdminDashboardData(),
      fetchDashboardKPIs(),
      fetchBudgetAlerts(),
      fetchExceededBudgetCount(),
      fetchRecentActivity(),
      fetchOperationsQueue(),
      fetchManagerMetrics(),
    ])

    return (
      <DashboardSelector
        ownerData={cachedOwnerData}
        opsData={opsData}
        enhancedOpsData={enhancedOpsData}
        financeData={financeData}
        salesData={salesData}
        salesEngineeringData={salesEngineeringData}
        managerData={managerData}
        adminData={adminData}
        defaultData={{
          kpis,
          alerts,
          alertCount,
          activities,
          queue,
          metrics,
        }}
        userName={profile?.full_name || undefined}
        userEmail={userEmail}
        actualRole={userRole}
        userId={userId}
        onboardingData={onboardingData}
      />
    )
  }

  // For non-owner users, fetch only their specific dashboard data
  if (userRole === 'ops') {
    const enhancedOpsData = await getEnhancedOpsDashboardData()
    return (
      <DashboardSelector
        enhancedOpsData={enhancedOpsData}
        userName={profile?.full_name || undefined}
        actualRole={userRole}
        userId={userId}
        onboardingData={onboardingData}
      />
    )
  }

  if (userRole === 'finance') {
    const financeData = await fetchFinanceDashboardData()
    return (
      <DashboardSelector
        financeData={financeData}
        actualRole={userRole}
        userId={userId}
        onboardingData={onboardingData}
      />
    )
  }

  if (userRole === 'marketing') {
    // Check if this is Hutami (Marketing Manager who also manages Engineering)
    const isHutami = userEmail === HUTAMI_EMAIL
    
    if (isHutami) {
      // Fetch sales-engineering dashboard data for Hutami
      const salesEngineeringData = await getSalesEngineeringDashboardData()
      return (
        <DashboardSelector
          salesEngineeringData={salesEngineeringData}
          userName={profile?.full_name || undefined}
          userEmail={userEmail}
          actualRole={userRole}
          userId={userId}
          onboardingData={onboardingData}
        />
      )
    }
    
    // Regular marketing users get the standard sales dashboard
    const salesData = await fetchSalesDashboardData()
    return (
      <DashboardSelector
        salesData={salesData}
        userEmail={userEmail}
        actualRole={userRole}
        userId={userId}
        onboardingData={onboardingData}
      />
    )
  }

  if (userRole === 'marketing_manager' || userRole === 'finance_manager' || userRole === 'operations_manager') {
    const managerData = await fetchManagerDashboardData()
    return (
      <DashboardSelector
        managerData={managerData}
        userName={profile?.full_name || undefined}
        actualRole={userRole}
        userId={userId}
        onboardingData={onboardingData}
      />
    )
  }

  if (userRole === 'administration') {
    const adminData = await fetchAdminDashboardData()
    return (
      <DashboardSelector
        adminData={adminData}
        userName={profile?.full_name || undefined}
        actualRole={userRole}
        userId={userId}
        onboardingData={onboardingData}
      />
    )
  }

  // Fetch default data for viewer and other roles
  const [kpis, alerts, alertCount, activities, queue, metrics] = await Promise.all([
    fetchDashboardKPIs(),
    fetchBudgetAlerts(),
    fetchExceededBudgetCount(),
    fetchRecentActivity(),
    fetchOperationsQueue(),
    fetchManagerMetrics(),
  ])

  return (
    <DashboardSelector
      defaultData={{
        kpis,
        alerts,
        alertCount,
        activities,
        queue,
        metrics,
      }}
      actualRole={userRole}
      userId={userId}
      onboardingData={onboardingData}
    />
  )
}
