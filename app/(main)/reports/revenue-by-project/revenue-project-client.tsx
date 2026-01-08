'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReportSummary, ReportEmptyState } from '@/components/reports'
import { RevenueByProjectReport } from '@/lib/reports/revenue-project-utils'
import { formatCurrency, formatPercentage } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'

interface Props {
  initialData: RevenueByProjectReport | null
  userId?: string
}

export function RevenueByProjectClient({ initialData, userId }: Props) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'revenue_by_project', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const filteredItems = useMemo(() => {
    if (!initialData) return []
    if (!searchTerm) return initialData.items
    return initialData.items.filter(item =>
      item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [initialData, searchTerm])

  const handleProjectClick = (projectId: string) => router.push(`/projects/${projectId}`)

  if (!initialData || initialData.items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Revenue by Project</h1>
            <p className="text-muted-foreground">Revenue and profit analysis by project</p>
          </div>
        </div>
        <ReportEmptyState message="No project revenue found for the selected period." />
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
            <h1 className="text-2xl font-bold">Revenue by Project</h1>
            <p className="text-muted-foreground">Revenue and profit analysis by project</p>
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
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Project or Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportSummary
        items={[
          { label: 'Total Revenue', value: initialData.totalRevenue, format: 'currency' },
          { label: 'Total Cost', value: initialData.totalCost, format: 'currency' },
          { label: 'Gross Profit', value: initialData.totalRevenue - initialData.totalCost, format: 'currency', highlight: initialData.totalRevenue - initialData.totalCost >= 0 ? 'positive' : 'negative' },
          { label: 'Avg Margin', value: initialData.averageMargin, format: 'percentage', highlight: initialData.averageMargin >= 20 ? 'positive' : initialData.averageMargin < 0 ? 'negative' : 'neutral' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Revenue by Project ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.projectId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleProjectClick(item.projectId)}>
                  <TableCell className="font-medium">{item.projectName}</TableCell>
                  <TableCell>{item.customerName}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.totalRevenue)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.totalCost)}</TableCell>
                  <TableCell className={`text-right font-mono ${item.profitMargin >= 20 ? 'text-green-600' : item.profitMargin < 0 ? 'text-red-600' : ''}`}>
                    {formatPercentage(item.profitMargin)}
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
