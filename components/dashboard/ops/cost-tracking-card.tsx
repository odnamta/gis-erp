'use client'

import Link from 'next/link'
import { DollarSign, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CostSummary } from '@/lib/ops-dashboard-enhanced-utils'
import { formatCurrency } from '@/lib/utils/format'

interface CostTrackingCardProps {
  costSummary: CostSummary
}

export function CostTrackingCard({ costSummary }: CostTrackingCardProps) {
  const _getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500'
    if (percent >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Cost Tracking
        </CardTitle>
        <Link href="/job-orders">
          <Button variant="link" size="sm">View Cost Details →</Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget vs Actual Summary */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Budget vs Actual (Active Jobs)
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Total Budget</div>
              <div className="text-lg font-semibold">
                {formatCurrency(costSummary.totalBudget)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Spent</div>
              <div className="text-lg font-semibold">
                {formatCurrency(costSummary.totalSpent)}
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Remaining</div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(costSummary.remaining)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Budget Usage</span>
            <span className="font-medium">{costSummary.percentUsed}%</span>
          </div>
          <Progress
            value={Math.min(costSummary.percentUsed, 100)}
            className="h-3"
          />
        </div>

        {/* BKK Pending */}
        {costSummary.bkkPending > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                BKK Pending Disbursement
              </span>
            </div>
            <div className="mt-1 text-sm text-yellow-600">
              {costSummary.bkkPending} requests totaling{' '}
              {formatCurrency(costSummary.bkkPendingAmount)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
