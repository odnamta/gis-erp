'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReportSummary, ReportEmptyState } from '@/components/reports'
import { CustomerPaymentReport } from '@/lib/reports/payment-history-utils'
import { formatCurrency } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'

interface Props {
  initialData: CustomerPaymentReport | null
  userId?: string
}

export function PaymentHistoryClient({ initialData, userId }: Props) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [showSlowPayersOnly, setShowSlowPayersOnly] = useState(false)

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'customer_payment_history', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const filteredItems = useMemo(() => {
    if (!initialData) return []
    let result = initialData.items

    if (searchTerm) {
      result = result.filter(item =>
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (showSlowPayersOnly) {
      result = result.filter(item => item.isSlowPayer)
    }

    return result
  }, [initialData, searchTerm, showSlowPayersOnly])

  const handleCustomerClick = (customerId: string) => router.push(`/customers/${customerId}`)

  if (!initialData || initialData.items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Customer Payment History</h1>
            <p className="text-muted-foreground">Payment patterns and slow payer analysis</p>
          </div>
        </div>
        <ReportEmptyState message="No payment data found for the selected period." />
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
            <h1 className="text-2xl font-bold">Customer Payment History</h1>
            <p className="text-muted-foreground">Payment patterns and slow payer analysis</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Customer</Label>
              <Input
                id="search"
                placeholder="Customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant={showSlowPayersOnly ? 'default' : 'outline'}
                onClick={() => setShowSlowPayersOnly(!showSlowPayersOnly)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Slow Payers Only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportSummary
        items={[
          { label: 'Total Invoiced', value: initialData.totalInvoiced, format: 'currency' },
          { label: 'Total Paid', value: initialData.totalPaid, format: 'currency', highlight: 'positive' },
          { label: 'Outstanding', value: initialData.totalOutstanding, format: 'currency', highlight: initialData.totalOutstanding > 0 ? 'negative' : 'neutral' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History by Customer ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Invoiced</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Avg Days to Pay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow
                  key={item.customerId}
                  className={`cursor-pointer hover:bg-muted/50 ${item.isSlowPayer ? 'bg-yellow-50' : ''}`}
                  onClick={() => handleCustomerClick(item.customerId)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.customerName}
                      {item.isSlowPayer && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.totalInvoiced)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.totalPaid)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.outstandingBalance)}</TableCell>
                  <TableCell className={`text-right font-mono ${item.isSlowPayer ? 'text-yellow-600 font-semibold' : ''}`}>
                    {item.averageDaysToPay !== null ? `${item.averageDaysToPay.toFixed(0)} days` : 'N/A'}
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
