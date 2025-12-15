'use client'

import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/format'
import type { ARAgingData, RecentPayment, AgingBucketType } from '@/lib/finance-dashboard-utils'

interface ExportReportDropdownProps {
  arAging: ARAgingData
  recentPayments: RecentPayment[]
}

const bucketLabels: Record<AgingBucketType, string> = {
  current: '0-30 days',
  days31to60: '31-60 days',
  days61to90: '61-90 days',
  over90: '90+ days',
}

export function ExportReportDropdown({ arAging, recentPayments }: ExportReportDropdownProps) {
  const exportARAgingCSV = () => {
    const headers = ['Aging Bucket', 'Invoice Count', 'Total Amount']
    const rows: string[][] = []

    const buckets: AgingBucketType[] = ['current', 'days31to60', 'days61to90', 'over90']
    for (const bucket of buckets) {
      const data = arAging[bucket]
      rows.push([
        bucketLabels[bucket],
        data.count.toString(),
        data.amount.toString(),
      ])
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    downloadFile(csvContent, 'ar-aging-report.csv', 'text/csv')
  }

  const exportPaymentsCSV = () => {
    const headers = ['Date', 'Invoice #', 'Customer', 'Amount', 'Reference']
    const rows = recentPayments.map(payment => [
      payment.paid_at.split('T')[0],
      payment.invoice_number,
      `"${payment.customer_name}"`,
      payment.total_amount.toString(),
      `"${payment.payment_reference || ''}"`,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n')

    downloadFile(csvContent, 'recent-payments-report.csv', 'text/csv')
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportARAgingCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          AR Aging Report (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPaymentsCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Payments Report (CSV)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <FileText className="h-4 w-4 mr-2" />
          PDF Reports (Coming Soon)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Export AR aging data to CSV format
 * Used for Property 11: Export completeness testing
 */
export function exportARAgingToCSV(arAging: ARAgingData): string {
  const headers = ['Aging Bucket', 'Invoice Count', 'Total Amount', 'Invoice IDs']
  const rows: string[][] = []

  const buckets: AgingBucketType[] = ['current', 'days31to60', 'days61to90', 'over90']
  for (const bucket of buckets) {
    const data = arAging[bucket]
    rows.push([
      bucketLabels[bucket],
      data.count.toString(),
      data.amount.toString(),
      data.invoiceIds.join(';'),
    ])
  }

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')
}
