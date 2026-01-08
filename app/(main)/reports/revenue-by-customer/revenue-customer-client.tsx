'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportSummary } from '@/components/reports'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RevenueByCustomerItem } from '@/lib/reports/revenue-customer-utils'
import { formatCurrency, formatPercentage } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'

interface Props {
  initialData: {
    items: RevenueByCustomerItem[]
    totalRevenue: number
    customerCount: number
  }
  userId?: string
}

export function RevenueByCustomerClient({ initialData, userId }: Props) {
  const router = useRouter()

  // Log report execution once on mount
  useEffect(() => {
    if (userId) {
      logReportExecution({
        reportCode: 'revenue_by_customer',
        userId,
        parameters: {}
      }).catch(console.error)
    }
  }, [userId])

  // Client-side filters
  const [searchCustomer, setSearchCustomer] = useState<string>('')
  const [minRevenue, setMinRevenue] = useState<string>('')

  // Apply filters (client-side, instant)
  const filteredItems = useMemo(() => {
    let result = initialData.items

    // Customer search filter
    if (searchCustomer) {
      result = result.filter(item =>
        item.customerName.toLowerCase().includes(searchCustomer.toLowerCase())
      )
    }

    // Minimum revenue filter
    const minR = minRevenue ? parseFloat(minRevenue) : undefined
    if (minR !== undefined) {
      result = result.filter(item => item.totalRevenue >= minR)
    }

    return result
  }, [initialData.items, searchCustomer, minRevenue])

  // Recalculate totals based on filtered data
  const filteredTotalRevenue = useMemo(() =>
    filteredItems.reduce((sum, item) => sum + item.totalRevenue, 0),
    [filteredItems]
  )

  const handleCustomerClick = (customerId: string) => {
    router.push(`/customers/${customerId}`)
  }

  const clearFilters = () => {
    setSearchCustomer('')
    setMinRevenue('')
  }

  const hasFilters = searchCustomer || minRevenue

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Revenue by Customer</h1>
            <p className="text-muted-foreground">Revenue breakdown by customer from completed JOs</p>
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
              <Label htmlFor="searchCustomer">Customer</Label>
              <Input
                id="searchCustomer"
                type="text"
                placeholder="Search customer..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minRevenue">Min Revenue</Label>
              <Input
                id="minRevenue"
                type="number"
                placeholder="e.g. 1000000"
                value={minRevenue}
                onChange={(e) => setMinRevenue(e.target.value)}
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

      {/* Summary */}
      <ReportSummary
        items={[
          { label: 'Total Revenue', value: filteredTotalRevenue, format: 'currency' },
          { label: 'Customers', value: filteredItems.length, format: 'number' },
          { label: 'Avg per Customer', value: filteredItems.length > 0 ? filteredTotalRevenue / filteredItems.length : 0, format: 'currency' },
        ]}
      />

      {/* Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Revenue by Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No revenue data found for the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">JOs</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow
                    key={item.customerId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleCustomerClick(item.customerId)}
                  >
                    <TableCell className="font-medium">{item.customerName}</TableCell>
                    <TableCell className="text-right">{item.joCount}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.totalRevenue)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPercentage(item.percentageOfTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
