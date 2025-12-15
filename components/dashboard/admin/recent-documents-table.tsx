'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { type RecentDocument, type WorkItemType, filterDocumentsByType } from '@/lib/admin-dashboard-utils'
import { formatDate } from '@/lib/pjo-utils'

interface RecentDocumentsTableProps {
  documents: RecentDocument[]
  isLoading?: boolean
}

const TYPE_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pjo: { label: 'PJO', variant: 'default' },
  jo: { label: 'JO', variant: 'secondary' },
  invoice: { label: 'INV', variant: 'outline' },
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  submitted_to_finance: 'bg-purple-100 text-purple-700',
  invoiced: 'bg-indigo-100 text-indigo-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  rejected: 'bg-red-100 text-red-700',
}

export function RecentDocumentsTable({ documents, isLoading }: RecentDocumentsTableProps) {
  const [filter, setFilter] = useState<WorkItemType | 'all'>('all')
  
  const filteredDocs = filterDocumentsByType(documents, filter)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Documents</CardTitle>
        <Select value={filter} onValueChange={(v) => setFilter(v as WorkItemType | 'all')}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pjo">PJO</SelectItem>
            <SelectItem value="jo">JO</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Type</TableHead>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No documents found
                </TableCell>
              </TableRow>
            ) : (
              filteredDocs.map((doc) => {
                const typeBadge = TYPE_BADGES[doc.type]
                const statusColor = STATUS_COLORS[doc.status] || 'bg-gray-100 text-gray-700'
                return (
                  <TableRow key={`${doc.type}-${doc.id}`}>
                    <TableCell>
                      <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link 
                        href={doc.linkUrl} 
                        className="font-mono text-sm hover:underline"
                      >
                        {doc.number}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">{doc.customerName}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}>
                        {doc.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.createdAt ? formatDate(doc.createdAt) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {doc.updatedAt ? formatDate(doc.updatedAt) : '-'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
