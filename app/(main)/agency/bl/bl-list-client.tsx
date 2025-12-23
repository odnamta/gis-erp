'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BLCard } from '@/components/agency/bl-card';
import { BLSummaryCards, BLStats } from '@/components/agency/bl-summary-cards';
import {
  BillOfLading,
  BLFilters,
  ShippingLine,
  BL_STATUSES,
  BL_STATUS_LABELS,
  BLStatus,
} from '@/types/agency';
import { getBillsOfLading } from '@/app/actions/bl-documentation-actions';
import { Plus, Search, X, Loader2 } from 'lucide-react';

interface BLListClientProps {
  initialBLs: BillOfLading[];
  initialStats: BLStats;
  shippingLines: ShippingLine[];
}

export function BLListClient({
  initialBLs,
  initialStats,
  shippingLines,
}: BLListClientProps) {
  const [bls, setBLs] = useState<BillOfLading[]>(initialBLs);
  const [stats] = useState<BLStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<BLFilters>({
    search: '',
    status: undefined,
    shippingLineId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await getBillsOfLading(filters);
      setBLs(results);
    } catch (error) {
      console.error('Failed to search B/Ls:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (key: keyof BLFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleClearFilters = async () => {
    const clearedFilters: BLFilters = {
      search: '',
      status: undefined,
      shippingLineId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };
    setFilters(clearedFilters);
    setIsLoading(true);
    try {
      const results = await getBillsOfLading(clearedFilters);
      setBLs(results);
    } catch (error) {
      console.error('Failed to clear filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = (bl: BillOfLading) => {
    window.open(`/agency/bl/${bl.id}/print`, '_blank');
  };

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.shippingLineId ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bills of Lading</h1>
          <p className="text-muted-foreground">
            Manage shipping documentation and B/L issuance
          </p>
        </div>
        <Link href="/agency/bl/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New B/L
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <BLSummaryCards stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by B/L number, shipper, consignee..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div className="w-[180px]">
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) =>
              handleFilterChange('status', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {BL_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {BL_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[200px]">
          <Select
            value={filters.shippingLineId || 'all'}
            onValueChange={(value) =>
              handleFilterChange('shippingLineId', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Shipping Lines" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shipping Lines</SelectItem>
              {shippingLines.map((line) => (
                <SelectItem key={line.id} value={line.id}>
                  {line.lineName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[150px]">
          <Input
            type="date"
            placeholder="From"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
        </div>

        <div className="w-[150px]">
          <Input
            type="date"
            placeholder="To"
            value={filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
        </div>

        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={handleClearFilters} disabled={isLoading}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : bls.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No Bills of Lading found</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={handleClearFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bls.map((bl) => (
            <BLCard
              key={bl.id}
              bl={bl}
              onPrint={handlePrint}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && bls.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {bls.length} B/L{bls.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
