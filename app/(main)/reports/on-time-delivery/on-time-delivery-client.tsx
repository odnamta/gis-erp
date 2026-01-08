'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ReportSummary, ReportEmptyState } from '@/components/reports'
import { OnTimeDeliveryReport } from '@/lib/reports/on-time-delivery-utils'
import { formatDate } from '@/lib/reports/report-utils'
import { logReportExecution } from '@/lib/reports/report-execution-service'

interface Props {
  initialData: OnTimeDeliveryReport | null
  userId?: string
}

export function OnTimeDeliveryClient({ initialData, userId }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showLateOnly, setShowLateOnly] = useState(false)

  useEffect(() => {
    if (userId) {
      logReportExecution({ reportCode: 'on_time_delivery', userId, parameters: {} }).catch(console.error)
    }
  }, [userId])

  const filteredItems = useMemo(() => {
    if (!initialData) return []
    let result = initialData.items

    if (searchTerm) {
      result = result.filter(item =>
        item.joNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (showLateOnly) {
      result = result.filter(item => !item.isOnTime)
    }

    return result
  }, [initialData, searchTerm, showLateOnly])

  if (!initialData || initialData.items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">On-Time Delivery Report</h1>
            <p className="text-muted-foreground">Delivery performance metrics</p>
          </div>
        </div>
        <ReportEmptyState message="No completed deliveries found for the selected period." />
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
            <h1 className="text-2xl font-bold">On-Time Delivery Report</h1>
            <p className="text-muted-foreground">Delivery performance metrics</p>
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
                placeholder="JO or Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant={showLateOnly ? 'default' : 'outline'}
                onClick={() => setShowLateOnly(!showLateOnly)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Late Only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportSummary
        items={[
          { label: 'On-Time', value: initialData.onTimeCount, format: 'number', highlight: 'positive' },
          { label: 'Late', value: initialData.lateCount, format: 'number', highlight: initialData.lateCount > 0 ? 'negative' : 'neutral' },
          { label: 'On-Time Rate', value: initialData.onTimePercentage, format: 'percentage', highlight: initialData.onTimePercentage >= 90 ? 'positive' : initialData.onTimePercentage < 70 ? 'negative' : 'neutral' },
          { label: 'Avg Delay (Late)', value: `${initialData.averageDelayDays.toFixed(1)} days` },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Delivery Details ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>JO Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Delay</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.joId} className={!item.isOnTime ? 'bg-red-50' : ''}>
                  <TableCell className="font-medium">{item.joNumber}</TableCell>
                  <TableCell>{item.customerName}</TableCell>
                  <TableCell>{formatDate(item.scheduledDate)}</TableCell>
                  <TableCell>{formatDate(item.completedDate)}</TableCell>
                  <TableCell>
                    {item.isOnTime ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />On Time
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        <XCircle className="h-3 w-3 mr-1" />Late
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.isOnTime ? '-' : `${item.delayDays} days`}
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
