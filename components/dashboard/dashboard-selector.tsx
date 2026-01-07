'use client'

import { usePreview } from '@/hooks/use-preview'
import { DashboardClient } from '@/components/dashboard/dashboard-client'
import { OpsDashboard, EnhancedOpsDashboard } from '@/components/dashboard/ops'
import { FinanceDashboard } from '@/components/dashboard/finance/finance-dashboard'
import { SalesDashboard } from '@/components/dashboard/sales/sales-dashboard'
import { SalesEngineeringDashboard } from '@/components/dashboard/sales-engineering'
import { ManagerDashboard } from '@/components/dashboard/manager/manager-dashboard'
import { AdminDashboard } from '@/components/dashboard/admin/admin-dashboard'
import { OwnerDashboard } from '@/components/dashboard/owner-dashboard'
import { OnboardingWidget } from '@/components/onboarding'
import type { SalesEngineeringDashboardData } from '@/lib/sales-engineering-dashboard-utils'
import type { EnhancedOpsDashboardData } from '@/lib/ops-dashboard-enhanced-utils'
import type { UserOnboardingData } from '@/types/onboarding'

interface DashboardSelectorProps {
  ownerData?: Parameters<typeof OwnerDashboard>[0]['data']
  opsData?: Parameters<typeof OpsDashboard>[0]['data']
  enhancedOpsData?: EnhancedOpsDashboardData
  financeData?: Parameters<typeof FinanceDashboard>[0]['data']
  salesData?: Parameters<typeof SalesDashboard>[0]['initialData']
  salesEngineeringData?: SalesEngineeringDashboardData
  managerData?: Parameters<typeof ManagerDashboard>[0]['initialData']
  adminData?: Parameters<typeof AdminDashboard>[0]['initialData']
  defaultData?: {
    kpis: Parameters<typeof DashboardClient>[0]['initialKPIs']
    alerts: Parameters<typeof DashboardClient>[0]['initialAlerts']
    alertCount: Parameters<typeof DashboardClient>[0]['initialAlertCount']
    activities: Parameters<typeof DashboardClient>[0]['initialActivities']
    queue: Parameters<typeof DashboardClient>[0]['initialQueue']
    metrics: Parameters<typeof DashboardClient>[0]['initialMetrics']
  }
  userName?: string
  actualRole: string
  userEmail?: string
  userId?: string
  onboardingData?: UserOnboardingData | null
}

export function DashboardSelector({
  ownerData,
  opsData,
  enhancedOpsData,
  financeData,
  salesData,
  salesEngineeringData,
  managerData,
  adminData,
  defaultData,
  userName,
  actualRole,
  userEmail,
  userId,
  onboardingData,
}: DashboardSelectorProps) {
  const { effectiveRole, isPreviewActive } = usePreview()

  // Use effective role for dashboard selection (supports preview mode)
  const roleToRender = effectiveRole

  // Check if onboarding widget should be shown
  const showOnboarding = userId && 
    onboardingData?.status?.show_onboarding_widget && 
    !onboardingData?.status?.is_onboarding_complete

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

  // Render based on effective role
  if (roleToRender === 'owner' && ownerData) {
    return <DashboardWrapper><OwnerDashboard data={ownerData} /></DashboardWrapper>
  }

  // Ops role: Use enhanced dashboard if available, otherwise fallback to original
  if (roleToRender === 'ops') {
    if (enhancedOpsData) {
      return <DashboardWrapper><EnhancedOpsDashboard data={enhancedOpsData} userName={userName} /></DashboardWrapper>
    }
    if (opsData) {
      return <DashboardWrapper><OpsDashboard data={opsData} userName={userName} /></DashboardWrapper>
    }
  }

  if (roleToRender === 'finance' && financeData) {
    return <DashboardWrapper><FinanceDashboard data={financeData} /></DashboardWrapper>
  }

  // Marketing role: Show SalesEngineeringDashboard for Hutami or if salesEngineeringData is provided
  if (roleToRender === 'marketing') {
    // Check if this is Hutami (Marketing Manager who also manages Engineering)
    const isHutami = userEmail === 'hutamiarini@gama-group.co'
    
    if ((isHutami || salesEngineeringData) && salesEngineeringData) {
      return <DashboardWrapper><SalesEngineeringDashboard data={salesEngineeringData} userName={userName} /></DashboardWrapper>
    }
    
    if (salesData) {
      return <DashboardWrapper><SalesDashboard initialData={salesData} /></DashboardWrapper>
    }
  }

  if ((roleToRender === 'marketing_manager' || roleToRender === 'finance_manager' || roleToRender === 'operations_manager') && managerData) {
    return <DashboardWrapper><ManagerDashboard initialData={managerData} userName={userName} /></DashboardWrapper>
  }

  if (roleToRender === 'administration' && adminData) {
    return <DashboardWrapper><AdminDashboard initialData={adminData} userName={userName} /></DashboardWrapper>
  }

  // Fallback to default dashboard
  if (defaultData) {
    return (
      <DashboardWrapper>
        <DashboardClient
          initialKPIs={defaultData.kpis}
          initialAlerts={defaultData.alerts}
          initialAlertCount={defaultData.alertCount}
          initialActivities={defaultData.activities}
          initialQueue={defaultData.queue}
          initialMetrics={defaultData.metrics}
          userRole={roleToRender}
        />
      </DashboardWrapper>
    )
  }

  return <div>Loading dashboard...</div>
}
