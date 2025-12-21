'use client'

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercentage,
  calculateNetCash,
  calculateProfitMargin,
  calculatePercentageChange,
  FinanceDashboardSummary,
} from '@/lib/finance-dashboard-enhanced-utils'

interface EnhancedSummaryCardsProps {
  summary: FinanceDashboardSummary
  previousMonthRevenue: number
  showCashPosition?: boolean
  showProfitMargin?: boolean
}

export function EnhancedSummaryCards({
  summary,
  previousMonthRevenue,
  showCashPosition = true,
  showProfitMargin = true,
}: EnhancedSummaryCardsProps) {
  const netCash = calculateNetCash(summary.cashReceivedMTD, summary.cashPaidMTD)
  const profitMargin = calculateProfitMargin(summary.profitMTD, summary.revenueMTD)
  const revenueChange = calculatePercentageChange(summary.revenueMTD, previousMonthRevenue)

  const isNetCashPositive = netCash >= 0
  const isRevenueUp = revenueChange > 0
  const isRevenueDown = revenueChange < 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Cash Position Card */}
      {showCashPosition && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Position MTD</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Received</span>
                <span className="text-green-600">+{formatCurrencyCompact(summary.cashReceivedMTD)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Paid Out</span>
                <span className="text-red-600">-{formatCurrencyCompact(summary.cashPaidMTD)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue MTD Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue MTD</CardTitle>
          {isRevenueUp ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : isRevenueDown ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : (
            <Minus className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyCompact(summary.revenueMTD)}</div>
          <div className="flex items-center gap-1 text-xs">
            {isRevenueUp ? (
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            ) : isRevenueDown ? (
              <ArrowDownRight className="h-3 w-3 text-red-500" />
            ) : null}
            <span className={isRevenueUp ? 'text-green-500' : isRevenueDown ? 'text-red-500' : 'text-muted-foreground'}>
              {formatPercentage(revenueChange)}
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Profit MTD Card */}
      {showProfitMargin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit MTD</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyCompact(summary.profitMTD)}</div>
            <p className="text-xs text-muted-foreground">
              {profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>
      )}

      {/* Net Cash Card */}
      {showCashPosition && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash MTD</CardTitle>
            <DollarSign className={`h-4 w-4 ${isNetCashPositive ? 'text-green-500' : 'text-red-500'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isNetCashPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isNetCashPositive ? '+' : ''}{formatCurrencyCompact(netCash)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isNetCashPositive ? 'Positive cash flow' : 'Negative cash flow'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
