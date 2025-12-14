'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { JOStatusBadge } from '@/components/ui/jo-status-badge'
import { JobOrderWithRelations } from '@/types'
import { formatIDR, formatDate } from '@/lib/pjo-utils'
import { Eye } from 'lucide-react'

interface JOTableProps {
  jobOrders: JobOrderWithRelations[]
}

export function JOTable({ jobOrders }: JOTableProps) {
  if (jobOrders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No job orders found.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>JO Number</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Project</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Profit</TableHead>
          <TableHead className="text-right">Margin</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobOrders.map((jo) => {
          const revenue = jo.final_revenue ?? jo.amount ?? 0
          const profit = revenue - (jo.final_cost ?? 0)
          const margin = revenue > 0 ? (profit / revenue) * 100 : 0
          return (
            <TableRow key={jo.id}>
              <TableCell className="font-medium">
                <Link href={`/job-orders/${jo.id}`} className="hover:underline">
                  {jo.jo_number}
                </Link>
              </TableCell>
              <TableCell>
                {jo.converted_from_pjo_at
                  ? formatDate(jo.converted_from_pjo_at)
                  : jo.created_at
                  ? formatDate(jo.created_at)
                  : '-'}
              </TableCell>
              <TableCell>
                {jo.customers ? (
                  <Link href={`/customers/${jo.customers.id}`} className="hover:underline">
                    {jo.customers.name}
                  </Link>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                {jo.projects ? (
                  <Link href={`/projects/${jo.projects.id}`} className="hover:underline">
                    {jo.projects.name}
                  </Link>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right">
                {formatIDR(jo.final_revenue ?? jo.amount ?? 0)}
              </TableCell>
              <TableCell className={`text-right ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {jo.final_cost ? formatIDR(profit) : '-'}
              </TableCell>
              <TableCell className={`text-right ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {jo.final_cost ? `${margin.toFixed(1)}%` : '-'}
              </TableCell>
              <TableCell>
                <JOStatusBadge status={jo.status} />
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/job-orders/${jo.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
