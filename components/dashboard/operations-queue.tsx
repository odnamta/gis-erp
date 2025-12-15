'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardList, ArrowRight } from 'lucide-react'
import { OpsQueueItem } from '@/types/database'

interface OperationsQueueProps {
  items: OpsQueueItem[]
  isLoading?: boolean
}

export function OperationsQueue({ items, isLoading = false }: OperationsQueueProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Operations Queue
        </CardTitle>
        <CardDescription>
          {items.length > 0
            ? `${items.length} PJOs awaiting cost entry`
            : 'No pending cost entries'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const progressPercent = item.costs_total > 0
                ? (item.costs_confirmed / item.costs_total) * 100
                : 0

              return (
                <Link
                  key={item.id}
                  href={`/proforma-jo/${item.id}/costs`}
                  className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{item.pjo_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.customer_name}
                        {item.commodity && ` • ${item.commodity}`}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <Progress value={progressPercent} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {item.costs_confirmed} of {item.costs_total} costs filled
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              All caught up! No pending cost entries.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
