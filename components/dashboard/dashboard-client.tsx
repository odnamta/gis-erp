'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, AlertTriangle, CheckCircle, Receipt, RefreshCw } from 'lucide-react'
import { KPICard } from './kpi-card'
import { BudgetAlertCard } from './budget-alert-card'
import { RecentActivity } from './recent-activity'
import { OperationsQueue } from './operations-queue'
import { ManagerSummary } from './manager-summary'
import { Button } from '@/components/ui/button'
import { useInterval } from '@/hooks/use-interval'
import { formatIDR } from '@/lib/pjo-utils'
import { cn } from '@/lib/utils'
import { 
  DashboardKPIs, 
  BudgetAlert, 
  ActivityEntry, 
  OpsQueueItem, 
  ManagerMetrics 
} from '@/types/database'

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
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh()
      setLastRefresh(new Date())
      setIsStale(false)
    })
  }, [router])

  // Auto-refresh every 60 seconds
  useInterval(() => {
    refresh()
  }, REFRESH_INTERVAL)

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
          {isStale && (
            <span className="text-xs text-yellow-600">Data may be stale</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isPending}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isPending && 'animate-spin')} />
            {isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Awaiting Ops Input"
          value={initialKPIs.awaitingOpsInput}
          description="PJOs needing cost entry"
          icon={Clock}
          href="/proforma-jo?status=approved&costs_confirmed=false"
          variant={initialKPIs.awaitingOpsInput > 0 ? 'warning' : 'default'}
        />
        <KPICard
          title="Budget Health"
          value={`${initialKPIs.exceededBudgetItems} items`}
          description={initialKPIs.exceededBudgetItems > 0 ? 'Over budget' : 'All within budget'}
          icon={AlertTriangle}
          href="/dashboard/budget-alerts"
          variant={initialKPIs.exceededBudgetItems > 0 ? 'danger' : 'success'}
        />
        <KPICard
          title="Ready for Conversion"
          value={initialKPIs.readyForConversion}
          description="PJOs ready for JO"
          icon={CheckCircle}
          href="/proforma-jo?status=approved&costs_confirmed=true"
          variant={initialKPIs.readyForConversion > 0 ? 'success' : 'default'}
        />
        <KPICard
          title="Outstanding AR"
          value={formatIDR(initialKPIs.outstandingAR)}
          description="Unpaid invoices"
          icon={Receipt}
          href="/invoices?status=sent,overdue"
          variant={initialKPIs.outstandingAR > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Manager Summary - only for manager role */}
      {(userRole === 'manager' || userRole === 'admin') && (
        <ManagerSummary metrics={initialMetrics} />
      )}

      {/* Main content grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <BudgetAlertCard alerts={initialAlerts} totalCount={initialAlertCount} />
        <RecentActivity activities={initialActivities} />
      </div>

      {/* Operations Queue - for ops and manager roles */}
      {(userRole === 'ops' || userRole === 'manager' || userRole === 'admin') && (
        <OperationsQueue items={initialQueue} />
      )}
    </div>
  )
}
