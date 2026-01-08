'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportSummary, ReportEmptyState } from '@/components/reports'
import { formatCurrency, formatPercentage } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'
import { PLReportData } from '@/types/reports'

interface Props {
  initialData: PLReportData | null
  userId?: string
}

export function ProfitLossClient({ initialData, userId }: Props) {
  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'fin_profit_loss', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  if (!initialData || (initialData.revenue.length === 0 && initialData.costs.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
            <p className="text-muted-foreground">Revenue, costs, and margins by period</p>
          </div>
        </div>
        <ReportEmptyState message="No transactions found for the selected period." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Profit & Loss Statement</h1>
            <p className="text-muted-foreground">Revenue, costs, and margins by period</p>
          </div>
        </div>
      </div>

      <ReportSummary
        items={[
          { label: 'Total Revenue', value: initialData.totalRevenue, format: 'currency' },
          { label: 'Total Cost', value: initialData.totalCost, format: 'currency' },
          { label: 'Gross Profit', value: initialData.grossProfit, format: 'currency', highlight: initialData.grossProfit >= 0 ? 'positive' : 'negative' },
          { label: 'Gross Margin', value: initialData.grossMargin, format: 'percentage', highlight: initialData.grossMargin >= 20 ? 'positive' : initialData.grossMargin < 0 ? 'negative' : 'neutral' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>
            Profit & Loss - {format(initialData.period.startDate, 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3 border-b pb-2">REVENUE</h3>
              <div className="space-y-2">
                {initialData.revenue.map((item, index) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-muted-foreground pl-4">{item.category}</span>
                    <span className="font-mono">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t font-semibold">
                  <span>TOTAL REVENUE</span>
                  <span className="font-mono">{formatCurrency(initialData.totalRevenue)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3 border-b pb-2">COST OF SERVICES</h3>
              <div className="space-y-2">
                {initialData.costs.map((item, index) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-muted-foreground pl-4">{item.category}</span>
                    <span className="font-mono">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t font-semibold">
                  <span>TOTAL COST</span>
                  <span className="font-mono">{formatCurrency(initialData.totalCost)}</span>
                </div>
              </div>
            </div>

            <div className="border-t-2 border-b-2 py-4 space-y-2">
              <div className="flex justify-between font-bold text-lg">
                <span>GROSS PROFIT</span>
                <span className={`font-mono ${initialData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(initialData.grossProfit)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>GROSS MARGIN</span>
                <span className={`font-mono ${initialData.grossMargin >= 20 ? 'text-green-600' : initialData.grossMargin < 0 ? 'text-red-600' : ''}`}>
                  {formatPercentage(initialData.grossMargin)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
