'use client'

import { useRouter } from 'next/navigation'
import { InvoiceStatusBadge } from '@/components/ui/invoice-status-badge'
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
      render: (invoice) => invoice.customers?.name || '-',
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
      width: '100px',
      render: (invoice) => <InvoiceStatusBadge status={invoice.status} />,
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
    />
  )
}
