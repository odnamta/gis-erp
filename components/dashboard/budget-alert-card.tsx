'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import { BudgetAlert } from '@/types/database'
import { formatIDR } from '@/lib/pjo-utils'
import { COST_CATEGORY_LABELS } from '@/lib/pjo-utils'

interface BudgetAlertCardProps {
  alerts: BudgetAlert[]
  totalCount?: number
  isLoading?: boolean
}

export function BudgetAlertCard({ alerts, totalCount, isLoading = false }: BudgetAlertCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const hasAlerts = alerts.length > 0
  const showViewAll = totalCount && totalCount > 5

  return (
    <Card className={hasAlerts ? 'border-red-200' : 'border-green-200'}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasAlerts ? (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
          Budget Alerts
        </CardTitle>
        <CardDescription>
          {hasAlerts
            ? `${totalCount || alerts.length} cost items over budget`
            : 'All costs within budget'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasAlerts ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                href={`/proforma-jo/${alert.pjo_id}/costs`}
                className="block p-3 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-100/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">{alert.pjo_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {COST_CATEGORY_LABELS[alert.category] || alert.category}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      +{formatIDR(alert.variance)}
                    </p>
                    <p className="text-xs text-red-500">
                      +{alert.variance_pct.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            {showViewAll && (
              <Link
                href="/dashboard/budget-alerts"
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                View All Exceeded Items
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Great! All cost items are within budget.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
