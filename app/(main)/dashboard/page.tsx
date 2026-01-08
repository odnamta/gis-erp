import { Suspense } from 'react'
import { DashboardSelector } from '@/components/dashboard/dashboard-selector'
import { OwnerDashboardWithPreview } from '@/components/dashboard/owner-dashboard-with-preview'
import { OwnerDashboardSkeleton } from '@/components/dashboard/owner-dashboard-skeleton'
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

// Hutami's email - Marketing Manager who also manages Engineering
const HUTAMI_EMAIL = 'hutamiarini@gama-group.co'

/**
 * Server component that fetches owner dashboard data
 * Uses caching for fast load times
 */
async function OwnerDashboardLoader({
  userId,
  userName,
  userEmail,
  onboardingData,
}: {
  userId: string
  userName?: string
  userEmail: string
  onboardingData: Awaited<ReturnType<typeof getUserOnboardingProgress>> | null
}) {
  // Fetch only owner-specific data (fast - cached)
  // Preview data is fetched lazily on client when needed
  const ownerData = await fetchCachedOwnerDashboardData()

  return (
    <OwnerDashboardWithPreview
      ownerData={ownerData}
      userName={userName}
      userEmail={userEmail}
      userId={userId}
      onboardingData={onboardingData}
    />
  )
}

export default async function DashboardPage() {
  // Get user profile for role-based rendering
  const profile = await getUserProfile()
  const userRole = profile?.role || 'viewer'
  const userEmail = profile?.email || ''
  const userId = profile?.id || ''

  // Fetch onboarding data for all users
  const onboardingData = userId ? await getUserOnboardingProgress(userId) : null

  // For owner users, use optimized loading:
  // - Owner dashboard data loads immediately (cached, <500ms)
  // - Preview data loads lazily only when user activates preview mode
  if (userRole === 'owner') {
    return (
      <Suspense fallback={<OwnerDashboardSkeleton />}>
        <OwnerDashboardLoader
          userId={userId}
          userName={profile?.full_name || undefined}
          userEmail={userEmail}
          onboardingData={onboardingData}
        />
      </Suspense>
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
