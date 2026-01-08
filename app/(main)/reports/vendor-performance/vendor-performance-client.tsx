'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReportSummary, ReportEmptyState } from '@/components/reports'
import { VendorPerformanceReport } from '@/lib/reports/vendor-performance-utils'
import { formatCurrency, formatPercentage } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'

interface Props {
  initialData: VendorPerformanceReport | null
  userId?: string
}

export function VendorPerformanceClient({ initialData, userId }: Props) {
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'vendor_performance', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const filteredItems = useMemo(() => {
    if (!initialData) return []
    if (!searchTerm) return initialData.items
    return initialData.items.filter(item =>
      item.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [initialData, searchTerm])

  if (!initialData || initialData.items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cost Category Analysis</h1>
            <p className="text-muted-foreground">Spend analysis by cost category</p>
          </div>
        </div>
        <ReportEmptyState message="No vendor data found for the selected period." />
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
            <h1 className="text-2xl font-bold">Cost Category Analysis</h1>
            <p className="text-muted-foreground">Spend analysis by cost category</p>
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
              <Label htmlFor="search">Search Category</Label>
              <Input
                id="search"
                placeholder="Category name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportSummary
        items={[
          { label: 'Total Spend', value: initialData.totalSpend, format: 'currency' },
          { label: 'Categories', value: initialData.vendorCount, format: 'number' },
          { label: 'Avg per Category', value: initialData.vendorCount > 0 ? initialData.totalSpend / initialData.vendorCount : 0, format: 'currency' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Cost Categories ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">JOs</TableHead>
                <TableHead className="text-right">Total Spend</TableHead>
                <TableHead className="text-right">Avg/JO</TableHead>
                <TableHead className="text-right">On-Time Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.vendorName}>
                  <TableCell className="font-medium">{item.vendorName}</TableCell>
                  <TableCell className="text-right">{item.joCount}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.totalSpend)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.averageCostPerJO)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {item.onTimeRate !== null ? formatPercentage(item.onTimeRate) : 'N/A'}
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
