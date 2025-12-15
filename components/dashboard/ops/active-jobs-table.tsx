'use client'

import Link from 'next/link'
import { Eye, Truck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActiveJob } from '@/lib/ops-dashboard-utils'

interface ActiveJobsTableProps {
  jobs: ActiveJob[]
}

export function ActiveJobsTable({ jobs }: ActiveJobsTableProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Active Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No active jobs</p>
            <p className="text-sm text-muted-foreground">You don&apos;t have any active job orders at the moment.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Active Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">JO Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Commodity</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Route</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{job.jo_number}</td>
                  <td className="px-4 py-3 text-sm">{job.commodity || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {job.pol && job.pod ? (
                      <span>
                        {job.pol} <span className="text-muted-foreground">→</span> {job.pod}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/job-orders/${job.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
