'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReportSummary, ReportEmptyState } from '@/components/reports'
import { OutstandingInvoiceItem, OutstandingInvoicesReport } from '@/lib/reports/outstanding-invoices-utils'
import { formatCurrency, formatDate } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'

interface Props {
  initialData: OutstandingInvoicesReport | null
  userId?: string
}

export function OutstandingInvoicesClient({ initialData, userId }: Props) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'outstanding_invoices', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const filteredItems = useMemo(() => {
    if (!initialData) return []
    let result = initialData.items

    if (searchTerm) {
      result = result.filter(item =>
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.joNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedBucket) {
      result = result.filter(item => item.agingBucket === selectedBucket)
    }

    return result
  }, [initialData, searchTerm, selectedBucket])

  const handleInvoiceClick = (invoiceId: string) => router.push(`/invoices/${invoiceId}`)

  const getBucketColor = (bucket: string) => {
    if (bucket === 'Current') return 'bg-green-100 text-green-800'
    if (bucket === '1-30 Days') return 'bg-yellow-100 text-yellow-800'
    if (bucket === '31-60 Days') return 'bg-orange-100 text-orange-800'
    if (bucket === '61-90 Days') return 'bg-red-100 text-red-800'
    return 'bg-red-200 text-red-900'
  }

  if (!initialData || initialData.items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Outstanding Invoices</h1>
            <p className="text-muted-foreground">All unpaid invoices with aging breakdown</p>
          </div>
        </div>
        <ReportEmptyState message="No outstanding invoices - all accounts are current!" />
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
            <h1 className="text-2xl font-bold">Outstanding Invoices</h1>
            <p className="text-muted-foreground">All unpaid invoices with aging breakdown</p>
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
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Customer, Invoice, JO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportSummary
        items={[
          { label: 'Total Outstanding', value: initialData.totalAmount, format: 'currency', highlight: 'negative' },
          { label: 'Invoice Count', value: initialData.totalCount, format: 'number' },
        ]}
      />

      <div className="grid grid-cols-5 gap-4">
        {initialData.bucketBreakdown.map((bucket) => (
          <Card
            key={bucket.bucket}
            className={`cursor-pointer transition-all ${selectedBucket === bucket.bucket ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedBucket(prev => prev === bucket.bucket ? null : bucket.bucket)}
          >
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
            Invoice Details ({filteredItems.length})
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
              {filteredItems.map((item) => (
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
    </div>
  )
}
