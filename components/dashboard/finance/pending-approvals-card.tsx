'use client'

import Link from 'next/link'
import { ClipboardCheck, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatCurrency,
  formatCurrencyCompact,
  PendingBKKItem,
} from '@/lib/finance-dashboard-enhanced-utils'

interface PendingApprovalsCardProps {
  pendingBKKs: PendingBKKItem[]
  totalPendingCount: number
  totalPendingAmount: number
  onBKKClick?: (id: string) => void
}

export function PendingApprovalsCard({
  pendingBKKs,
  totalPendingCount,
  totalPendingAmount,
  onBKKClick,
}: PendingApprovalsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">Pending BKK Approvals</CardTitle>
          </div>
          {totalPendingCount > 0 && (
            <Badge variant="secondary">{totalPendingCount}</Badge>
          )}
        </div>
        <CardDescription>
          Total: {formatCurrencyCompact(totalPendingAmount)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingBKKs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No pending approvals
          </div>
        ) : (
          <>
            {/* BKK List */}
            <div className="space-y-2">
              {pendingBKKs.map((bkk) => (
                <div
                  key={bkk.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onBKKClick?.(bkk.id)}
                >
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">{bkk.bkkNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {bkk.joNumber !== '-' ? `JO: ${bkk.joNumber}` : bkk.category}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {formatCurrencyCompact(bkk.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {bkk.requestedBy}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View All Link */}
            {totalPendingCount > pendingBKKs.length && (
              <div className="text-xs text-muted-foreground text-center">
                +{totalPendingCount - pendingBKKs.length} more pending
              </div>
            )}
          </>
        )}

        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/finance/bkk?status=pending">
            Review All Pending
            <ExternalLink className="h-3 w-3 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
