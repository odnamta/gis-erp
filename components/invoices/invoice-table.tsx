'use client'

import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InvoiceStatusBadge } from '@/components/ui/invoice-status-badge'
import { InvoiceWithRelations } from '@/types'
import { formatIDR, formatDate } from '@/lib/pjo-utils'

interface InvoiceTableProps {
  invoices: InvoiceWithRelations[]
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const router = useRouter()

  if (invoices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No invoices found. Create your first invoice from a Job Order.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>JO #</TableHead>
          <TableHead className="text-right">Subtotal</TableHead>
          <TableHead className="text-right">VAT (11%)</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow
            key={invoice.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => router.push(`/invoices/${invoice.id}`)}
          >
            <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
            <TableCell>{invoice.customers?.name || '-'}</TableCell>
            <TableCell>{invoice.job_orders?.jo_number || '-'}</TableCell>
            <TableCell className="text-right">{formatIDR(invoice.subtotal)}</TableCell>
            <TableCell className="text-right">{formatIDR(invoice.tax_amount)}</TableCell>
            <TableCell className="text-right font-medium">{formatIDR(invoice.total_amount)}</TableCell>
            <TableCell>{formatDate(invoice.due_date)}</TableCell>
            <TableCell>
              <InvoiceStatusBadge status={invoice.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
