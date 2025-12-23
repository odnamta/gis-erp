'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SICard } from '@/components/agency/si-card';
import {
  ShippingInstruction,
  SIFilters,
  SI_STATUSES,
  SI_STATUS_LABELS,
} from '@/types/agency';
import { getShippingInstructions, SIStats } from '@/app/actions/bl-documentation-actions';
import { Plus, Search, X, Loader2, FileText, Send, CheckCircle, Edit3 } from 'lucide-react';

interface SIListClientProps {
  initialSIs: ShippingInstruction[];
  initialStats: SIStats;
}

export function SIListClient({
  initialSIs,
  initialStats,
}: SIListClientProps) {
  const [sis, setSIs] = useState<ShippingInstruction[]>(initialSIs);
  const [stats] = useState<SIStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<SIFilters>({
    search: '',
    status: undefined,
    bookingId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await getShippingInstructions(filters);
      setSIs(results);
    } catch (error) {
      console.error('Failed to search SIs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (key: keyof SIFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleClearFilters = async () => {
    const clearedFilters: SIFilters = {
      search: '',
      status: undefined,
      bookingId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };
    setFilters(clearedFilters);
    setIsLoading(true);
    try {
      const results = await getShippingInstructions(clearedFilters);
      setSIs(results);
    } catch (error) {
      console.error('Failed to clear filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.bookingId ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shipping Instructions</h1>
          <p className="text-muted-foreground">
            Manage shipping instructions for B/L preparation
          </p>
        </div>
        <Link href="/agency/si/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New SI
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-muted-foreground">Draft</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Submitted</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.submitted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Confirmed</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Amended</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.amended}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by SI number, shipper, consignee..."
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
              {SI_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {SI_STATUS_LABELS[status]}
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
      ) : sis.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No Shipping Instructions found</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={handleClearFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sis.map((si) => (
            <SICard key={si.id} si={si} />
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && sis.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {sis.length} SI{sis.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
