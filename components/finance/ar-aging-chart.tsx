'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrencyShort, formatCurrency } from '@/lib/utils/format'
import Link from 'next/link'

export interface AgingBucketData {
  count: number
  amount: number
  invoiceIds?: string[]
}

export interface ARAgingChartData {
  current: AgingBucketData
  days31to60: AgingBucketData
  days61to90: AgingBucketData
  over90: AgingBucketData
}

export interface CustomerAgingSummary {
  customerId: string
  customerName: string
  totalOutstanding: number
  invoiceCount: number
  oldestDaysOverdue: number
}

interface ARAgingChartProps {
  agingData: ARAgingChartData
  customerAging?: CustomerAgingSummary[]
}

const BUCKETS = [
  { key: 'current' as const, label: '0-30 hari', color: 'bg-green-500', bgLight: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
  { key: 'days31to60' as const, label: '31-60 hari', color: 'bg-yellow-500', bgLight: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
  { key: 'days61to90' as const, label: '61-90 hari', color: 'bg-orange-500', bgLight: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
  { key: 'over90' as const, label: '90+ hari', color: 'bg-red-500', bgLight: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' },
]

export function ARAgingChart({ agingData, customerAging }: ARAgingChartProps) {
  const totalAmount =
    agingData.current.amount +
    agingData.days31to60.amount +
    agingData.days61to90.amount +
    agingData.over90.amount

  const totalCount =
    agingData.current.count +
    agingData.days31to60.count +
    agingData.days61to90.count +
    agingData.over90.count

  return (
    <div className="space-y-6">
      {/* Visual Aging Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AR Aging Funnel</CardTitle>
          <p className="text-sm text-muted-foreground">
            {totalCount} invoice outstanding — {formatCurrency(totalAmount)}
          </p>
        </CardHeader>
        <CardContent>
          {/* Bar Chart */}
          {totalAmount > 0 ? (
            <div className="space-y-4">
              {/* Stacked Horizontal Bar */}
              <div className="w-full h-8 rounded-lg overflow-hidden flex">
                {BUCKETS.map(({ key, color }) => {
                  const bucketAmount = agingData[key].amount
                  const pct = totalAmount > 0 ? (bucketAmount / totalAmount) * 100 : 0
                  if (pct < 0.5) return null
                  return (
                    <div
                      key={key}
                      className={`${color} transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                      title={`${BUCKETS.find(b => b.key === key)?.label}: ${formatCurrency(bucketAmount)}`}
                    />
                  )
                })}
              </div>

              {/* Legend + Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {BUCKETS.map(({ key, label, color, bgLight, textColor, borderColor }) => {
                  const bucket = agingData[key]
                  const pct = totalAmount > 0 ? ((bucket.amount / totalAmount) * 100).toFixed(1) : '0'
                  return (
                    <Link
                      key={key}
                      href={`/invoices?aging=${key}`}
                      className={`rounded-lg border ${borderColor} ${bgLight} p-3 hover:shadow-sm transition-shadow`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-3 h-3 rounded-sm ${color}`} />
                        <span className="text-xs font-medium">{label}</span>
                      </div>
                      <div className={`text-lg font-bold ${textColor}`}>
                        {bucket.count}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrencyShort(bucket.amount)} ({pct}%)
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tidak ada invoice outstanding
            </p>
          )}
        </CardContent>
      </Card>

      {/* Customer-Level Aging Summary */}
      {customerAging && customerAging.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Debitur (by Outstanding)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Customer dengan piutang terbesar
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customerAging.slice(0, 10).map((customer, index) => {
                const barWidth = customerAging.length > 0 && customerAging[0].totalOutstanding > 0
                  ? (customer.totalOutstanding / customerAging[0].totalOutstanding) * 100
                  : 0

                return (
                  <div key={customer.customerId} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground w-5">{index + 1}.</span>
                        <Link
                          href={`/customers/${customer.customerId}`}
                          className="text-sm font-medium truncate hover:underline"
                        >
                          {customer.customerName}
                        </Link>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-sm font-bold">{formatCurrencyShort(customer.totalOutstanding)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {customer.invoiceCount} inv
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          customer.oldestDaysOverdue > 90
                            ? 'bg-red-500'
                            : customer.oldestDaysOverdue > 60
                              ? 'bg-orange-500'
                              : customer.oldestDaysOverdue > 30
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    {customer.oldestDaysOverdue > 30 && (
                      <p className="text-[10px] text-muted-foreground">
                        Invoice tertua: {customer.oldestDaysOverdue} hari
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
