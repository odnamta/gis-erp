'use client'

import { useState, useTransition } from 'react'
import { PeriodFilter } from './period-filter'
import { SalesKPICards } from './sales-kpi-cards'
import { PipelineFunnel } from './pipeline-funnel'
import { PendingFollowupsTable } from './pending-followups-table'
import { TopCustomersTable } from './top-customers-table'
import { WinLossAnalysis } from './win-loss-analysis'
import {
  type PeriodType,
  type SalesKPIs,
  type PipelineStage,
  type PendingFollowup,
  type TopCustomer,
  type WinLossData,
} from '@/lib/sales-dashboard-utils'

export interface SalesDashboardData {
  kpis: SalesKPIs
  pipeline: PipelineStage[]
  pendingFollowups: PendingFollowup[]
  topCustomers: TopCustomer[]
  winLossData: WinLossData
}

interface SalesDashboardProps {
  initialData: SalesDashboardData
  onPeriodChange?: (period: PeriodType, customStart?: Date, customEnd?: Date) => Promise<SalesDashboardData>
}

export function SalesDashboard({ initialData, onPeriodChange }: SalesDashboardProps) {
  const [data, setData] = useState<SalesDashboardData>(initialData)
  const [period, setPeriod] = useState<PeriodType>('this_month')
  const [customStart, setCustomStart] = useState<Date | undefined>()
  const [customEnd, setCustomEnd] = useState<Date | undefined>()
  const [isPending, startTransition] = useTransition()

  const handlePeriodChange = async (
    newPeriod: PeriodType,
    newCustomStart?: Date,
    newCustomEnd?: Date
  ) => {
    setPeriod(newPeriod)
    setCustomStart(newCustomStart)
    setCustomEnd(newCustomEnd)

    if (onPeriodChange) {
      startTransition(async () => {
        const newData = await onPeriodChange(newPeriod, newCustomStart, newCustomEnd)
        setData(newData)
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales & Marketing Dashboard</h1>
          <p className="text-muted-foreground">
            Track your pipeline, win rates, and customer acquisition
          </p>
        </div>
        <PeriodFilter
          value={period}
          onChange={handlePeriodChange}
          customStart={customStart}
          customEnd={customEnd}
        />
      </div>

      {/* KPI Cards */}
      <SalesKPICards kpis={data.kpis} isLoading={isPending} />

      {/* Pipeline Funnel */}
      <PipelineFunnel stages={data.pipeline} isLoading={isPending} />

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Follow-ups */}
        <PendingFollowupsTable followups={data.pendingFollowups} isLoading={isPending} />

        {/* Top Customers */}
        <TopCustomersTable customers={data.topCustomers} isLoading={isPending} />
      </div>

      {/* Win/Loss Analysis */}
      <WinLossAnalysis data={data.winLossData} isLoading={isPending} />
    </div>
  )
}
