'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ReportSummary, ReportEmptyState } from '@/components/reports'
import { SalesPipelineReport } from '@/lib/reports/sales-pipeline-utils'
import { formatCurrency, formatPercentage } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'
import { PJOStatusForReport } from '@/types/reports'

const STATUS_LABELS: Record<PJOStatusForReport, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  converted: 'Converted to JO',
  rejected: 'Rejected',
}

interface Props {
  initialData: SalesPipelineReport | null
  userId?: string
}

export function SalesPipelineClient({ initialData, userId }: Props) {
  const router = useRouter()

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'sales_pipeline', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const handleStatusClick = (status: PJOStatusForReport) => router.push(`/pjo?status=${status}`)

  if (!initialData || initialData.items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Sales Pipeline Analysis</h1>
            <p className="text-muted-foreground">PJO pipeline stages and weighted values</p>
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
            <h1 className="text-2xl font-bold">Sales Pipeline Analysis</h1>
            <p className="text-muted-foreground">PJO pipeline stages and weighted values</p>
          </div>
        </div>
      </div>

      <ReportSummary
        items={[
          { label: 'Pipeline Value', value: initialData.totalPipelineValue, format: 'currency' },
          { label: 'Weighted Value', value: initialData.weightedPipelineValue, format: 'currency', highlight: 'positive' },
          ...(initialData.changePercentage !== undefined ? [{ label: 'vs Previous', value: initialData.changePercentage, format: 'percentage' as const, highlight: initialData.changePercentage >= 0 ? 'positive' as const : 'negative' as const }] : []),
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pipeline by Stage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">% of Pipeline</TableHead>
                <TableHead className="text-right">Probability</TableHead>
                <TableHead className="text-right">Weighted Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialData.items.map((item) => (
                <TableRow key={item.status} className="cursor-pointer hover:bg-muted/50" onClick={() => handleStatusClick(item.status)}>
                  <TableCell>
                    <Badge variant="outline">{STATUS_LABELS[item.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.count}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.totalValue)}</TableCell>
                  <TableCell className="text-right font-mono">{formatPercentage(item.percentageOfPipeline)}</TableCell>
                  <TableCell className="text-right font-mono">{formatPercentage(item.probability * 100)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.weightedValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
