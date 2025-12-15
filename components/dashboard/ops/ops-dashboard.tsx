'use client'

import { OpsKPICards } from './ops-kpi-cards'
import { PendingCostsTable } from './pending-costs-table'
import { ActiveJobsTable } from './active-jobs-table'
import { WeeklyStatsCard } from './weekly-stats'
import { OpsDashboardData } from '@/lib/ops-dashboard-utils'

interface OpsDashboardProps {
  data: OpsDashboardData
  userName?: string
}

/**
 * Operations Dashboard
 * 
 * IMPORTANT: This dashboard intentionally does NOT show:
 * - Revenue data
 * - Profit data
 * - Margin data
 * - Total amounts
 * 
 * It only shows:
 * - Budget caps (estimated amounts)
 * - Actual costs entered
 * - Variance from budget
 */
export function OpsDashboard({ data, userName }: OpsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Operations Dashboard</h2>
          <p className="text-muted-foreground">
            {userName ? `Welcome, ${userName}` : 'Manage your cost entries and job orders'}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <OpsKPICards kpis={data.kpis} />

      {/* Weekly Stats */}
      <WeeklyStatsCard stats={data.weeklyStats} />

      {/* Pending Cost Entries */}
      <PendingCostsTable entries={data.pendingCosts} />

      {/* Active Jobs */}
      <ActiveJobsTable jobs={data.activeJobs} />
    </div>
  )
}
