'use client'

import { useRouter } from 'next/navigation'
import { Bell, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/format'
import { formatDate } from '@/lib/pjo-utils'
import type { OverdueInvoice, OverdueSeverity } from '@/lib/finance-dashboard-utils'

interface OverdueInvoicesTableProps {
  invoices: OverdueInvoice[]
  onRemind?: (invoiceId: string) => void
}

const severityConfig: Record<OverdueSeverity, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
  warning: { variant: 'secondary', label: 'Warning' },
  orange: { variant: 'default', label: 'Overdue' },
  critical: { variant: 'destructive', label: 'Critical' },
}

export function OverdueInvoicesTable({ invoices, onRemind }: OverdueInvoicesTableProps) {
  const router = useRouter()

  const handleRemind = (invoiceId: string) => {
    if (onRemind) {
      onRemind(invoiceId)
    }
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Overdue Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No overdue invoices 🎉</p>
            <p className="text-sm">All invoices are within payment terms</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg text-orange-600">
          Overdue Invoices - Need Reminder
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => router.push('/invoices?status=overdue')}>
          View All <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
            <div>Invoice #</div>
            <div>Customer</div>
            <div className="text-right">Amount</div>
            <div className="text-center">Due Date</div>
            <div className="text-center">Days Over</div>
            <div className="text-right">Action</div>
          </div>
          
          {/* Rows */}
          {invoices.slice(0, 5).map((invoice) => {
            const config = severityConfig[invoice.severity]
            
            return (
              <div 
                key={invoice.id} 
                className="grid grid-cols-6 gap-4 items-center py-2 hover:bg-muted/50 rounded-md px-1"
              >
                <div className="font-medium text-sm">
                  {invoice.invoice_number}
                </div>
                <div className="text-sm truncate">
                  {invoice.customer_name}
                </div>
                <div className="text-right font-medium text-sm">
                  {formatCurrency(invoice.total_amount)}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  {formatDate(invoice.due_date)}
                </div>
                <div className="text-center">
                  <Badge variant={config.variant}>
                    {invoice.days_overdue}d
                  </Badge>
                </div>
                <div className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRemind(invoice.id)}
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    Remind
                  </Button>
                </div>
              </div>
            )
          })}
          
          {invoices.length > 5 && (
            <div className="text-center pt-2 text-sm text-muted-foreground">
              +{invoices.length - 5} more overdue invoices
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
