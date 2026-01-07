'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PIBFilters, PIB_STATUSES, CustomsOffice } from '@/types/pib'
import { formatPIBStatus } from '@/lib/pib-utils'
import { Search, X } from 'lucide-react'

interface PIBFiltersProps {
  filters: PIBFilters
  customsOffices: CustomsOffice[]
  onFiltersChange?: (filters: PIBFilters) => void
}

export function PIBFiltersComponent({
  filters,
  customsOffices,
}: PIBFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(filters.search || '')

  const updateFilters = (newFilters: Partial<PIBFilters>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    router.push(`/customs/import?${params.toString()}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search: searchValue || undefined })
  }

  const handleStatusChange = (value: string) => {
    updateFilters({ status: value === 'all' ? undefined : value as any })
  }

  const handleOfficeChange = (value: string) => {
    updateFilters({ customs_office_id: value === 'all' ? undefined : value })
  }

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ date_from: e.target.value || undefined })
  }

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ date_to: e.target.value || undefined })
  }

  const clearFilters = () => {
    setSearchValue('')
    router.push('/customs/import')
  }

  const hasActiveFilters =
    filters.status ||
    filters.customs_office_id ||
    filters.date_from ||
    filters.date_to ||
    filters.search

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search PIB..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-8 w-[250px]"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>

        {/* Status Filter */}
        <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PIB_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {formatPIBStatus(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Customs Office Filter */}
        <Select
          value={filters.customs_office_id || 'all'}
          onValueChange={handleOfficeChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Offices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Offices</SelectItem>
            {customsOffices.map((office) => (
              <SelectItem key={office.id} value={office.id}>
                {office.office_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={filters.date_from || ''}
            onChange={handleDateFromChange}
            className="w-[150px]"
            placeholder="From"
          />
          <span className="text-muted-foreground">to</span>
          <Input
            type="date"
            value={filters.date_to || ''}
            onChange={handleDateToChange}
            className="w-[150px]"
            placeholder="To"
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
