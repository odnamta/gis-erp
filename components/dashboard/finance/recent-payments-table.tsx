'use client'

import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { formatDate } from '@/lib/pjo-utils'
import type { RecentPayment } from '@/lib/finance-dashboard-utils'

interface RecentPaymentsTableProps {
  payments: RecentPayment[]
}

export function RecentPaymentsTable({ payments }: RecentPaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent payments</p>
            <p className="text-sm">Payments from the last 30 days will appear here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          Recent Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
            <div>Date</div>
            <div>Invoice #</div>
            <div>Customer</div>
            <div className="text-right">Amount</div>
            <div>Reference</div>
          </div>
          
          {/* Rows */}
          {payments.slice(0, 5).map((payment) => (
            <div 
              key={payment.id} 
              className="grid grid-cols-5 gap-4 items-center py-2 hover:bg-muted/50 rounded-md px-1"
            >
              <div className="text-sm">
                {formatDate(payment.paid_at)}
              </div>
              <div className="font-medium text-sm">
                {payment.invoice_number}
              </div>
              <div className="text-sm truncate">
                {payment.customer_name}
              </div>
              <div className="text-right font-medium text-sm text-green-600">
                {formatCurrency(payment.total_amount)}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {payment.payment_reference || '-'}
              </div>
            </div>
          ))}
          
          {payments.length > 5 && (
            <div className="text-center pt-2 text-sm text-muted-foreground">
              +{payments.length - 5} more payments this month
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
