'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/forms/date-picker'
import { X, AlertTriangle } from 'lucide-react'

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

const marketTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'simple', label: 'Simple' },
  { value: 'complex', label: 'Complex' },
]

interface PJOFiltersProps {
  statusFilter: string
  dateFrom: Date | undefined
  dateTo: Date | undefined
  overrunFilter?: boolean
  marketTypeFilter?: string
  onStatusChange: (status: string) => void
  onDateFromChange: (date: Date | undefined) => void
  onDateToChange: (date: Date | undefined) => void
  onOverrunFilterChange?: (checked: boolean) => void
  onMarketTypeChange?: (marketType: string) => void
  onClearFilters: () => void
}

export function PJOFilters({
  statusFilter,
  dateFrom,
  dateTo,
  overrunFilter = false,
  marketTypeFilter = 'all',
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onOverrunFilterChange,
  onMarketTypeChange,
  onClearFilters,
}: PJOFiltersProps) {
  const hasFilters = statusFilter !== 'all' || dateFrom || dateTo || overrunFilter || marketTypeFilter !== 'all'

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {onMarketTypeChange && (
        <div className="space-y-2">
          <Label>Market Type</Label>
          <Select value={marketTypeFilter} onValueChange={onMarketTypeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {marketTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Date From</Label>
        <DatePicker
          date={dateFrom}
          onSelect={onDateFromChange}
          placeholder="Select date"
        />
      </div>

      <div className="space-y-2">
        <Label>Date To</Label>
        <DatePicker
          date={dateTo}
          onSelect={onDateToChange}
          placeholder="Select date"
        />
      </div>

      {onOverrunFilterChange && (
        <div className="flex items-center space-x-2 pb-1">
          <Checkbox
            id="overrun-filter"
            checked={overrunFilter}
            onCheckedChange={(checked) => onOverrunFilterChange(checked === true)}
          />
          <label
            htmlFor="overrun-filter"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 cursor-pointer"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Has Overruns
          </label>
        </div>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X className="mr-1 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
