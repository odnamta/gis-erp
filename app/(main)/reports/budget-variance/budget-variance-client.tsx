'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReportTable, ReportSummary } from '@/components/reports'
import { formatVariancePercentage } from '@/lib/reports/budget-variance-utils'
import { formatCurrency } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'
import { BudgetVarianceItem, ReportColumn, RowHighlight } from '@/types/reports'

interface BudgetVarianceDisplayItem extends Omit<BudgetVarianceItem, 'variancePercentage'> {
  variancePercentage: string
}

const columns: ReportColumn<BudgetVarianceDisplayItem>[] = [
  { key: 'pjoNumber', header: 'PJO Number', width: '150px' },
  { key: 'customerName', header: 'Customer' },
  { key: 'estimatedTotal', header: 'Estimated', align: 'right', format: 'currency' },
  { key: 'actualTotal', header: 'Actual', align: 'right', format: 'currency' },
  { key: 'varianceAmount', header: 'Variance', align: 'right', format: 'currency' },
  { key: 'variancePercentage', header: 'Variance %', align: 'right' },
]

interface Props {
  initialData: {
    items: BudgetVarianceItem[]
    summary: {
      totalEstimated: number
      totalActual: number
      totalVariance: number
      itemsWithWarning: number
    }
  }
  userId?: string
}

export function BudgetVarianceClient({ initialData, userId }: Props) {
  const router = useRouter()
  const [searchCustomer, setSearchCustomer] = useState('')
  const [showWarningsOnly, setShowWarningsOnly] = useState(false)

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'budget_variance', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const filteredItems = useMemo(() => {
    let result = initialData.items

    if (searchCustomer) {
      result = result.filter(item =>
        item.customerName.toLowerCase().includes(searchCustomer.toLowerCase()) ||
        item.pjoNumber.toLowerCase().includes(searchCustomer.toLowerCase())
      )
    }

    if (showWarningsOnly) {
      result = result.filter(item => item.hasWarning)
    }

    return result
  }, [initialData.items, searchCustomer, showWarningsOnly])

  const displayItems: BudgetVarianceDisplayItem[] = filteredItems.map(item => ({
    ...item,
    variancePercentage: formatVariancePercentage(item.variancePercentage),
  }))

  const handleRowClick = (row: BudgetVarianceDisplayItem) => {
    router.push(`/pjo/${row.pjoId}`)
  }

  const getRowHighlight = (row: BudgetVarianceDisplayItem): RowHighlight => {
    const original = initialData.items.find(i => i.pjoNumber === row.pjoNumber)
    return original?.hasWarning ? 'warning' : null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Budget Variance Report</h1>
            <p className="text-muted-foreground">Estimated vs actual costs per PJO</p>
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
              <Label htmlFor="searchCustomer">Search</Label>
              <Input
                id="searchCustomer"
                placeholder="Customer or PJO..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant={showWarningsOnly ? 'default' : 'outline'}
                onClick={() => setShowWarningsOnly(!showWarningsOnly)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Over Budget Only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportSummary
        items={[
          { label: 'Total Estimated', value: initialData.summary.totalEstimated, format: 'currency' },
          { label: 'Total Actual', value: initialData.summary.totalActual, format: 'currency' },
          { label: 'Total Variance', value: initialData.summary.totalVariance, format: 'currency', highlight: initialData.summary.totalVariance <= 0 ? 'positive' : 'negative' },
          { label: 'Items Over Budget', value: initialData.summary.itemsWithWarning, highlight: initialData.summary.itemsWithWarning === 0 ? 'positive' : 'negative' },
        ]}
      />

      {initialData.summary.itemsWithWarning > 0 && (
        <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <span className="text-yellow-800">
            {initialData.summary.itemsWithWarning} PJO(s) have exceeded budget by more than 10%
          </span>
        </div>
      )}

      <ReportTable
        columns={columns}
        data={displayItems}
        onRowClick={handleRowClick}
        highlightCondition={getRowHighlight}
        emptyMessage="No PJOs found for the selected filters."
      />
    </div>
  )
}
