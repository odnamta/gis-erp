'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResourceTypeBadge,
  UtilizationBadge,
} from '@/components/ui/resource-status-badge'
import {
  UtilizationReport as UtilizationReportType,
  ResourceType,
  RESOURCE_TYPE_LABELS,
} from '@/types/resource-scheduling'
import { getUtilizationReport } from '@/lib/resource-scheduling-actions'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface UtilizationReportProps {
  initialData?: UtilizationReportType[]
}

export function UtilizationReport({ initialData }: UtilizationReportProps) {
  const [loading, setLoading] = useState(!initialData)
  const [data, setData] = useState<UtilizationReportType[]>(initialData || [])
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [resourceType, setResourceType] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo, resourceType])

  const loadData = async () => {
    setLoading(true)
    try {
      const report = await getUtilizationReport({
        date_from: dateFrom,
        date_to: dateTo,
        resource_type: resourceType !== 'all' ? (resourceType as ResourceType) : undefined,
      })
      setData(report)
    } catch (error) {
      console.error('Failed to load utilization report:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate summary stats
  const totalResources = data.length
  const avgUtilization =
    data.length > 0
      ? data.reduce((sum, r) => sum + r.utilization_percentage, 0) / data.length
      : 0
  const overAllocated = data.filter((r) => r.utilization_percentage > 100).length
  const underUtilized = data.filter((r) => r.utilization_percentage < 50).length

  const setQuickRange = (days: number) => {
    setDateTo(format(new Date(), 'yyyy-MM-dd'))
    setDateFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'))
  }

  const setThisWeek = () => {
    const now = new Date()
    setDateFrom(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
    setDateTo(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'))
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Resource Type</Label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={setThisWeek}>
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange(7)}>
                Last 7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setQuickRange(30)}>
                Last 30 Days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Resources</p>
                <p className="text-2xl font-bold">{totalResources}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Minus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Utilization</p>
                <p className="text-2xl font-bold">{avgUtilization.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Over-allocated</p>
                <p className="text-2xl font-bold">{overAllocated}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Under-utilized (&lt;50%)</p>
                <p className="text-2xl font-bold">{underUtilized}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Planned Hours</TableHead>
                  <TableHead className="text-right">Actual Hours</TableHead>
                  <TableHead className="text-right">Available Hours</TableHead>
                  <TableHead>Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No data available for the selected period
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((resource) => (
                    <TableRow key={resource.resource_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{resource.resource_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {resource.resource_code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ResourceTypeBadge type={resource.resource_type} />
                      </TableCell>
                      <TableCell className="text-right">
                        {resource.total_planned_hours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right">
                        {resource.total_actual_hours.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right">
                        {resource.total_available_hours.toFixed(1)}h
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 min-w-[150px]">
                          <Progress
                            value={Math.min(resource.utilization_percentage, 100)}
                            className="h-2 flex-1"
                          />
                          <UtilizationBadge percentage={resource.utilization_percentage} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
