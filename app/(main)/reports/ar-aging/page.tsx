'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportTable, ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { usePermissions } from '@/components/providers/permission-provider'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { buildARAgingReportData, filterByBucket, InvoiceData } from '@/lib/reports/ar-aging-utils'
import { formatCurrency } from '@/lib/reports/report-utils'
import { logReportExecution, logExportAction } from '@/lib/reports/report-execution-service'
import { createClient } from '@/lib/supabase/client'
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

export default function ARAgingReportPage() {
  const { profile } = usePermissions()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ARAgingReportData | null>(null)
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()

      const { data: invoices, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          customers (name)
        `)
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true })

      if (invoiceError) throw invoiceError

      const data = buildARAgingReportData(invoices as unknown as InvoiceData[] || [])
      setReportData(data)

      // Log report execution
      if (profile?.user_id) {
        logReportExecution({ reportCode: 'fin_ar_aging', userId: profile.user_id, parameters: {} }).catch(console.error)
      }
    } catch (err) {
      console.error('Error fetching AR aging data:', err)
      setError('Failed to load report data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [profile?.user_id])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  // Check permissions
  if (profile && !canAccessReport(profile.role, 'ar-aging')) {
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

  const handleRowClick = (row: AgingInvoice) => {
    router.push(`/invoices/${row.invoiceId}`)
  }

  const handleBucketClick = (bucket: AgingBucket) => {
    if (selectedBucket === bucket.label) {
      setSelectedBucket(null)
    } else {
      setSelectedBucket(bucket.label)
    }
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

  const filteredDetails = selectedBucket && reportData
    ? filterByBucket(reportData.details, selectedBucket)
    : reportData?.details || []

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <Button variant="outline" onClick={fetchReportData}>
          Refresh
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <ReportSkeleton showFilters={false} />
      ) : error ? (
        <ReportEmptyState title="Error" message={error} />
      ) : !reportData || reportData.details.length === 0 ? (
        <ReportEmptyState 
          message="No unpaid invoices found - all accounts are current!" 
          icon={<AlertCircle className="h-8 w-8 text-green-500" />}
        />
      ) : (
        <>
          {/* Aging Buckets Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {reportData.summary.map((bucket) => (
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
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(bucket.totalAmount)}
                  </div>
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
                  <p className="text-2xl font-bold">{formatCurrency(reportData.totals.totalAmount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                  <p className="text-2xl font-bold">{reportData.totals.totalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filter indicator */}
          {selectedBucket && (
            <div className="flex items-center gap-2 text-sm">
              <span>Showing:</span>
              <span className="font-medium">{selectedBucket}</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedBucket(null)}>
                Clear filter
              </Button>
            </div>
          )}

          {/* Invoice Table */}
          <ReportTable
            columns={columns}
            data={filteredDetails}
            onRowClick={handleRowClick}
            highlightCondition={getRowHighlight}
            emptyMessage="No invoices in this category."
          />
        </>
      )}
    </div>
  )
}
