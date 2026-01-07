'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ReportSummary, ReportSkeleton, ReportEmptyState } from '@/components/reports'
import { usePermissions } from '@/components/providers/permission-provider'
import { canAccessReport } from '@/lib/reports/report-permissions'
import { buildOutstandingInvoicesReport, calculateDaysOutstanding, getAgingBucket, OutstandingInvoicesReport } from '@/lib/reports/outstanding-invoices-utils'
import { formatCurrency, formatDate } from '@/lib/reports/report-utils'
import { createClient } from '@/lib/supabase/client'

export default function OutstandingInvoicesReportPage() {
  const { profile } = usePermissions()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<OutstandingInvoicesReport | null>(null)

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          invoice_date,
          due_date,
          job_orders!inner (
            jo_number,
            proforma_job_orders!inner (
              projects!inner (
                customers!inner (name)
              )
            )
          )
        `)
        .in('status', ['draft', 'sent', 'overdue'])

      if (invoiceError) throw invoiceError

      const items = ((invoiceData || []) as any[]).map(inv => {
        const daysOutstanding = calculateDaysOutstanding(new Date(inv.due_date))
        return {
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          customerName: inv.job_orders?.proforma_job_orders?.projects?.customers?.name || 'Unknown',
          joNumber: inv.job_orders?.jo_number || 'Unknown',
          invoiceDate: new Date(inv.invoice_date),
          dueDate: new Date(inv.due_date),
          amount: inv.total_amount || 0,
          daysOutstanding,
          agingBucket: getAgingBucket(daysOutstanding),
        }
      })

      const report = buildOutstandingInvoicesReport(items)
      setReportData(report)
    } catch (err) {
      console.error('Error fetching outstanding invoices data:', err)
      setError('Failed to load report data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReportData()
  }, [fetchReportData])

  if (profile && !canAccessReport(profile.role, 'outstanding-invoices')) {
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

  const handleInvoiceClick = (invoiceId: string) => router.push(`/invoices/${invoiceId}`)

  const getBucketColor = (bucket: string) => {
    if (bucket === 'Current') return 'bg-green-100 text-green-800'
    if (bucket === '1-30 Days') return 'bg-yellow-100 text-yellow-800'
    if (bucket === '31-60 Days') return 'bg-orange-100 text-orange-800'
    if (bucket === '61-90 Days') return 'bg-red-100 text-red-800'
    return 'bg-red-200 text-red-900'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Outstanding Invoices</h1>
            <p className="text-muted-foreground">All unpaid invoices with aging breakdown</p>
          </div>
        </div>
      </div>

      {loading ? (
        <ReportSkeleton />
      ) : error ? (
        <ReportEmptyState title="Error" message={error} />
      ) : !reportData || reportData.items.length === 0 ? (
        <ReportEmptyState message="No outstanding invoices - all accounts are current!" />
      ) : (
        <>
          <ReportSummary
            items={[
              { label: 'Total Outstanding', value: reportData.totalAmount, format: 'currency', highlight: 'negative' },
              { label: 'Invoice Count', value: reportData.totalCount, format: 'number' },
            ]}
          />

          <div className="grid grid-cols-5 gap-4">
            {reportData.bucketBreakdown.map((bucket) => (
              <Card key={bucket.bucket}>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground">{bucket.bucket}</div>
                  <div className="text-2xl font-bold">{bucket.count}</div>
                  <div className="text-sm font-mono">{formatCurrency(bucket.amount)}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>JO #</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Aging</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.items.map((item) => (
                    <TableRow key={item.invoiceId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleInvoiceClick(item.invoiceId)}>
                      <TableCell className="font-medium">{item.invoiceNumber}</TableCell>
                      <TableCell>{item.customerName}</TableCell>
                      <TableCell>{item.joNumber}</TableCell>
                      <TableCell>{formatDate(item.invoiceDate)}</TableCell>
                      <TableCell>{formatDate(item.dueDate)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getBucketColor(item.agingBucket)}>{item.agingBucket}</Badge>
                      </TableCell>
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
