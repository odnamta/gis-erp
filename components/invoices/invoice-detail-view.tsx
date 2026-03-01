'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { InvoiceWithRelations, InvoiceStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { InvoiceStatusBadge } from '@/components/ui/invoice-status-badge'
import { formatIDR, formatDate, formatDateTime } from '@/lib/pjo-utils'
import { isInvoiceOverdue, VAT_RATE } from '@/lib/invoice-utils'
import { updateInvoiceStatus } from '@/app/(main)/invoices/actions'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Send, XCircle, AlertTriangle, Loader2, CheckCircle } from 'lucide-react'
import { AttachmentsSection } from '@/components/attachments'
import { PaymentsSection } from '@/components/payments'
import { canRecordPayment } from '@/lib/payment-utils'
import { PDFButtons } from '@/components/pdf/pdf-buttons'
import { BGSection } from '@/components/invoices/bg-section'

interface InvoiceDetailViewProps {
  invoice: InvoiceWithRelations
  userRole?: string
  userId?: string
}

export function InvoiceDetailView({ invoice, userRole = 'viewer', userId }: InvoiceDetailViewProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const canMarkOverdue = (invoice.status === 'sent' || invoice.status === 'received') && isInvoiceOverdue(invoice.due_date, invoice.status as InvoiceStatus)
  const canManagePayments = canRecordPayment(userRole)
  const showPaymentSection = invoice.status !== 'draft' && invoice.status !== 'cancelled'
  const OPS_ROLES = ['ops']
  const showBGSection = !OPS_ROLES.includes(userRole)

  async function handleStatusChange(targetStatus: InvoiceStatus) {
    setIsLoading(true)
    try {
      const result = await updateInvoiceStatus(invoice.id, targetStatus)
      if (!result.success) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Success', description: `Invoice marked as ${targetStatus}` })
        router.refresh()
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
          <div className="mt-1 flex items-center gap-2">
            <InvoiceStatusBadge status={invoice.status} />
            {invoice.invoice_date && (
              <span className="text-sm text-muted-foreground">
                Issued {formatDate(invoice.invoice_date)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <PDFButtons
            documentType="invoice"
            documentId={invoice.id}
            documentNumber={invoice.invoice_number}
            userId={userId}
            showGenerateButton={!!userId}
          />
          {invoice.status === 'draft' && (
            <Button onClick={() => handleStatusChange('sent')} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Invoice
            </Button>
          )}
          {invoice.status === 'sent' && (
            <Button variant="outline" onClick={() => handleStatusChange('received' as InvoiceStatus)} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Tandai Diterima
            </Button>
          )}
          {canMarkOverdue && (
            <Button variant="outline" onClick={() => handleStatusChange('overdue')} disabled={isLoading}>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Mark Overdue
            </Button>
          )}
          {['draft', 'sent', 'received', 'overdue', 'partial'].includes(invoice.status) && (
            <Button variant="destructive" onClick={() => handleStatusChange('cancelled')} disabled={isLoading}>
              <XCircle className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Source JO */}
      {invoice.job_orders && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-800 dark:text-blue-400">Source Job Order</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/job-orders/${invoice.job_orders.id}`} className="text-blue-600 hover:underline font-medium">
              {invoice.job_orders.jo_number}
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Customer</Label>
            <p className="font-medium">
              {invoice.customers ? (
                <Link href={`/customers/${invoice.customers.id}`} className="hover:underline">
                  {invoice.customers.name}
                </Link>
              ) : '-'}
            </p>
          </div>
          <div>
            <Label className="text-muted-foreground">Customer Email</Label>
            <p className="font-medium">{invoice.customers?.email || '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Invoice Date</Label>
            <p className="font-medium">{invoice.invoice_date ? formatDate(invoice.invoice_date) : '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Due Date</Label>
            <p className={`font-medium ${canMarkOverdue ? 'text-red-600' : ''}`}>
              {formatDate(invoice.due_date)}
              {canMarkOverdue && ' (Overdue)'}
            </p>
          </div>
          {/* Term Information for Split Invoices */}
          {invoice.invoice_term && (
            <>
              <div>
                <Label className="text-muted-foreground">Payment Term</Label>
                <p className="font-medium">{invoice.term_description || invoice.invoice_term}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Term Percentage</Label>
                <p className="font-medium">{invoice.term_percentage}%</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Split Invoice Indicator */}
      {invoice.invoice_term && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3">
            <p className="text-sm text-amber-800 dark:text-amber-400">
              📄 This is a split invoice ({invoice.term_percentage}% - {invoice.term_description || invoice.invoice_term})
            </p>
          </CardContent>
        </Card>
      )}

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          {!invoice.invoice_line_items || invoice.invoice_line_items.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No line items</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.invoice_line_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.line_number}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell className="text-right">{formatIDR(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(item.subtotal ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatIDR(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT ({(VAT_RATE * 100).toFixed(0)}%)</span>
              <span className="font-medium">{formatIDR(invoice.tax_amount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Grand Total</span>
              <span className="font-bold text-lg">{formatIDR(invoice.total_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Section */}
      {showPaymentSection && (
        <PaymentsSection
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
          customerName={invoice.customers?.name || 'Unknown'}
          totalAmount={invoice.total_amount}
          amountPaid={invoice.amount_paid || 0}
          canRecordPayment={canManagePayments}
        />
      )}

      {/* Bilyet Giro Section */}
      {showBGSection && (
        <BGSection
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoice_number}
        />
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-muted-foreground">Created</Label>
            <p className="font-medium">{invoice.created_at ? formatDateTime(invoice.created_at) : '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Sent</Label>
            <p className="font-medium">{invoice.sent_at ? formatDateTime(invoice.sent_at) : '-'}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Paid</Label>
            <p className="font-medium">{invoice.paid_at ? formatDateTime(invoice.paid_at) : '-'}</p>
          </div>
          {invoice.cancelled_at && (
            <div>
              <Label className="text-muted-foreground">Cancelled</Label>
              <p className="font-medium">{formatDateTime(invoice.cancelled_at)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      <AttachmentsSection
        entityType="invoice"
        entityId={invoice.id}
        title="Attachments"
      />
    </div>
  )
}
