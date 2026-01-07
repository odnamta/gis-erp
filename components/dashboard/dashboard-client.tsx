'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertTriangle, CheckCircle, Receipt, RefreshCw } from 'lucide-react'
import { KPICard } from './kpi-card'
import { BudgetAlertCard } from './budget-alert-card'
import { RecentActivity } from './recent-activity'
import { OperationsQueue } from './operations-queue'
import { ManagerSummary } from './manager-summary'
import { AttendanceWidget } from '@/components/attendance/attendance-widget'
import { Button } from '@/components/ui/button'
import { useInterval } from '@/hooks/use-interval'
import { usePermissions } from '@/components/providers/permission-provider'
import { formatIDR } from '@/lib/pjo-utils'
import { cn } from '@/lib/utils'
import {
  DashboardKPIs,
  BudgetAlert,
  ActivityEntry,
  OpsQueueItem,
  ManagerMetrics,
} from '@/types'

interface DashboardClientProps {
  initialKPIs: DashboardKPIs
  initialAlerts: BudgetAlert[]
  initialAlertCount: number
  initialActivities: ActivityEntry[]
  initialQueue: OpsQueueItem[]
  initialMetrics: ManagerMetrics
  userRole: string
}

const REFRESH_INTERVAL = 60000 // 60 seconds

export function DashboardClient({
  initialKPIs,
  initialAlerts,
  initialAlertCount,
  initialActivities,
  initialQueue,
  initialMetrics,
  userRole,
}: DashboardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isStale, setIsStale] = useState(false)
  const { hasPermission } = usePermissions()

  // Permission checks
  const canSeeRevenue = hasPermission('can_see_revenue')
  const canSeeProfit = hasPermission('can_see_profit')
  const canFillCosts = hasPermission('can_fill_costs')
  const canManageInvoices = hasPermission('can_manage_invoices')

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh()
      setIsStale(false)
    })
  }, [router])

  // Auto-refresh every 60 seconds
  useInterval(() => {
    refresh()
  }, REFRESH_INTERVAL)

  // Determine which KPIs to show based on role
  const isOpsOnly = userRole === 'ops'
  const isFinance = userRole === 'finance'
  const canSeeFullDashboard = canSeeRevenue && canSeeProfit

  return (
    <div className="space-y-6">
      {/* Header with refresh indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to Gama ERP - Logistics Management System
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStale && <span className="text-xs text-yellow-600">Data may be stale</span>}
          <Button variant="outline" size="sm" onClick={refresh} disabled={isPending}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isPending && 'animate-spin')} />
            {isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* KPI Cards - role-based */}
      <div className={cn('grid gap-4', isOpsOnly ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4')}>
        {/* Awaiting Ops Input - visible to ops, admin, manager */}
        {(canFillCosts || canSeeFullDashboard) && (
          <KPICard
            title="Awaiting Ops Input"
            value={initialKPIs.awaitingOpsInput}
            description="PJOs needing cost entry"
            icon={Clock}
            href="/proforma-jo?status=approved&costs_confirmed=false"
            variant={initialKPIs.awaitingOpsInput > 0 ? 'warning' : 'default'}
          />
        )}

        {/* Budget Health - visible to all except viewer */}
        {(canFillCosts || canSeeRevenue) && (
          <KPICard
            title="Budget Health"
            value={`${initialKPIs.exceededBudgetItems} items`}
            description={initialKPIs.exceededBudgetItems > 0 ? 'Over budget' : 'All within budget'}
            icon={AlertTriangle}
            href="/dashboard/budget-alerts"
            variant={initialKPIs.exceededBudgetItems > 0 ? 'danger' : 'success'}
          />
        )}

        {/* Ready for Conversion - hidden from ops */}
        {canSeeRevenue && (
          <KPICard
            title="Ready for Conversion"
            value={initialKPIs.readyForConversion}
            description="PJOs ready for JO"
            icon={CheckCircle}
            href="/proforma-jo?status=approved&costs_confirmed=true"
            variant={initialKPIs.readyForConversion > 0 ? 'success' : 'default'}
          />
        )}

        {/* Outstanding AR - hidden from ops */}
        {(canManageInvoices || canSeeRevenue) && (
          <KPICard
            title="Outstanding AR"
            value={formatIDR(initialKPIs.outstandingAR)}
            description="Unpaid invoices"
            icon={Receipt}
            href="/invoices?status=sent,overdue"
            variant={initialKPIs.outstandingAR > 0 ? 'warning' : 'default'}
          />
        )}
      </div>

      {/* Manager Summary - only for users who can see revenue and profit */}
      {canSeeFullDashboard && <ManagerSummary metrics={initialMetrics} />}

      {/* Main content grid - role-based */}
      {!isOpsOnly && (
        <div className="grid gap-4 md:grid-cols-2">
          {canSeeRevenue && <BudgetAlertCard alerts={initialAlerts} totalCount={initialAlertCount} />}
          <RecentActivity activities={initialActivities} />
        </div>
      )}

      {/* Operations Queue - for users who can fill costs */}
      {canFillCosts && <OperationsQueue items={initialQueue} />}

      {/* Ops-only view: show activity in full width */}
      {isOpsOnly && (
        <div className="grid gap-4">
          <RecentActivity activities={initialActivities} />
        </div>
      )}

      {/* Attendance Widget - visible to all users */}
      <AttendanceWidget />
    </div>
  )
}
