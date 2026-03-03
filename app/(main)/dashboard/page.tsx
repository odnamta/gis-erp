import { DashboardSelector } from '@/components/dashboard/dashboard-selector'
import { OwnerDashboardWithPreview } from '@/components/dashboard/owner-dashboard-with-preview'
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
import { getEnhancedOpsDashboardData } from '@/lib/ops-dashboard-enhanced-utils'
import { getUserOnboardingProgress } from '@/lib/onboarding-actions'
import { fetchCachedOwnerDashboardData } from '@/lib/dashboard-cache-actions'
import { guardPage } from '@/lib/auth-utils'

// Hutami's email - Marketing Manager who also manages Engineering
const HUTAMI_EMAIL = 'hutamiarini@gama-group.co'

export default async function DashboardPage() {
  // Get user profile for role-based rendering
  const profile = await getUserProfile()
  await guardPage(!!profile)
  const userRole = profile?.role || 'viewer'
  const userEmail = profile?.email || ''
  const userId = profile?.id || ''

  // For owner users, use optimized loading with parallel data fetching
  if (userRole === 'owner') {
    // Fetch owner data and onboarding in parallel
    const [ownerData, onboardingData] = await Promise.all([
      fetchCachedOwnerDashboardData(),
      userId ? getUserOnboardingProgress(userId) : Promise.resolve(null),
    ])

    return (
      <OwnerDashboardWithPreview
        ownerData={ownerData}
        userName={profile?.full_name || undefined}
        userEmail={userEmail}
        userId={userId}
        onboardingData={onboardingData}
      />
    )
  }

  // Fetch onboarding data for non-owner users
  const onboardingData = userId ? await getUserOnboardingProgress(userId) : null

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
