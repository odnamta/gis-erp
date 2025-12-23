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
import { BookingCard } from '@/components/agency/booking-card';
import { BookingSummaryCards } from '@/components/agency/booking-summary-cards';
import {
  FreightBooking,
  BookingStats,
  BookingFilters,
  ShippingLine,
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  BookingStatus,
} from '@/types/agency';
import { getBookings } from '@/app/actions/booking-actions';
import { Plus, Search, X, Loader2 } from 'lucide-react';

interface BookingsClientProps {
  initialBookings: FreightBooking[];
  initialStats: BookingStats;
  shippingLines: ShippingLine[];
}

export function BookingsClient({
  initialBookings,
  initialStats,
  shippingLines,
}: BookingsClientProps) {
  const [bookings, setBookings] = useState<FreightBooking[]>(initialBookings);
  const [stats] = useState<BookingStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<BookingFilters>({
    search: '',
    status: undefined,
    shippingLineId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await getBookings(filters);
      setBookings(results);
    } catch (error) {
      console.error('Failed to search bookings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (key: keyof BookingFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleClearFilters = async () => {
    const clearedFilters: BookingFilters = {
      search: '',
      status: undefined,
      shippingLineId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };
    setFilters(clearedFilters);
    setIsLoading(true);
    try {
      const results = await getBookings(clearedFilters);
      setBookings(results);
    } catch (error) {
      console.error('Failed to clear filters:', error);
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-2xl font-bold">Freight Bookings</h1>
          <p className="text-muted-foreground">
            Manage shipping line bookings and track shipments
          </p>
        </div>
        <Link href="/agency/bookings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <BookingSummaryCards stats={stats} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by booking number..."
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
              {BOOKING_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {BOOKING_STATUS_LABELS[status]}
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
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground">No bookings found</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={handleClearFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onClick={() => (window.location.href = `/agency/bookings/${booking.id}`)}
            />
          ))}
        </div>
      )}

      {/* Results count */}
      {!isLoading && bookings.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
