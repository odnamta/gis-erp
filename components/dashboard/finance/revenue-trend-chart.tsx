'use client'

import Link from 'next/link'
import { TrendingUp, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  formatCurrencyCompact,
  formatMonthLabel,
  MonthlyRevenueData,
} from '@/lib/finance-dashboard-enhanced-utils'

interface RevenueTrendChartProps {
  data: MonthlyRevenueData[]
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  // Find max value for scaling
  const maxValue = Math.max(
    ...data.flatMap(d => [d.revenue, d.collected]),
    1 // Prevent division by zero
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
          </div>
        </div>
        <CardDescription>Last 6 months revenue vs collected</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No revenue data available
          </div>
        ) : (
          <>
            {/* Simple Bar Chart */}
            <div className="space-y-3">
              {data.map((month) => {
                const revenuePercent = (month.revenue / maxValue) * 100
                const collectedPercent = (month.collected / maxValue) * 100

                return (
                  <div key={month.month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium w-12">{formatMonthLabel(month.month)}</span>
                      <div className="flex gap-4 text-muted-foreground">
                        <span className="text-blue-600">{formatCurrencyCompact(month.revenue)}</span>
                        <span className="text-green-600">{formatCurrencyCompact(month.collected)}</span>
                      </div>
                    </div>
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                      {/* Revenue bar (background) */}
                      <div
                        className="absolute inset-y-0 left-0 bg-blue-200 rounded-full transition-all"
                        style={{ width: `${revenuePercent}%` }}
                      />
                      {/* Collected bar (foreground) */}
                      <div
                        className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all"
                        style={{ width: `${collectedPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs pt-2 border-t">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-200" />
                <span className="text-muted-foreground">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Collected</span>
              </div>
            </div>
          </>
        )}

        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/reports/revenue">
            View Full Report
            <ExternalLink className="h-3 w-3 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
