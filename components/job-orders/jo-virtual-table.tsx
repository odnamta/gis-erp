'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { JOStatusBadge } from '@/components/ui/jo-status-badge'
import { JobOrderWithRelations } from '@/types'
import { formatIDR, formatDate } from '@/lib/pjo-utils'
import { Eye } from 'lucide-react'
import { VirtualDataTable, VirtualColumn } from '@/components/tables/virtual-data-table'

interface JOVirtualTableProps {
  jobOrders: JobOrderWithRelations[]
  userRole?: string
}

export function JOVirtualTable({ jobOrders, userRole }: JOVirtualTableProps) {
  const router = useRouter()
  const isOps = userRole === 'ops'

  const allColumns: VirtualColumn<JobOrderWithRelations>[] = [
    {
      key: 'jo_number',
      header: 'JO Number',
      width: '140px',
      render: (jo) => (
        <Link href={`/job-orders/${jo.id}`} className="font-medium hover:underline">
          {jo.jo_number}
        </Link>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      width: '100px',
      render: (jo) =>
        jo.converted_from_pjo_at
          ? formatDate(jo.converted_from_pjo_at)
          : jo.created_at
          ? formatDate(jo.created_at)
          : '-',
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (jo) =>
        jo.customers ? (
          <Link href={`/customers/${jo.customers.id}`} className="hover:underline">
            <span>{jo.customers.company_name || jo.customers.name}</span>
            {jo.customers.company_name && (
              <span className="block text-xs text-muted-foreground">{jo.customers.name}</span>
            )}
          </Link>
        ) : (
          '-'
        ),
    },
    {
      key: 'project',
      header: 'Project',
      render: (jo) =>
        jo.projects ? (
          <Link href={`/projects/${jo.projects.id}`} className="hover:underline">
            {jo.projects.name}
          </Link>
        ) : (
          '-'
        ),
    },
    {
      key: 'final_revenue',
      header: 'Revenue',
      headerClassName: 'text-right',
      className: 'text-right',
      width: '130px',
      render: (jo) => formatIDR(jo.final_revenue ?? jo.amount ?? 0),
    },
    {
      key: 'profit',
      header: 'Profit',
      headerClassName: 'text-right',
      width: '130px',
      render: (jo) => {
        const revenue = jo.final_revenue ?? jo.amount ?? 0
        const profit = revenue - (jo.final_cost ?? 0)
        return (
          <span className={`text-right block ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {jo.final_cost ? formatIDR(profit) : '-'}
          </span>
        )
      },
    },
    {
      key: 'margin',
      header: 'Margin',
      headerClassName: 'text-right',
      width: '80px',
      render: (jo) => {
        const revenue = jo.final_revenue ?? jo.amount ?? 0
        const profit = revenue - (jo.final_cost ?? 0)
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0
        return (
          <span className={`text-right block ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {jo.final_cost ? `${margin.toFixed(1)}%` : '-'}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (jo) => <JOStatusBadge status={jo.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '80px',
      render: (jo) => (
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/job-orders/${jo.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ]

  // Filter out revenue/profit/margin columns for ops role
  const hiddenForOps = ['final_revenue', 'profit', 'margin']
  const columns = isOps ? allColumns.filter(c => !hiddenForOps.includes(c.key)) : allColumns

  return (
    <VirtualDataTable
      columns={columns}
      data={jobOrders}
      getRowKey={(jo) => jo.id}
      onRowClick={(jo) => router.push(`/job-orders/${jo.id}`)}
      emptyMessage="No job orders found."
      maxHeight={600}
      mobileCardRender={(jo) => {
        const revenue = jo.final_revenue ?? jo.amount ?? 0
        const profit = revenue - (jo.final_cost ?? 0)
        const date = jo.converted_from_pjo_at
          ? formatDate(jo.converted_from_pjo_at)
          : jo.created_at
          ? formatDate(jo.created_at)
          : '-'

        return (
          <div className="rounded-lg border bg-card p-4 space-y-2 active:bg-muted/50">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-sm">{jo.jo_number}</span>
              <JOStatusBadge status={jo.status} />
            </div>
            <div className="text-sm text-muted-foreground">
              {jo.customers?.company_name || jo.customers?.name || '-'}
              {jo.customers?.company_name && jo.customers?.name && (
                <span className="block text-xs text-muted-foreground/70">{jo.customers.name}</span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{date}</span>
              {!isOps && (
                <span className="font-medium text-foreground">
                  {formatIDR(revenue)}
                </span>
              )}
            </div>
            {!isOps && jo.final_cost != null && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Profit</span>
                <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatIDR(profit)}
                </span>
              </div>
            )}
          </div>
        )
      }}
    />
  )
}
