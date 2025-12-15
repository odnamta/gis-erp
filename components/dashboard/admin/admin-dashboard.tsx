'use client'

import { useState, useTransition } from 'react'
import { AdminPeriodFilter } from './admin-period-filter'
import { AdminKPICards } from './admin-kpi-cards'
import { PJOStatusPipeline } from './pjo-status-pipeline'
import { PendingWorkQueue } from './pending-work-queue'
import { InvoiceAgingSummary } from './invoice-aging-summary'
import { RecentDocumentsTable } from './recent-documents-table'
import { QuickActionsPanel } from './quick-actions-panel'
import {
  type AdminPeriodType,
  type AdminKPIs,
  type PipelineStage,
  type PendingWorkItem,
  type AgingBucket,
  type RecentDocument,
} from '@/lib/admin-dashboard-utils'

export interface AdminDashboardData {
  kpis: AdminKPIs
  pipeline: PipelineStage[]
  pendingWork: PendingWorkItem[]
  agingBuckets: AgingBucket[]
  recentDocuments: RecentDocument[]
}

interface AdminDashboardProps {
  initialData: AdminDashboardData
  userName?: string
  onPeriodChange?: (period: AdminPeriodType) => Promise<AdminDashboardData>
}

export function AdminDashboard({
  initialData,
  userName,
  onPeriodChange,
}: AdminDashboardProps) {
  const [data, setData] = useState<AdminDashboardData>(initialData)
  const [period, setPeriod] = useState<AdminPeriodType>('this_month')
  const [isPending, startTransition] = useTransition()

  const handlePeriodChange = async (newPeriod: AdminPeriodType) => {
    setPeriod(newPeriod)
    if (onPeriodChange) {
      startTransition(async () => {
        const newData = await onPeriodChange(newPeriod)
        setData(newData)
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration Dashboard</h1>
          {userName && (
            <p className="text-muted-foreground">Welcome, {userName}</p>
          )}
        </div>
        <AdminPeriodFilter value={period} onChange={handlePeriodChange} />
      </div>

      {/* KPI Cards */}
      <AdminKPICards kpis={data.kpis} isLoading={isPending} />

      {/* PJO Pipeline */}
      <PJOStatusPipeline stages={data.pipeline} isLoading={isPending} />

      {/* Two Column Layout: Pending Work and Invoice Aging */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PendingWorkQueue items={data.pendingWork} isLoading={isPending} />
        <InvoiceAgingSummary buckets={data.agingBuckets} isLoading={isPending} />
      </div>

      {/* Recent Documents */}
      <RecentDocumentsTable documents={data.recentDocuments} isLoading={isPending} />

      {/* Quick Actions */}
      <QuickActionsPanel />
    </div>
  )
}
