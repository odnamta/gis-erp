'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTable, ReportEmptyState } from '@/components/reports'
import { filterByBucket } from '@/lib/reports/ar-aging-utils'
import { formatCurrency } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'
import { ARAgingReportData, AgingInvoice, ReportColumn, RowHighlight, AgingBucket } from '@/types/reports'
import { cn } from '@/lib/utils'

const columns: ReportColumn<AgingInvoice>[] = [
  { key: 'invoiceNumber', header: 'Invoice #', width: '140px' },
  { key: 'customerName', header: 'Customer' },
  { key: 'invoiceDate', header: 'Invoice Date', format: 'date' },
  { key: 'dueDate', header: 'Due Date', format: 'date' },
  { key: 'amount', header: 'Amount', align: 'right', format: 'currency' },
  { key: 'daysOverdue', header: 'Days Overdue', align: 'right' },
]

interface Props {
  initialData: ARAgingReportData | null
  userId?: string
}

export function ARAgingClient({ initialData, userId }: Props) {
  const router = useRouter()
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'fin_ar_aging', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const handleRowClick = (row: AgingInvoice) => {
    router.push(`/invoices/${row.invoiceId}`)
  }

  const handleBucketClick = (bucket: AgingBucket) => {
    setSelectedBucket(prev => prev === bucket.label ? null : bucket.label)
  }

  const getRowHighlight = (row: AgingInvoice): RowHighlight => {
    if (row.severity === 'critical') return 'critical'
    if (row.severity === 'warning') return 'warning'
    return null
  }

  const getBucketColorClass = (bucket: AgingBucket): string => {
    if (bucket.label === 'Current') return 'bg-green-50 border-green-200 hover:bg-green-100'
    if (bucket.label === '1-30 Days') return 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    if (bucket.label === '31-60 Days') return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
    if (bucket.label === '61-90 Days') return 'bg-orange-50 border-orange-200 hover:bg-orange-100'
    return 'bg-red-50 border-red-200 hover:bg-red-100'
  }

  const filteredDetails = useMemo(() => {
    if (!initialData) return []
    return selectedBucket ? filterByBucket(initialData.details, selectedBucket) : initialData.details
  }, [initialData, selectedBucket])

  if (!initialData || initialData.details.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">AR Aging Report</h1>
            <p className="text-muted-foreground">Outstanding invoices by age</p>
          </div>
        </div>
        <ReportEmptyState 
          message="No unpaid invoices found - all accounts are current!" 
          icon={<AlertCircle className="h-8 w-8 text-green-500" />}
        />
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
            <h1 className="text-2xl font-bold">AR Aging Report</h1>
            <p className="text-muted-foreground">Outstanding invoices by age</p>
          </div>
        </div>
      </div>

      {/* Aging Buckets Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {initialData.summary.map((bucket) => (
          <Card
            key={bucket.label}
            className={cn(
              'cursor-pointer transition-all border-2',
              getBucketColorClass(bucket),
              selectedBucket === bucket.label && 'ring-2 ring-primary'
            )}
            onClick={() => handleBucketClick(bucket)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{bucket.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bucket.count}</div>
              <div className="text-sm text-muted-foreground">{formatCurrency(bucket.totalAmount)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Totals */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Outstanding</p>
              <p className="text-2xl font-bold">{formatCurrency(initialData.totals.totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="text-2xl font-bold">{initialData.totals.totalCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedBucket && (
        <div className="flex items-center gap-2 text-sm">
          <span>Showing:</span>
          <span className="font-medium">{selectedBucket}</span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedBucket(null)}>Clear filter</Button>
        </div>
      )}

      <ReportTable
        columns={columns}
        data={filteredDetails}
        onRowClick={handleRowClick}
        highlightCondition={getRowHighlight}
        emptyMessage="No invoices in this category."
      />
    </div>
  )
}
