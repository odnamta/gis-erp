'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from './dashboard-header'
import { EnhancedSummaryCards } from './enhanced-summary-cards'
import { AROverviewCard, APOverviewCard } from './ar-ap-overview-cards'
import { PendingApprovalsCard } from './pending-approvals-card'
import { RevenueTrendChart } from './revenue-trend-chart'
import { QuickActionsBar } from './quick-actions-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import type { FinanceDashboardEnhancedData } from '@/app/(main)/dashboard/finance-enhanced-actions'
import { refreshFinanceDashboard } from '@/app/(main)/dashboard/finance-enhanced-actions'

interface FinanceDashboardEnhancedProps {
  data: FinanceDashboardEnhancedData
  userName?: string
  showCashPosition?: boolean
  showProfitMargin?: boolean
}

export function FinanceDashboardEnhanced({
  data,
  userName,
  showCashPosition = true,
  showProfitMargin = true,
}: FinanceDashboardEnhancedProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshFinanceDashboard()
      startTransition(() => {
        router.refresh()
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleBKKClick = (id: string) => {
    router.push(`/finance/bkk/${id}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        userName={userName}
        calculatedAt={data.summary.calculatedAt}
        isStale={data.isStale}
        isRefreshing={isRefreshing || isPending}
        onRefresh={handleRefresh}
      />

      {/* Quick Actions */}
      <QuickActionsBar />

      {/* Summary Cards */}
      <EnhancedSummaryCards
        summary={data.summary}
        previousMonthRevenue={data.previousMonthRevenue}
        showCashPosition={showCashPosition}
        showProfitMargin={showProfitMargin}
      />

      {/* AR/AP Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <AROverviewCard
          totalAR={data.summary.totalAR}
          overdueAR={data.summary.arOverdue}
          invoiceCount={data.summary.arInvoiceCount}
          agingBuckets={data.arAging}
        />
        <APOverviewCard
          totalAP={data.summary.totalAP}
          overdueAP={data.summary.apOverdue}
          pendingVerification={data.summary.apPendingVerification}
          agingBuckets={data.apAging}
        />
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <PendingApprovalsCard
          pendingBKKs={data.pendingBKKs}
          totalPendingCount={data.summary.bkkPendingCount}
          totalPendingAmount={data.summary.bkkPendingAmount}
          onBKKClick={handleBKKClick}
        />
        <RevenueTrendChart data={data.revenueTrend} />
      </div>
    </div>
  )
}

// Loading skeleton for the dashboard
export function FinanceDashboardEnhancedSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Summary Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AR/AP Section Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Section Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
