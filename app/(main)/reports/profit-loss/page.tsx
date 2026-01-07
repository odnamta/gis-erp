'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportFilters, ReportSummary, ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { usePermissions } from '@/components/providers/permission-provider'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { buildPLReportData } from '@/lib/reports/profit-loss-utils'
import { getDateRangeForPreset, parseDateRangeFromParams, formatCurrency, formatPercentage } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'
import { createClient } from '@/lib/supabase/client'
import { DateRange, PLReportData } from '@/types/reports'

export default function ProfitLossReportPage() {
  const { profile } = usePermissions()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<PLReportData | null>(null)

  const fetchReportData = useCallback(async (range: DateRange) => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const startDate = format(range.startDate, 'yyyy-MM-dd')
      const endDate = format(range.endDate, 'yyyy-MM-dd')

      // Fetch revenue items from PJOs in the period
      const { data: revenueData, error: revenueError } = await supabase
        .from('pjo_revenue_items')
        .select(`
          description,
          subtotal,
          unit,
          proforma_job_orders!inner (
            created_at,
            status
          )
        `)
        .gte('proforma_job_orders.created_at', startDate)
        .lte('proforma_job_orders.created_at', endDate)
        .in('proforma_job_orders.status', ['approved', 'converted'])

      if (revenueError) throw revenueError

      // Fetch cost items from PJOs in the period
      const { data: costData, error: costError } = await supabase
        .from('pjo_cost_items')
        .select(`
          category,
          actual_amount,
          estimated_amount,
          proforma_job_orders!inner (
            created_at,
            status
          )
        `)
        .gte('proforma_job_orders.created_at', startDate)
        .lte('proforma_job_orders.created_at', endDate)
        .in('proforma_job_orders.status', ['approved', 'converted'])

      if (costError) throw costError

      const revenueItems = ((revenueData || []) as any[]).map(item => ({
        description: item.description,
        subtotal: item.subtotal ?? 0,
        unit: item.unit,
      }))

      const costItems = ((costData || []) as any[]).map(item => ({
        category: item.category,
        actual_amount: item.actual_amount,
        estimated_amount: item.estimated_amount,
      }))

      const data = buildPLReportData(revenueItems, costItems, range)
      setReportData(data)

      // Log report execution
      if (profile?.user_id) {
        logReportExecution({ reportCode: 'fin_profit_loss', userId: profile.user_id, parameters: { startDate, endDate } }).catch(console.error)
      }
    } catch (err) {
      console.error('Error fetching P&L data:', err)
      setError('Failed to load report data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [profile?.user_id])

  useEffect(() => {
    const fromParams = parseDateRangeFromParams(searchParams)
    const range = fromParams || getDateRangeForPreset('this-month')
    fetchReportData(range)
  }, [searchParams, fetchReportData])

  // Check permissions
  if (profile && !canAccessReport(profile.role, 'profit-loss')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back to Reports</Link>
          </Button>
        </div>
        <ReportEmptyState
          title="Access Denied"
          message="You don't have permission to view this report."
        />
      </div>
    )
  }

  const handlePeriodChange = (range: DateRange) => {
    fetchReportData(range)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Filters */}
      <ReportFilters defaultPeriod="this-month" onPeriodChange={handlePeriodChange} />

      {/* Content */}
      {loading ? (
        <ReportSkeleton />
      ) : error ? (
        <ReportEmptyState title="Error" message={error} />
      ) : !reportData || (reportData.revenue.length === 0 && reportData.costs.length === 0) ? (
        <ReportEmptyState message="No transactions found for the selected period." />
      ) : (
        <>
          {/* Summary */}
          <ReportSummary
            items={[
              { label: 'Total Revenue', value: reportData.totalRevenue, format: 'currency' },
              { label: 'Total Cost', value: reportData.totalCost, format: 'currency' },
              { label: 'Gross Profit', value: reportData.grossProfit, format: 'currency', highlight: reportData.grossProfit >= 0 ? 'positive' : 'negative' },
              { label: 'Gross Margin', value: reportData.grossMargin, format: 'percentage', highlight: reportData.grossMargin >= 20 ? 'positive' : reportData.grossMargin < 0 ? 'negative' : 'neutral' },
            ]}
          />

          {/* P&L Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Profit & Loss - {format(reportData.period.startDate, 'MMMM yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Revenue Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 border-b pb-2">REVENUE</h3>
                  <div className="space-y-2">
                    {reportData.revenue.map((item, index) => (
                      <div key={index} className="flex justify-between py-1">
                        <span className="text-muted-foreground pl-4">{item.category}</span>
                        <span className="font-mono">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-t font-semibold">
                      <span>TOTAL REVENUE</span>
                      <span className="font-mono">{formatCurrency(reportData.totalRevenue)}</span>
                    </div>
                  </div>
                </div>

                {/* Cost Section */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 border-b pb-2">COST OF SERVICES</h3>
                  <div className="space-y-2">
                    {reportData.costs.map((item, index) => (
                      <div key={index} className="flex justify-between py-1">
                        <span className="text-muted-foreground pl-4">{item.category}</span>
                        <span className="font-mono">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-t font-semibold">
                      <span>TOTAL COST</span>
                      <span className="font-mono">{formatCurrency(reportData.totalCost)}</span>
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="border-t-2 border-b-2 py-4 space-y-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>GROSS PROFIT</span>
                    <span className={`font-mono ${reportData.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(reportData.grossProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>GROSS MARGIN</span>
                    <span className={`font-mono ${reportData.grossMargin >= 20 ? 'text-green-600' : reportData.grossMargin < 0 ? 'text-red-600' : ''}`}>
                      {formatPercentage(reportData.grossMargin)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
