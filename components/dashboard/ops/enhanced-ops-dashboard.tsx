'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EnhancedSummaryCards } from './enhanced-summary-cards'
import { EnhancedActiveJobsTable } from './enhanced-active-jobs-table'
import { DeliveryScheduleCard } from './delivery-schedule-card'
import { CostTrackingCard } from './cost-tracking-card'
import { PendingActionsCard } from './pending-actions-card'
import { QuickActionsBar } from './quick-actions-bar'
import { ManpowerList } from './manpower-list'
import { EnhancedOpsDashboardData } from '@/lib/ops-dashboard-enhanced-utils'
import { format } from 'date-fns'

interface EnhancedOpsDashboardProps {
  data: EnhancedOpsDashboardData
  userName?: string
}

/**
 * Enhanced Operations Dashboard for Reza (Operations Manager)
 * 
 * IMPORTANT: This dashboard intentionally does NOT show:
 * - Revenue data
 * - Profit data
 * - Margin data
 * - Customer pricing
 * 
 * It only shows:
 * - Budget amounts (what's allocated for costs)
 * - Actual spent (what's been disbursed)
 * - Delivery tracking
 * - Job execution status
 */
export function EnhancedOpsDashboard({ data, userName }: EnhancedOpsDashboardProps) {
  const currentMonth = format(new Date(), 'MMMM yyyy')
  const greeting = getGreeting()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {greeting}, {userName || 'Reza'}
          </h2>
          <p className="text-muted-foreground">
            Operations Dashboard • {currentMonth}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Last updated: just now</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Operations Overview - Summary Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Operations Overview</h3>
        <EnhancedSummaryCards summary={data.summary} />
      </div>

      {/* Active Jobs Table */}
      <EnhancedActiveJobsTable jobs={data.activeJobs} />

      {/* Two Column Layout: Delivery Schedule & Cost Tracking */}
      <div className="grid gap-6 md:grid-cols-2">
        <DeliveryScheduleCard deliveries={data.deliverySchedule} />
        <CostTrackingCard costSummary={data.costSummary} />
      </div>

      {/* Manpower List */}
      <ManpowerList
        members={data.manpower.map(m => ({
          id: m.id,
          fullName: m.fullName,
          role: m.role,
          isActive: m.isActive,
          currentAssignment: m.currentAssignment,
        }))}
      />

      {/* Pending Actions */}
      <PendingActionsCard actions={data.pendingActions} />

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
        <QuickActionsBar />
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '👋 Good morning'
  if (hour < 17) return '👋 Good afternoon'
  return '👋 Good evening'
}
