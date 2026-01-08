'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, PieChart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReportSummary } from '@/components/reports'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CostAnalysisItem } from '@/lib/reports/cost-analysis-utils'
import { formatCurrency, formatPercentage } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'

interface Props {
  initialData: {
    items: CostAnalysisItem[]
    totalCost: number
  }
  userId?: string
}

export function CostAnalysisClient({ initialData, userId }: Props) {
  // Log report execution once on mount
  useEffect(() => {
    if (userId) {
      logReportExecution({
        reportCode: 'cost_analysis',
        userId,
        parameters: {}
      }).catch(console.error)
    }
  }, [userId])

  // Client-side filters
  const [minAmount, setMinAmount] = useState<string>('')
  const [searchCategory, setSearchCategory] = useState<string>('')

  // Apply filters (client-side, instant)
  const filteredItems = useMemo(() => {
    let result = initialData.items

    // Category search filter
    if (searchCategory) {
      result = result.filter(item =>
        item.category.toLowerCase().includes(searchCategory.toLowerCase())
      )
    }

    // Minimum amount filter
    const minA = minAmount ? parseFloat(minAmount) : undefined
    if (minA !== undefined) {
      result = result.filter(item => item.totalAmount >= minA)
    }

    return result
  }, [initialData.items, searchCategory, minAmount])

  // Recalculate totals based on filtered data
  const filteredTotalCost = useMemo(() =>
    filteredItems.reduce((sum, item) => sum + item.totalAmount, 0),
    [filteredItems]
  )

  const clearFilters = () => {
    setMinAmount('')
    setSearchCategory('')
  }

  const hasFilters = minAmount || searchCategory

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Cost Analysis by Category</h1>
            <p className="text-muted-foreground">Detailed cost breakdown by category</p>
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
              <Label htmlFor="searchCategory">Category</Label>
              <Input
                id="searchCategory"
                type="text"
                placeholder="Search category..."
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minAmount">Min Amount</Label>
              <Input
                id="minAmount"
                type="number"
                placeholder="e.g. 1000000"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
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
          { label: 'Total Cost', value: filteredTotalCost, format: 'currency' },
          { label: 'Categories', value: filteredItems.length, format: 'number' },
          { label: 'Avg per Category', value: filteredItems.length > 0 ? filteredTotalCost / filteredItems.length : 0, format: 'currency' },
        ]}
      />

      {/* Cost Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Cost by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cost data found for the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">JOs</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Avg/JO</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.category}>
                    <TableCell className="font-medium">{item.category}</TableCell>
                    <TableCell className="text-right">{item.joCount}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.totalAmount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(item.averagePerJO)}</TableCell>
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
