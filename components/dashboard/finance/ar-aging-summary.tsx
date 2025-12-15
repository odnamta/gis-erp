'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import type { ARAgingData, AgingBucketType } from '@/lib/finance-dashboard-utils'

interface ARAgingSummaryProps {
  aging: ARAgingData
}

const bucketConfig: Record<AgingBucketType, { label: string; color: string; bgColor: string }> = {
  current: { label: '0-30 days', color: 'text-green-600', bgColor: 'bg-green-50 hover:bg-green-100' },
  days31to60: { label: '31-60 days', color: 'text-yellow-600', bgColor: 'bg-yellow-50 hover:bg-yellow-100' },
  days61to90: { label: '61-90 days', color: 'text-orange-600', bgColor: 'bg-orange-50 hover:bg-orange-100' },
  over90: { label: '90+ days', color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100' },
}

export function ARAgingSummary({ aging }: ARAgingSummaryProps) {
  const router = useRouter()

  const handleBucketClick = (bucket: AgingBucketType) => {
    router.push(`/invoices?aging=${bucket}`)
  }

  const buckets: AgingBucketType[] = ['current', 'days31to60', 'days61to90', 'over90']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AR Aging Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {buckets.map((bucket) => {
            const config = bucketConfig[bucket]
            const data = aging[bucket]
            
            return (
              <button
                key={bucket}
                onClick={() => handleBucketClick(bucket)}
                className={`p-4 rounded-lg ${config.bgColor} transition-colors text-left`}
              >
                <div className={`text-sm font-medium ${config.color}`}>
                  {config.label}
                </div>
                <div className="text-xl font-bold mt-1">
                  {formatCurrency(data.amount)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.count} invoice{data.count !== 1 ? 's' : ''}
                </div>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
