'use client'

import { useState, useEffect, useCallback } from 'react'
import { OwnerDashboard } from './owner-dashboard'
import { DashboardClient } from './dashboard-client'
import { OpsDashboard, EnhancedOpsDashboard } from './ops'
import { FinanceDashboard } from './finance/finance-dashboard'
import { SalesDashboard } from './sales/sales-dashboard'
import { SalesEngineeringDashboard } from './sales-engineering'
import { ManagerDashboard } from './manager/manager-dashboard'
import { AdminDashboard } from './admin/admin-dashboard'
import { OnboardingWidget } from '@/components/onboarding'
import { OwnerDashboardSkeleton } from './owner-dashboard-skeleton'
import { usePreview } from '@/hooks/use-preview'
import type { OwnerDashboardData } from '@/lib/dashboard-cache-actions'
import type { UserOnboardingData } from '@/types/onboarding'

interface OwnerDashboardWithPreviewProps {
  ownerData: OwnerDashboardData
  userName?: string
  userEmail: string
  userId: string
  onboardingData?: UserOnboardingData | null
}

// Cache for preview dashboard data
const previewDataCache: Record<string, unknown> = {}

/**
 * Owner Dashboard with lazy-loaded preview mode
 * - Shows owner dashboard immediately
 * - Fetches other dashboard data only when preview mode is activated
 */
export function OwnerDashboardWithPreview({
  ownerData,
  userName,
  userEmail,
  userId,
  onboardingData,
}: OwnerDashboardWithPreviewProps) {
  const { effectiveRole, isPreviewActive } = usePreview()
  const [previewData, setPreviewData] = useState<Record<string, unknown>>(previewDataCache)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // Check if onboarding widget should be shown
  const showOnboarding = userId && 
    onboardingData?.status?.show_onboarding_widget && 
    !onboardingData?.status?.is_onboarding_complete

  // Fetch preview data when preview mode is activated
  const fetchPreviewData = useCallback(async (role: string) => {
    // Return cached data if available
    if (previewDataCache[role]) {
      setPreviewData(prev => ({ ...prev, [role]: previewDataCache[role] }))
      return
    }

    setIsLoadingPreview(true)
    try {
      const response = await fetch(`/api/dashboard/preview?role=${role}`)
      if (response.ok) {
        const data = await response.json()
        previewDataCache[role] = data
        setPreviewData(prev => ({ ...prev, [role]: data }))
      }
    } catch (error) {
      console.error('Failed to fetch preview data:', error)
    } finally {
      setIsLoadingPreview(false)
    }
  }, [])

  // Fetch preview data when role changes
  useEffect(() => {
    if (isPreviewActive && effectiveRole !== 'owner' && !previewData[effectiveRole]) {
      fetchPreviewData(effectiveRole)
    }
  }, [effectiveRole, isPreviewActive, previewData, fetchPreviewData])

  // Wrapper component to add onboarding widget
  const DashboardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (!showOnboarding || !userId) {
      return <>{children}</>
    }
    return (
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 min-w-0">{children}</div>
        <div className="xl:w-80 shrink-0">
          <OnboardingWidget userId={userId} />
        </div>
      </div>
    )
  }

  // Show loading state when fetching preview data
  if (isPreviewActive && isLoadingPreview && effectiveRole !== 'owner') {
    return <DashboardWrapper><OwnerDashboardSkeleton /></DashboardWrapper>
  }

  // Render owner dashboard (default)
  if (effectiveRole === 'owner') {
    return <DashboardWrapper><OwnerDashboard data={ownerData} /></DashboardWrapper>
  }

  // Render preview dashboards based on effective role
  const roleData = previewData[effectiveRole]

  if (effectiveRole === 'ops') {
    if (roleData && 'enhancedOpsData' in (roleData as object)) {
      const data = roleData as { enhancedOpsData: Parameters<typeof EnhancedOpsDashboard>[0]['data'] }
      return <DashboardWrapper><EnhancedOpsDashboard data={data.enhancedOpsData} userName={userName} /></DashboardWrapper>
    }
    return <DashboardWrapper><OwnerDashboardSkeleton /></DashboardWrapper>
  }

  if (effectiveRole === 'finance') {
    if (roleData && 'financeData' in (roleData as object)) {
      const data = roleData as { financeData: Parameters<typeof FinanceDashboard>[0]['data'] }
      return <DashboardWrapper><FinanceDashboard data={data.financeData} /></DashboardWrapper>
    }
    return <DashboardWrapper><OwnerDashboardSkeleton /></DashboardWrapper>
  }

  if (effectiveRole === 'marketing') {
    if (roleData && 'salesData' in (roleData as object)) {
      const data = roleData as { salesData: Parameters<typeof SalesDashboard>[0]['initialData'] }
      return <DashboardWrapper><SalesDashboard initialData={data.salesData} /></DashboardWrapper>
    }
    return <DashboardWrapper><OwnerDashboardSkeleton /></DashboardWrapper>
  }

  if (effectiveRole === 'marketing_manager' || effectiveRole === 'finance_manager' || effectiveRole === 'operations_manager') {
    if (roleData && 'managerData' in (roleData as object)) {
      const data = roleData as { managerData: Parameters<typeof ManagerDashboard>[0]['initialData'] }
      return <DashboardWrapper><ManagerDashboard initialData={data.managerData} userName={userName} /></DashboardWrapper>
    }
    return <DashboardWrapper><OwnerDashboardSkeleton /></DashboardWrapper>
  }

  if (effectiveRole === 'administration') {
    if (roleData && 'adminData' in (roleData as object)) {
      const data = roleData as { adminData: Parameters<typeof AdminDashboard>[0]['initialData'] }
      return <DashboardWrapper><AdminDashboard initialData={data.adminData} userName={userName} /></DashboardWrapper>
    }
    return <DashboardWrapper><OwnerDashboardSkeleton /></DashboardWrapper>
  }

  // Fallback to default dashboard
  if (roleData && 'defaultData' in (roleData as object)) {
    const data = roleData as { 
      defaultData: {
        kpis: Parameters<typeof DashboardClient>[0]['initialKPIs']
        alerts: Parameters<typeof DashboardClient>[0]['initialAlerts']
        alertCount: Parameters<typeof DashboardClient>[0]['initialAlertCount']
        activities: Parameters<typeof DashboardClient>[0]['initialActivities']
        queue: Parameters<typeof DashboardClient>[0]['initialQueue']
        metrics: Parameters<typeof DashboardClient>[0]['initialMetrics']
      }
    }
    return (
      <DashboardWrapper>
        <DashboardClient
          initialKPIs={data.defaultData.kpis}
          initialAlerts={data.defaultData.alerts}
          initialAlertCount={data.defaultData.alertCount}
          initialActivities={data.defaultData.activities}
          initialQueue={data.defaultData.queue}
          initialMetrics={data.defaultData.metrics}
          userRole={effectiveRole}
        />
      </DashboardWrapper>
    )
  }

  return <DashboardWrapper><OwnerDashboardSkeleton /></DashboardWrapper>
}
