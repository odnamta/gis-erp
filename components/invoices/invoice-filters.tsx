'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InvoiceStatus } from '@/types'
import { INVOICE_STATUS_LABELS } from '@/lib/invoice-utils'
import { Search } from 'lucide-react'

interface InvoiceFiltersProps {
  status: InvoiceStatus | 'all'
  search: string
  onStatusChange: (status: InvoiceStatus | 'all') => void
  onSearchChange: (search: string) => void
}

const statusOptions: (InvoiceStatus | 'all')[] = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled']

export function InvoiceFilters({
  status,
  search,
  onStatusChange,
  onSearchChange,
}: InvoiceFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by invoice number or customer..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select
        value={status}
        onValueChange={(value) => onStatusChange(value as InvoiceStatus | 'all')}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {s === 'all' ? 'All Statuses' : INVOICE_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
