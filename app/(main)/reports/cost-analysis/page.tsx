'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PieChart } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportFilters, ReportSummary, ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { usePermissions } from '@/components/providers/permission-provider'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { buildCostAnalysisReport, CostAnalysisReport } from '@/lib/reports/cost-analysis-utils'
import { getDateRangeForPreset, parseDateRangeFromParams, formatCurrency, formatPercentage } from '@/lib/reports/report-utils'
import { createClient } from '@/lib/supabase/client'
import { DateRange } from '@/types/reports'

export default function CostAnalysisReportPage() {
  const { profile } = usePermissions()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<CostAnalysisReport | null>(null)

  const fetchReportData = useCallback(async (range: DateRange) => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const startDate = format(range.startDate, 'yyyy-MM-dd')
      const endDate = format(range.endDate, 'yyyy-MM-dd')

      const { data: costData, error: costError } = await supabase
        .from('pjo_cost_items')
        .select(`
          category,
          actual_amount,
          estimated_amount,
          proforma_job_orders!inner (
            id,
            created_at,
            job_orders (id)
          )
        `)
        .gte('proforma_job_orders.created_at', startDate)
        .lte('proforma_job_orders.created_at', endDate)

      if (costError) throw costError

      const costItems = ((costData || []) as any[]).map(item => ({
        category: item.category,
        amount: item.actual_amount ?? item.estimated_amount,
        joId: item.proforma_job_orders?.job_orders?.[0]?.id || item.proforma_job_orders?.id || '',
      }))

      const report = buildCostAnalysisReport(costItems, range)
      setReportData(report)
    } catch (err) {
      console.error('Error fetching cost analysis data:', err)
      setError('Failed to load report data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const fromParams = parseDateRangeFromParams(searchParams)
    const range = fromParams || getDateRangeForPreset('this-month')
    fetchReportData(range)
  }, [searchParams, fetchReportData])

  if (profile && !canAccessReport(profile.role, 'cost-analysis')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back to Reports</Link>
          </Button>
        </div>
        <ReportEmptyState title="Access Denied" message="You don't have permission to view this report." />
      </div>
    )
  }

  const handlePeriodChange = (range: DateRange) => fetchReportData(range)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cost Analysis by Category</h1>
            <p className="text-muted-foreground">Detailed cost breakdown by category</p>
          </div>
        </div>
      </div>

      <ReportFilters defaultPeriod="this-month" onPeriodChange={handlePeriodChange} />

      {loading ? (
        <ReportSkeleton />
      ) : error ? (
        <ReportEmptyState title="Error" message={error} />
      ) : !reportData || reportData.items.length === 0 ? (
        <ReportEmptyState message="No cost data found for the selected period." />
      ) : (
        <>
          <ReportSummary
            items={[
              { label: 'Total Cost', value: reportData.totalCost, format: 'currency' },
              { label: 'Categories', value: reportData.items.length, format: 'number' },
              { label: 'Avg per Category', value: reportData.items.length > 0 ? reportData.totalCost / reportData.items.length : 0, format: 'currency' },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Cost by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">JOs</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Avg/JO</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.items.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right">{item.joCount}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.totalAmount)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.averagePerJO)}</TableCell>
                      <TableCell className="text-right font-mono">{formatPercentage(item.percentageOfTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
