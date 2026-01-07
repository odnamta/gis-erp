'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'
import { ManagerMetrics } from '@/types'
import { formatIDR } from '@/lib/pjo-utils'
import { cn } from '@/lib/utils'

interface ManagerSummaryProps {
  metrics: ManagerMetrics
  isLoading?: boolean
}

export function ManagerSummary({ metrics, isLoading = false }: ManagerSummaryProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const isProfitable = metrics.totalProfit >= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Monthly Summary
        </CardTitle>
        <CardDescription>
          Financial overview for current month ({metrics.activeJOCount} active JOs)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/job-orders" className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Revenue</span>
            </div>
            <p className="text-lg font-bold text-green-600">
              {formatIDR(metrics.totalRevenue)}
            </p>
          </Link>

          <Link href="/job-orders" className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Costs</span>
            </div>
            <p className="text-lg font-bold text-red-600">
              {formatIDR(metrics.totalCosts)}
            </p>
          </Link>

          <Link href="/job-orders" className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              {isProfitable ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="text-xs font-medium">Profit</span>
            </div>
            <p className={cn(
              'text-lg font-bold',
              isProfitable ? 'text-green-600' : 'text-red-600'
            )}>
              {formatIDR(metrics.totalProfit)}
            </p>
          </Link>

          <Link href="/job-orders" className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Percent className="h-4 w-4" />
              <span className="text-xs font-medium">Margin</span>
            </div>
            <p className={cn(
              'text-lg font-bold',
              metrics.margin >= 20 ? 'text-green-600' : 
              metrics.margin >= 10 ? 'text-yellow-600' : 'text-red-600'
            )}>
              {metrics.margin.toFixed(1)}%
            </p>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
