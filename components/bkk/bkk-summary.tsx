'use client'

import { Card, CardContent } from '@/components/ui/card'
import { formatBKKCurrency } from '@/lib/bkk-utils'
import type { BKKSummaryTotals } from '@/types'

interface BKKSummaryProps {
  summary: BKKSummaryTotals
}

export function BKKSummary({ summary }: BKKSummaryProps) {
  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Requested</p>
            <p className="font-semibold">{formatBKKCurrency(summary.totalRequested)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Released</p>
            <p className="font-semibold text-green-600">{formatBKKCurrency(summary.totalReleased)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Settled</p>
            <p className="font-semibold">{formatBKKCurrency(summary.totalSettled)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pending Return</p>
            <p className="font-semibold text-orange-600">{formatBKKCurrency(summary.pendingReturn)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
