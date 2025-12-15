'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowRight, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { type PendingWorkItem } from '@/lib/admin-dashboard-utils'

interface PendingWorkQueueProps {
  items: PendingWorkItem[]
  isLoading?: boolean
}

const TYPE_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pjo: { label: 'PJO', variant: 'default' },
  jo: { label: 'JO', variant: 'secondary' },
  invoice: { label: 'INV', variant: 'outline' },
}

export function PendingWorkQueue({ items, isLoading }: PendingWorkQueueProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Work Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Work Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <p className="text-muted-foreground">All caught up! No pending work items.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Work Queue ({items.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Type</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-right">Days</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.slice(0, 10).map((item) => {
              const typeBadge = TYPE_BADGES[item.type]
              return (
                <TableRow key={`${item.type}-${item.id}`}>
                  <TableCell>
                    <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{item.number}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{item.customerName}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{item.actionLabel}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={item.daysPending > 7 ? 'text-red-600 font-medium' : ''}>
                      {item.daysPending}d
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={item.linkUrl}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {items.length > 10 && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            +{items.length - 10} more items
          </p>
        )}
      </CardContent>
    </Card>
  )
}
