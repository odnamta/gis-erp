'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, Clock, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/format'
import { type PendingFollowup, countStalePJOs } from '@/lib/sales-dashboard-utils'

interface PendingFollowupsTableProps {
  followups: PendingFollowup[]
  isLoading?: boolean
}

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const },
  pending_approval: { label: 'Pending', variant: 'outline' as const },
}

const stalenessConfig = {
  normal: { icon: null, className: '' },
  warning: { icon: Clock, className: 'text-yellow-600' },
  alert: { icon: AlertTriangle, className: 'text-red-600' },
}

export function PendingFollowupsTable({ followups, isLoading }: PendingFollowupsTableProps) {
  const staleCount = countStalePJOs(followups)

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pending Follow-ups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Pending Follow-ups</CardTitle>
          {staleCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {staleCount} stale
            </Badge>
          )}
        </div>
        <Link href="/proforma-jo?status=draft,pending_approval">
          <Button variant="ghost" size="sm">
            View All <ExternalLink className="ml-1 h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {followups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            All caught up! No pending follow-ups.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PJO #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Days</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followups.slice(0, 5).map((followup) => {
                const status = statusConfig[followup.status]
                const staleness = stalenessConfig[followup.staleness]
                const StalenessIcon = staleness.icon

                return (
                  <TableRow key={followup.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        {StalenessIcon && (
                          <StalenessIcon className={cn('h-4 w-4', staleness.className)} />
                        )}
                        {followup.pjo_number}
                      </div>
                    </TableCell>
                    <TableCell>{followup.customer_name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(followup.value)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className={cn(
                      'text-right',
                      followup.staleness === 'alert' && 'text-red-600 font-medium',
                      followup.staleness === 'warning' && 'text-yellow-600'
                    )}>
                      {followup.days_in_status}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/pjos/${followup.id}`}>
                        <Button variant="outline" size="sm">
                          {followup.staleness === 'alert' ? '⚠️ Stale' : 'Follow up'}
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
