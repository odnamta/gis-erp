'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReportSummary, ReportEmptyState } from '@/components/reports'
import { filterByStatus, JOSummaryReport, JOStatus } from '@/lib/reports/jo-summary-utils'
import { formatCurrency, formatPercentage } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'

const STATUS_LABELS: Record<JOStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  submitted_to_finance: 'Submitted',
  invoiced: 'Invoiced',
  closed: 'Closed',
}

interface Props {
  initialData: JOSummaryReport | null
  userId?: string
}

export function JOSummaryClient({ initialData, userId }: Props) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<JOStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'jo_summary', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const filteredItems = useMemo(() => {
    if (!initialData) return []
    let result = filterByStatus(initialData.items, statusFilter)

    if (searchTerm) {
      result = result.filter(item =>
        item.joNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.projectName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return result
  }, [initialData, statusFilter, searchTerm])

  const handleJOClick = (joId: string) => router.push(`/job-orders/${joId}`)

  if (!initialData || initialData.items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Job Order Summary</h1>
            <p className="text-muted-foreground">Overview of all job orders</p>
          </div>
        </div>
        <ReportEmptyState message="No job orders found for the selected period." />
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
            <h1 className="text-2xl font-bold">Job Order Summary</h1>
            <p className="text-muted-foreground">Overview of all job orders</p>
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
                placeholder="JO, Customer, Project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as JOStatus | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportSummary
        items={[
          { label: 'Total JOs', value: initialData.totalCount, format: 'number' },
          { label: 'Total Revenue', value: initialData.totalRevenue, format: 'currency' },
          { label: 'Total Cost', value: initialData.totalCost, format: 'currency' },
          { label: 'Avg Margin', value: initialData.averageMargin, format: 'percentage', highlight: initialData.averageMargin >= 20 ? 'positive' : initialData.averageMargin < 0 ? 'negative' : 'neutral' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Job Orders ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>JO Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.joId} className="cursor-pointer hover:bg-muted/50" onClick={() => handleJOClick(item.joId)}>
                  <TableCell className="font-medium">{item.joNumber}</TableCell>
                  <TableCell>{item.customerName}</TableCell>
                  <TableCell>{item.projectName}</TableCell>
                  <TableCell><Badge variant="outline">{STATUS_LABELS[item.status]}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.revenue)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(item.cost)}</TableCell>
                  <TableCell className={`text-right font-mono ${item.margin >= 20 ? 'text-green-600' : item.margin < 0 ? 'text-red-600' : ''}`}>
                    {formatPercentage(item.margin)}
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
