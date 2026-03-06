'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { AlertTriangle, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react'

export interface ReconciliationData {
  joId: string
  joNumber: string
  finalRevenue: number
  totalInvoiced: number
  invoiceCount: number
  discrepancy: number
  discrepancyPct: number
}

interface RevenueReconciliationCardProps {
  data: ReconciliationData | null
  loading?: boolean
}

export function RevenueReconciliationCard({ data, loading }: RevenueReconciliationCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rekonsiliasi Revenue vs Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rekonsiliasi Revenue vs Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Data rekonsiliasi tidak tersedia (JO tidak terhubung)
          </p>
        </CardContent>
      </Card>
    )
  }

  const hasDiscrepancy = Math.abs(data.discrepancy) > 1
  const isUnderInvoiced = data.discrepancy > 0
  const isOverInvoiced = data.discrepancy < 0
  const isMatched = !hasDiscrepancy

  return (
    <Card className={hasDiscrepancy ? 'border-orange-200' : 'border-green-200'}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {isMatched ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          )}
          <CardTitle className="text-base">Rekonsiliasi Revenue vs Invoice</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Revenue Row */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Final Revenue (JO)</span>
            <span className="font-medium">{formatCurrency(data.finalRevenue)}</span>
          </div>

          {/* Total Invoiced Row */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              Total Diinvoice ({data.invoiceCount} invoice)
            </span>
            <span className="font-medium">{formatCurrency(data.totalInvoiced)}</span>
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Discrepancy Row */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Selisih</span>
            <div className="flex items-center gap-1.5">
              {isUnderInvoiced && <TrendingDown className="h-4 w-4 text-orange-500" />}
              {isOverInvoiced && <TrendingUp className="h-4 w-4 text-red-500" />}
              {isMatched && <CheckCircle className="h-4 w-4 text-green-500" />}
              <span
                className={`font-bold ${
                  isMatched
                    ? 'text-green-600'
                    : isOverInvoiced
                      ? 'text-red-600'
                      : 'text-orange-600'
                }`}
              >
                {isMatched
                  ? 'Sesuai'
                  : `${data.discrepancy > 0 ? '-' : '+'}${formatCurrency(Math.abs(data.discrepancy))}`}
              </span>
            </div>
          </div>

          {/* Status Message */}
          {hasDiscrepancy && (
            <div
              className={`rounded-lg p-2 text-xs ${
                isOverInvoiced ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
              }`}
            >
              {isUnderInvoiced
                ? `Invoice kurang ${formatCurrency(data.discrepancy)} (${Math.abs(data.discrepancyPct).toFixed(1)}%) dari final revenue JO. Cek apakah ada invoice yang belum dibuat.`
                : `Invoice melebihi final revenue JO sebesar ${formatCurrency(Math.abs(data.discrepancy))} (${Math.abs(data.discrepancyPct).toFixed(1)}%). Mohon diperiksa.`}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
