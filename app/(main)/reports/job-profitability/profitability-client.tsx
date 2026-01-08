'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReportTable } from '@/components/reports'
import {
  calculateProfitabilitySummary,
  sortJobsByMargin,
  filterJobsByDateRange,
  filterJobsByMarginRange,
  JobProfitabilityData,
} from '@/lib/reports/profitability-utils'
import { formatCurrency, formatPercentage } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'
import { ReportColumn, RowHighlight } from '@/types/reports'
import { cn } from '@/lib/utils'

const columns: ReportColumn<JobProfitabilityData>[] = [
  { key: 'joNumber', header: 'JO Number', width: '160px' },
  { key: 'customerName', header: 'Customer' },
  { key: 'projectName', header: 'Project' },
  { key: 'revenue', header: 'Revenue', align: 'right', format: 'currency' },
  { key: 'directCost', header: 'Direct Cost', align: 'right', format: 'currency' },
  { key: 'equipmentCost', header: 'Equipment', align: 'right', format: 'currency' },
  { key: 'overhead', header: 'Overhead', align: 'right', format: 'currency' },
  { key: 'netProfit', header: 'Net Profit', align: 'right', format: 'currency' },
  { key: 'netMargin', header: 'Margin %', align: 'right', format: 'percentage' },
]

interface Props {
  initialData: JobProfitabilityData[]
  userId?: string
}

export function JobProfitabilityClient({ initialData, userId }: Props) {
  // Log report execution once on mount
  useEffect(() => {
    if (userId) {
      logReportExecution({
        reportCode: 'job_profitability',
        userId,
        parameters: {}
      }).catch(console.error)
    }
  }, [userId])

  // Client-side filters
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [minMargin, setMinMargin] = useState<string>('')
  const [maxMargin, setMaxMargin] = useState<string>('')

  // Apply filters and sort (client-side, instant)
  const filteredJobs = useMemo(() => {
    let result = initialData

    // Date range filter
    if (dateFrom || dateTo) {
      result = filterJobsByDateRange(
        result,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined
      )
    }

    // Margin range filter
    const minM = minMargin ? parseFloat(minMargin) : undefined
    const maxM = maxMargin ? parseFloat(maxMargin) : undefined
    if (minM !== undefined || maxM !== undefined) {
      result = filterJobsByMarginRange(result, minM, maxM)
    }

    // Sort by margin descending
    return sortJobsByMargin(result)
  }, [initialData, dateFrom, dateTo, minMargin, maxMargin])

  // Calculate summary
  const summary = useMemo(() => calculateProfitabilitySummary(filteredJobs), [filteredJobs])

  const getRowHighlight = (row: JobProfitabilityData): RowHighlight => {
    if (row.netMargin < 0) return 'critical'
    if (row.netMargin < 10) return 'warning'
    return null
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setMinMargin('')
    setMaxMargin('')
  }

  const hasFilters = dateFrom || dateTo || minMargin || maxMargin

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Job Profitability Report</h1>
            <p className="text-muted-foreground">Net profit and margin analysis by job</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minMargin">Min Margin %</Label>
              <Input
                id="minMargin"
                type="number"
                placeholder="e.g. 10"
                value={minMargin}
                onChange={(e) => setMinMargin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxMargin">Max Margin %</Label>
              <Input
                id="maxMargin"
                type="number"
                placeholder="e.g. 50"
                value={maxMargin}
                onChange={(e) => setMaxMargin(e.target.value)}
              />
            </div>
          </div>
          {hasFilters && (
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Jobs</div>
            <div className="text-2xl font-bold">{summary.totalJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Total Revenue</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Direct Cost</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalDirectCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Equipment</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalEquipmentCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Overhead</div>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalOverhead)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Net Profit</div>
            <div className={cn(
              "text-2xl font-bold",
              summary.totalNetProfit >= 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatCurrency(summary.totalNetProfit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Avg Margin</div>
            <div className={cn(
              "text-2xl font-bold flex items-center gap-1",
              summary.averageMargin >= 20 ? "text-green-600" : summary.averageMargin < 0 ? "text-red-600" : ""
            )}>
              {summary.averageMargin >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {formatPercentage(summary.averageMargin)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs Table */}
      <ReportTable
        columns={columns}
        data={filteredJobs}
        highlightCondition={getRowHighlight}
        emptyMessage="No jobs match the selected filters."
      />
    </div>
  )
}
