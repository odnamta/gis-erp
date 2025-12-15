'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { type AgingBucket } from '@/lib/admin-dashboard-utils'
import { formatCurrency } from '@/lib/pjo-utils'

interface InvoiceAgingSummaryProps {
  buckets: AgingBucket[]
  isLoading?: boolean
}

const BUCKET_COLORS: Record<string, string> = {
  'Current': 'bg-green-50 hover:bg-green-100 border-green-200',
  '1-30 days': 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
  '31-60 days': 'bg-orange-50 hover:bg-orange-100 border-orange-200',
  '61-90 days': 'bg-red-50 hover:bg-red-100 border-red-200',
  '90+ days': 'bg-red-100 hover:bg-red-200 border-red-300',
}

const BUCKET_TEXT_COLORS: Record<string, string> = {
  'Current': 'text-green-700',
  '1-30 days': 'text-yellow-700',
  '31-60 days': 'text-orange-700',
  '61-90 days': 'text-red-700',
  '90+ days': 'text-red-800',
}

export function InvoiceAgingSummary({ buckets, isLoading }: InvoiceAgingSummaryProps) {
  const totalUnpaid = buckets.reduce((sum, b) => sum + b.totalAmount, 0)
  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice Aging</CardTitle>
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

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice Aging</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
            <p className="text-muted-foreground">No outstanding invoices!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Invoice Aging</CardTitle>
        <span className="text-sm text-muted-foreground">
          Total: {formatCurrency(totalUnpaid)}
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {buckets.map((bucket) => (
            <Link
              key={bucket.label}
              href={`/invoices?aging=${encodeURIComponent(bucket.label)}`}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${BUCKET_COLORS[bucket.label] || 'bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                {bucket.isOverdue && bucket.count > 0 && (
                  <AlertTriangle className={`h-4 w-4 ${BUCKET_TEXT_COLORS[bucket.label]}`} />
                )}
                <span className={`font-medium ${BUCKET_TEXT_COLORS[bucket.label]}`}>
                  {bucket.label}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {bucket.count} invoice{bucket.count !== 1 ? 's' : ''}
                </span>
                <span className={`font-semibold ${BUCKET_TEXT_COLORS[bucket.label]}`}>
                  {formatCurrency(bucket.totalAmount)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
