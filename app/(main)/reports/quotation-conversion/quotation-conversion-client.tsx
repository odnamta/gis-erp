'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportSummary, ReportEmptyState } from '@/components/reports'
import { getStatusDisplayName, getStatusColorClass } from '@/lib/reports/quotation-utils'
import { formatPercentage } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'
import { QuotationConversionReportData, PJOStatusForReport } from '@/types/reports'
import { cn } from '@/lib/utils'

interface Props {
  initialData: QuotationConversionReportData | null
  userId?: string
}

export function QuotationConversionClient({ initialData, userId }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'quotation_conversion', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const handleStatusClick = (status: PJOStatusForReport) => {
    const statusParam = status === 'converted' ? 'approved' : status
    router.push(`/pjo?status=${statusParam}`)
  }

  if (!initialData || initialData.totals.totalPJOs === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Quotation Conversion Report</h1>
            <p className="text-muted-foreground">PJO conversion and pipeline analysis</p>
          </div>
        </div>
        <ReportEmptyState message="No quotations found for the selected period." />
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
            <h1 className="text-2xl font-bold">Quotation Conversion Report</h1>
            <p className="text-muted-foreground">PJO conversion and pipeline analysis</p>
          </div>
        </div>
      </div>

      <ReportSummary
        items={[
          { label: 'Total PJOs', value: initialData.totals.totalPJOs },
          { label: 'Overall Conversion Rate', value: initialData.totals.overallConversionRate, format: 'percentage', highlight: initialData.totals.overallConversionRate >= 50 ? 'positive' : 'neutral' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Status Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {initialData.statusCounts.map((status, index) => (
              <div key={status.status} className="flex items-center">
                <button
                  onClick={() => handleStatusClick(status.status)}
                  className={cn(
                    'flex flex-col items-center p-4 rounded-lg min-w-[120px] transition-all hover:scale-105',
                    getStatusColorClass(status.status)
                  )}
                >
                  <span className="text-2xl font-bold">{status.count}</span>
                  <span className="text-sm font-medium">{getStatusDisplayName(status.status)}</span>
                  <span className="text-xs opacity-75">{formatPercentage(status.percentage)}</span>
                </button>
                {index < initialData.statusCounts.length - 1 && (
                  <ArrowRight className="h-5 w-5 mx-2 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {initialData.conversionRates.map((rate) => (
              <div key={`${rate.from}-${rate.to}`} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{rate.from}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{rate.to}</span>
                </div>
                <div className="text-3xl font-bold text-center">{formatPercentage(rate.rate)}</div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(rate.rate, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {initialData.pipelineMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average Time in Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {initialData.pipelineMetrics.map((metric) => (
                <div key={metric.stage} className="text-center p-4 border rounded-lg">
                  <div className="text-3xl font-bold">{metric.averageDays}</div>
                  <div className="text-sm text-muted-foreground">days</div>
                  <div className="text-sm font-medium mt-2">{metric.stage}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
