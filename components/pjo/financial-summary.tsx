'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatIDR } from '@/lib/pjo-utils'

interface FinancialSummaryProps {
  totalRevenue: number
  totalEstimatedCost: number
}

/**
 * Calculate profit (revenue - cost)
 * Exported for testing
 */
export function calculateProfit(revenue: number, cost: number): number {
  return revenue - cost
}

/**
 * Calculate margin percentage ((profit / revenue) * 100)
 * Returns 0 when revenue is 0 to avoid division by zero
 * Exported for testing
 */
export function calculateMargin(revenue: number, cost: number): number {
  if (revenue === 0) return 0
  const profit = calculateProfit(revenue, cost)
  return (profit / revenue) * 100
}

export function FinancialSummary({ totalRevenue, totalEstimatedCost }: FinancialSummaryProps) {
  const estimatedProfit = calculateProfit(totalRevenue, totalEstimatedCost)
  const estimatedMargin = calculateMargin(totalRevenue, totalEstimatedCost)

  const profitColor = estimatedProfit >= 0 ? 'text-green-600' : 'text-destructive'
  const marginColor = estimatedMargin >= 0 ? 'text-green-600' : 'text-destructive'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Revenue</span>
          <span className="font-medium">{formatIDR(totalRevenue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Estimated Cost</span>
          <span className="font-medium">{formatIDR(totalEstimatedCost)}</span>
        </div>
        <div className="border-t pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Estimated Profit</span>
            <span className={`font-bold ${profitColor}`}>
              {formatIDR(estimatedProfit)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm font-medium">Estimated Margin</span>
            <span className={`font-bold ${marginColor}`}>
              {estimatedMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
