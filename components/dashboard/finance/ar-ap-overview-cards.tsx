'use client'

import Link from 'next/link'
import {
  FileText,
  AlertTriangle,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  formatCurrency,
  formatCurrencyCompact,
  AgingBucket,
  hasCriticalOverdue,
  AGING_BUCKET_ORDER,
} from '@/lib/finance-dashboard-enhanced-utils'

interface AROverviewCardProps {
  totalAR: number
  overdueAR: number
  invoiceCount: number
  agingBuckets: AgingBucket[]
}

interface APOverviewCardProps {
  totalAP: number
  overdueAP: number
  pendingVerification: number
  agingBuckets: AgingBucket[]
}

// Color mapping for aging buckets
const BUCKET_COLORS: Record<string, string> = {
  'current': 'bg-green-500',
  '1-30 days': 'bg-yellow-500',
  '31-60 days': 'bg-orange-500',
  '61-90 days': 'bg-red-400',
  'over 90 days': 'bg-red-600',
}

const BUCKET_TEXT_COLORS: Record<string, string> = {
  'current': 'text-green-600',
  '1-30 days': 'text-yellow-600',
  '31-60 days': 'text-orange-600',
  '61-90 days': 'text-red-500',
  'over 90 days': 'text-red-700',
}

function AgingBreakdownChart({ buckets, total }: { buckets: AgingBucket[]; total: number }) {
  if (total === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No outstanding items
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {AGING_BUCKET_ORDER.map((bucketName) => {
        const bucket = buckets.find(b => b.bucket === bucketName)
        const amount = bucket?.totalAmount || 0
        const count = bucket?.invoiceCount || 0
        const percentage = total > 0 ? (amount / total) * 100 : 0

        if (amount === 0) return null

        return (
          <div key={bucketName} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className={BUCKET_TEXT_COLORS[bucketName]}>{bucketName}</span>
              <span className="text-muted-foreground">
                {formatCurrencyCompact(amount)} ({count})
              </span>
            </div>
            <Progress
              value={percentage}
              className="h-2"
              indicatorClassName={BUCKET_COLORS[bucketName]}
            />
          </div>
        )
      })}
    </div>
  )
}

export function AROverviewCard({
  totalAR,
  overdueAR,
  invoiceCount,
  agingBuckets,
}: AROverviewCardProps) {
  const hasCritical = hasCriticalOverdue(agingBuckets)
  const overduePercentage = totalAR > 0 ? (overdueAR / totalAR) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Accounts Receivable</CardTitle>
          </div>
          {hasCritical && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Critical
            </Badge>
          )}
        </div>
        <CardDescription>Outstanding customer invoices</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{formatCurrencyCompact(totalAR)}</div>
            <div className="text-xs text-muted-foreground">Total Outstanding</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${overdueAR > 0 ? 'text-red-600' : ''}`}>
              {formatCurrencyCompact(overdueAR)}
            </div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{invoiceCount}</div>
            <div className="text-xs text-muted-foreground">Invoices</div>
          </div>
        </div>

        {/* Aging Breakdown */}
        <div className="pt-2 border-t">
          <div className="text-sm font-medium mb-2">Aging Breakdown</div>
          <AgingBreakdownChart buckets={agingBuckets} total={totalAR} />
        </div>

        {/* View Details Link */}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/invoices?status=outstanding">
            View AR Details
            <ExternalLink className="h-3 w-3 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function APOverviewCard({
  totalAP,
  overdueAP,
  pendingVerification,
  agingBuckets,
}: APOverviewCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Accounts Payable</CardTitle>
          </div>
          {pendingVerification > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {pendingVerification} pending
            </Badge>
          )}
        </div>
        <CardDescription>Outstanding vendor invoices</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{formatCurrencyCompact(totalAP)}</div>
            <div className="text-xs text-muted-foreground">Total Outstanding</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${overdueAP > 0 ? 'text-red-600' : ''}`}>
              {formatCurrencyCompact(overdueAP)}
            </div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{pendingVerification}</div>
            <div className="text-xs text-muted-foreground">To Verify</div>
          </div>
        </div>

        {/* Aging Breakdown */}
        <div className="pt-2 border-t">
          <div className="text-sm font-medium mb-2">Aging Breakdown</div>
          <AgingBreakdownChart buckets={agingBuckets} total={totalAP} />
        </div>

        {/* View Details Link */}
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/finance/vendor-invoices">
            View AP Details
            <ExternalLink className="h-3 w-3 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
