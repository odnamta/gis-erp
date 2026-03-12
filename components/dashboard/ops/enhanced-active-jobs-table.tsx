'use client'

import Link from 'next/link'
import { Eye, Truck, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { OperationsJobItem } from '@/lib/ops-dashboard-enhanced-utils'
import { formatCurrency } from '@/lib/utils/format'

interface EnhancedActiveJobsTableProps {
  jobs: OperationsJobItem[]
}

export function EnhancedActiveJobsTable({ jobs }: EnhancedActiveJobsTableProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Active Jobs</CardTitle>
          <Link href="/job-orders">
            <Button variant="link" size="sm">View All Jobs →</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No active jobs</p>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any active job orders at the moment.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const _getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getDeliveryProgress = (completed: number, total: number) => {
    if (total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  // Check for over-budget jobs
  const overBudgetJobs = jobs.filter((j) => j.isOverBudget)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Active Jobs</CardTitle>
        <Link href="/job-orders">
          <Button variant="link" size="sm">View All Jobs →</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">JO #</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Route</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Budget vs Actual</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Progress</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const progress = getDeliveryProgress(
                  job.completedDeliveries,
                  job.totalDeliveries
                )
                return (
                  <tr key={job.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{job.joNumber}</td>
                    <td className="px-4 py-3 text-sm">{job.customerName}</td>
                    <td className="px-4 py-3 text-sm">
                      {job.origin && job.destination ? (
                        <span>
                          {job.origin} <span className="text-muted-foreground">→</span>{' '}
                          {job.destination}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span>
                          {formatCurrency(job.budget)} / {formatCurrency(job.actualSpent)}
                        </span>
                        {job.isOverBudget ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <span className="text-green-500">✓</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="w-20 h-2" />
                        <span className="text-xs text-muted-foreground">
                          {job.completedDeliveries}/{job.totalDeliveries}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/job-orders/${job.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Over-budget warning */}
        {overBudgetJobs.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {overBudgetJobs.length} job(s) over budget:
              </span>
            </div>
            <ul className="mt-1 text-sm text-red-600">
              {overBudgetJobs.map((job) => (
                <li key={job.id}>
                  {job.joNumber} is over budget by {formatCurrency(job.overBudgetAmount)} (
                  {job.overBudgetPercent.toFixed(1)}%)
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
