'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Users, FileText, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrencyShort } from '@/lib/utils/format'
import { type SalesKPIs } from '@/lib/sales-dashboard-utils'

interface SalesKPICardsProps {
  kpis: SalesKPIs
  isLoading?: boolean
}

export function SalesKPICards({ kpis, isLoading }: SalesKPICardsProps) {
  const winRateDiff = kpis.winRate - kpis.winRateTarget
  const isAboveTarget = winRateDiff >= 0

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Pipeline Value */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyShort(kpis.pipelineValue)}</div>
          <p className="text-xs text-muted-foreground">
            {kpis.pipelineCount} opportunities
          </p>
        </CardContent>
      </Card>

      {/* Win Rate */}
      <Card className={cn(
        isAboveTarget ? 'border-green-200 bg-green-50/50' : 'border-yellow-200 bg-yellow-50/50'
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          {isAboveTarget ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={cn(
            'text-2xl font-bold',
            isAboveTarget ? 'text-green-600' : 'text-yellow-600'
          )}>
            {kpis.winRate.toFixed(0)}%
          </div>
          <p className="text-xs text-muted-foreground">
            vs {kpis.winRateTarget}% target ({winRateDiff >= 0 ? '+' : ''}{winRateDiff.toFixed(0)}%)
          </p>
        </CardContent>
      </Card>

      {/* Active PJOs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active PJOs</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.activePJOsCount}</div>
          <p className="text-xs text-muted-foreground">this month</p>
        </CardContent>
      </Card>

      {/* New Customers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">New Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.newCustomersCount}</div>
          <p className="text-xs text-muted-foreground">this month</p>
        </CardContent>
      </Card>
    </div>
  )
}
