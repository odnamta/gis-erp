'use client'

import { useRouter } from 'next/navigation'
import { InvoiceStatusBadge } from '@/components/ui/invoice-status-badge'
import { Badge } from '@/components/ui/badge'
import { InvoiceWithRelations } from '@/types'
import { formatIDR, formatDate } from '@/lib/pjo-utils'
import { VirtualDataTable, VirtualColumn } from '@/components/tables/virtual-data-table'

interface InvoiceVirtualTableProps {
  invoices: InvoiceWithRelations[]
}

export function InvoiceVirtualTable({ invoices }: InvoiceVirtualTableProps) {
  const router = useRouter()

  const columns: VirtualColumn<InvoiceWithRelations>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      width: '140px',
      className: 'font-medium',
      render: (invoice) => invoice.invoice_number,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (invoice) => (
        <div>
          <span>{invoice.customers?.company_name || invoice.customers?.name || '-'}</span>
          {invoice.customers?.company_name && invoice.customers?.name && (
            <span className="block text-xs text-muted-foreground">{invoice.customers.name}</span>
          )}
        </div>
      ),
    },
    {
      key: 'jo_number',
      header: 'JO #',
      width: '160px',
      render: (invoice) => invoice.job_orders?.jo_number || '-',
    },
    {
      key: 'subtotal',
      header: 'Subtotal',
      headerClassName: 'text-right',
      className: 'text-right',
      width: '130px',
      render: (invoice) => formatIDR(invoice.subtotal),
    },
    {
      key: 'tax_amount',
      header: 'VAT (11%)',
      headerClassName: 'text-right',
      className: 'text-right',
      width: '120px',
      render: (invoice) => formatIDR(invoice.tax_amount),
    },
    {
      key: 'total_amount',
      header: 'Total',
      headerClassName: 'text-right',
      className: 'text-right font-medium',
      width: '140px',
      render: (invoice) => formatIDR(invoice.total_amount),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      width: '100px',
      render: (invoice) => formatDate(invoice.due_date),
    },
    {
      key: 'status',
      header: 'Status',
      width: '140px',
      render: (invoice) => (
        <div className="flex items-center gap-1">
          <InvoiceStatusBadge status={invoice.status} />
          {invoice.has_bg && (
            <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-[10px] px-1 py-0">
              BG
            </Badge>
          )}
        </div>
      ),
    },
  ]

  return (
    <VirtualDataTable
      columns={columns}
      data={invoices}
      getRowKey={(invoice) => invoice.id}
      onRowClick={(invoice) => router.push(`/invoices/${invoice.id}`)}
      emptyMessage="No invoices found. Create your first invoice from a Job Order."
      maxHeight={600}
      mobileCardRender={(invoice) => (
        <div className="rounded-lg border bg-card p-4 space-y-2 active:bg-muted/50">
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-sm">{invoice.invoice_number}</span>
            <div className="flex items-center gap-1">
              <InvoiceStatusBadge status={invoice.status} />
              {invoice.has_bg && (
                <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-[10px] px-1 py-0">
                  BG
                </Badge>
              )}
            </div>
          </div>
          <div className="text-sm">
            {invoice.customers?.company_name || invoice.customers?.name || '-'}
            {invoice.customers?.company_name && invoice.customers?.name && (
              <span className="block text-xs text-muted-foreground">{invoice.customers.name}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">JO: {invoice.job_orders?.jo_number || '-'}</div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{formatIDR(invoice.total_amount)}</span>
            <span className="text-xs text-muted-foreground">Due: {formatDate(invoice.due_date)}</span>
          </div>
        </div>
      )}
    />
  )
}
