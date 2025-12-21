'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { AssetCategory, AssetLocation, AssetFilterState, AssetStatus } from '@/types/assets'
import { ASSET_STATUSES } from '@/lib/asset-utils'

interface AssetFiltersProps {
  filters: AssetFilterState
  onFiltersChange: (filters: AssetFilterState) => void
  categories: AssetCategory[]
  locations: AssetLocation[]
}

export function AssetFilters({
  filters,
  onFiltersChange,
  categories,
  locations,
}: AssetFiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by code, name, or registration..."
          value={filters.search}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="pl-9"
        />
      </div>

      <Select
        value={filters.categoryId}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, categoryId: value as string | 'all' })
        }
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.category_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, status: value as AssetStatus | 'all' })
        }
      >
        <SelectTrigger className="w-full md:w-[150px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {ASSET_STATUSES.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.locationId}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, locationId: value as string | 'all' })
        }
      >
        <SelectTrigger className="w-full md:w-[150px]">
          <SelectValue placeholder="All Locations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((location) => (
            <SelectItem key={location.id} value={location.id}>
              {location.location_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
