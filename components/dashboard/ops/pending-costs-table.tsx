'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PendingCostEntry } from '@/lib/ops-dashboard-utils'

interface PendingCostsTableProps {
  entries: PendingCostEntry[]
}

export function PendingCostsTable({ entries }: PendingCostsTableProps) {
  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Pending Cost Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending cost entries at the moment.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Pending Cost Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">PJO Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Project</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Progress</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isComplete = entry.confirmed_count === entry.total_count
                const progressPct = entry.total_count > 0 
                  ? Math.round((entry.confirmed_count / entry.total_count) * 100) 
                  : 0

                return (
                  <tr key={entry.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entry.pjo_number}</span>
                        {entry.is_urgent && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Urgent
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{entry.project_name}</td>
                    <td className="px-4 py-3 text-sm">{entry.customer_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {entry.confirmed_count}/{entry.total_count}
                        </span>
                        {isComplete && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/proforma-jo/${entry.id}/costs`}>
                        <Button size="sm" variant={isComplete ? 'outline' : 'default'}>
                          {isComplete ? 'Complete' : 'Enter'}
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
