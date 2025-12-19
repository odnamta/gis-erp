'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { VendorFilterState, VendorType } from '@/types/vendors';
import { VENDOR_TYPES } from '@/lib/vendor-utils';

interface VendorFiltersProps {
  filters: VendorFilterState;
  onFilterChange: (filters: VendorFilterState) => void;
}

export function VendorFilters({ filters, onFilterChange }: VendorFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, search: value });
  };

  const handleTypeChange = (value: string) => {
    onFilterChange({ ...filters, type: value as VendorType | 'all' });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({ ...filters, status: value as 'active' | 'inactive' | 'all' });
  };

  const handlePreferredChange = (checked: boolean) => {
    onFilterChange({ ...filters, preferredOnly: checked });
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vendors..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type Filter */}
      <Select value={filters.type} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {VENDOR_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={filters.status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {/* Preferred Only */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="preferred-only"
          checked={filters.preferredOnly}
          onCheckedChange={handlePreferredChange}
        />
        <Label htmlFor="preferred-only" className="text-sm cursor-pointer">
          Preferred Only
        </Label>
      </div>
    </div>
  );
}
