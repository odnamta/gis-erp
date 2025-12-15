'use client'

import { Wallet, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/format'
import type { FinanceKPIs } from '@/lib/finance-dashboard-utils'

interface FinanceKPICardsProps {
  kpis: FinanceKPIs
}

export function FinanceKPICards({ kpis }: FinanceKPICardsProps) {
  const TrendIcon = kpis.revenueTrend === 'up' 
    ? TrendingUp 
    : kpis.revenueTrend === 'down' 
      ? TrendingDown 
      : Minus

  const trendColor = kpis.revenueTrend === 'up' 
    ? 'text-green-500' 
    : kpis.revenueTrend === 'down' 
      ? 'text-red-500' 
      : 'text-muted-foreground'

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Outstanding AR */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Outstanding AR</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(kpis.outstandingAR)}</div>
          <p className="text-xs text-muted-foreground">
            {kpis.outstandingARCount} invoice{kpis.outstandingARCount !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Overdue Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue ({'>'}30d)</CardTitle>
          <AlertCircle className={`h-4 w-4 ${kpis.overdueCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-bold ${kpis.overdueCount > 0 ? 'text-orange-500' : ''}`}>
              {formatCurrency(kpis.overdueAmount)}
            </div>
            {kpis.criticalOverdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {kpis.criticalOverdueCount} critical
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {kpis.overdueCount} invoice{kpis.overdueCount !== 1 ? 's' : ''} ⚠️
          </p>
        </CardContent>
      </Card>

      {/* Monthly Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month Revenue</CardTitle>
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(kpis.monthlyRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            {kpis.monthlyJOCount} JO{kpis.monthlyJOCount !== 1 ? 's' : ''} completed
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
