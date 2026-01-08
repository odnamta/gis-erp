'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReportSummary, ReportEmptyState } from '@/components/reports'
import { CustomerAcquisitionReport } from '@/lib/reports/customer-acquisition-utils'
import { formatCurrency, formatDate } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'

interface Props {
  initialData: CustomerAcquisitionReport | null
  userId?: string
}

export function CustomerAcquisitionClient({ initialData, userId }: Props) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'customer_acquisition', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const filteredItems = useMemo(() => {
    if (!initialData) return []
    if (!searchTerm) return initialData.items
    return initialData.items.filter(item =>
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [initialData, searchTerm])

  const handleCustomerClick = (customerId: string) => router.push(`/customers/${customerId}`)

  if (!initialData || initialData.items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Customer Acquisition</h1>
            <p className="text-muted-foreground">New customer trends and revenue analysis</p>
          </div>
        </div>
        <ReportEmptyState message="No new customers acquired in the selected period." />
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
            <h1 className="text-2xl font-bold">Customer Acquisition</h1>
            <p className="text-muted-foreground">New customer trends and revenue analysis</p>
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
          </div>
        </CardContent>
      </Card>

      <ReportSummary
        items={[
          { label: 'New Customers', value: initialData.totalNewCustomers, format: 'number', highlight: 'positive' },
          { label: 'Avg Revenue', value: initialData.averageRevenuePerCustomer, format: 'currency' },
          ...(initialData.acquisitionTrend !== null ? [{ label: 'vs Previous', value: initialData.acquisitionTrend, format: 'percentage' as const, highlight: initialData.acquisitionTrend >= 0 ? 'positive' as const : 'negative' as const }] : []),
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            New Customers ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Acquisition Date</TableHead>
                <TableHead>First Project</TableHead>
                <TableHead className="text-right">Revenue to Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.customerId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleCustomerClick(item.customerId)}>
                  <TableCell className="font-medium">{item.customerName}</TableCell>
                  <TableCell>{formatDate(item.acquisitionDate)}</TableCell>
                  <TableCell>{item.firstProject || <span className="text-muted-foreground">No projects</span>}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.totalRevenueToDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
