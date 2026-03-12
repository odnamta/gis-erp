'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  UpcomingArrival,
  VESSEL_TYPE_LABELS,
  VESSEL_TYPES,
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_COLORS,
} from '@/types/agency';
import { CompactDelayBadge } from './delay-indicator';
import { filterArrivalsByDateRange, sortArrivalsByTime } from '@/lib/vessel-tracking-utils';
import { format, parseISO, addDays, startOfDay, endOfDay } from 'date-fns';
import {
  Ship,
  MapPin,
  Calendar,
  Package,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface UpcomingArrivalsProps {
  arrivals: UpcomingArrival[];
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * List component for upcoming vessel arrivals with filters.
 * Shows booking count per vessel/voyage.
 * 
 * **Requirements: 7.1-7.6**
 */
export function UpcomingArrivals({
  arrivals,
  onRefresh,
  isLoading = false,
  className,
}: UpcomingArrivalsProps) {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [vesselTypeFilter, setVesselTypeFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Quick date range presets
  const setDateRange = (days: number) => {
    const today = startOfDay(new Date());
    const end = endOfDay(addDays(today, days));
    setDateFrom(format(today, 'yyyy-MM-dd'));
    setDateTo(format(end, 'yyyy-MM-dd'));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setVesselTypeFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // Filter and sort arrivals
  const filteredArrivals = useMemo(() => {
    let result = [...arrivals];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        a =>
          a.vesselName.toLowerCase().includes(query) ||
          a.voyageNumber.toLowerCase().includes(query) ||
          a.portName.toLowerCase().includes(query) ||
          (a.imoNumber && a.imoNumber.includes(query))
      );
    }

    // Vessel type filter
    if (vesselTypeFilter) {
      result = result.filter(a => a.vesselType === vesselTypeFilter);
    }

    // Date range filter
    if (dateFrom && dateTo) {
      result = filterArrivalsByDateRange(result, dateFrom, dateTo);
    } else if (dateFrom) {
      result = result.filter(a => new Date(a.scheduledArrival) >= new Date(dateFrom));
    } else if (dateTo) {
      result = result.filter(a => new Date(a.scheduledArrival) <= new Date(dateTo));
    }

    // Sort by arrival time
    result = sortArrivalsByTime(result);

    // Apply sort direction
    if (sortDirection === 'desc') {
      result.reverse();
    }

    return result;
  }, [arrivals, searchQuery, vesselTypeFilter, dateFrom, dateTo, sortDirection]);

  // Format date for display
  const formatArrivalDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalBookings = filteredArrivals.reduce((sum, a) => sum + a.ourBookingsCount, 0);
    const delayedCount = filteredArrivals.filter(a => a.delayHours > 0).length;
    return { totalBookings, delayedCount };
  }, [filteredArrivals]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Upcoming Arrivals
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
              {showFilters ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </Button>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{filteredArrivals.length} arrivals</span>
          <span>•</span>
          <span>{stats.totalBookings} bookings</span>
          {stats.delayedCount > 0 && (
            <>
              <span>•</span>
              <span className="text-orange-600">{stats.delayedCount} delayed</span>
            </>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Vessel, voyage, port..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Vessel Type */}
              <div className="space-y-2">
                <Label>Vessel Type</Label>
                <Select
                  value={vesselTypeFilter || '__all__'}
                  onValueChange={(v) => setVesselTypeFilter(v === '__all__' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All types</SelectItem>
                    {VESSEL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {VESSEL_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Date Presets */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Quick:</span>
              <Button variant="outline" size="sm" onClick={() => setDateRange(7)}>
                Next 7 days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange(14)}>
                Next 14 days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange(30)}>
                Next 30 days
              </Button>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredArrivals.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {arrivals.length === 0
              ? 'No upcoming arrivals scheduled'
              : 'No arrivals match your filters'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vessel</TableHead>
                  <TableHead>Voyage</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      ETA
                      {sortDirection === 'asc' ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Package className="h-4 w-4" />
                      Bookings
                    </div>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArrivals.map((arrival) => (
                  <TableRow key={arrival.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{arrival.vesselName}</div>
                        {arrival.imoNumber && (
                          <div className="text-xs text-muted-foreground font-mono">
                            IMO: {arrival.imoNumber}
                          </div>
                        )}
                        {arrival.vesselType && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {VESSEL_TYPE_LABELS[arrival.vesselType]}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{arrival.voyageNumber}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <div>{arrival.portName}</div>
                          {arrival.portCode && (
                            <div className="text-xs text-muted-foreground">
                              {arrival.portCode}
                            </div>
                          )}
                          {arrival.terminal && (
                            <div className="text-xs text-muted-foreground">
                              {arrival.terminal}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatArrivalDate(arrival.scheduledArrival)}</span>
                        {arrival.delayHours > 0 && (
                          <CompactDelayBadge delayHours={arrival.delayHours} />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={SCHEDULE_STATUS_COLORS[arrival.status]}>
                        {SCHEDULE_STATUS_LABELS[arrival.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {arrival.ourBookingsCount > 0 ? (
                        <Badge variant="secondary">
                          {arrival.ourBookingsCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/agency/schedules/${arrival.id}`}>
                        <Button variant="ghost" size="icon" title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact arrivals list for dashboard widgets
 */
interface CompactArrivalsListProps {
  arrivals: UpcomingArrival[];
  limit?: number;
  className?: string;
}

export function CompactArrivalsList({
  arrivals,
  limit = 5,
  className,
}: CompactArrivalsListProps) {
  const sortedArrivals = sortArrivalsByTime(arrivals).slice(0, limit);

  if (sortedArrivals.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground text-center py-4', className)}>
        No upcoming arrivals
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {sortedArrivals.map((arrival) => (
        <Link
          key={arrival.id}
          href={`/agency/schedules/${arrival.id}`}
          className="block p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{arrival.vesselName}</span>
                {arrival.delayHours > 0 && (
                  <CompactDelayBadge delayHours={arrival.delayHours} />
                )}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{arrival.portName}</span>
                <span>•</span>
                <span>{format(parseISO(arrival.scheduledArrival), 'dd MMM HH:mm')}</span>
              </div>
            </div>
            {arrival.ourBookingsCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {arrival.ourBookingsCount}
              </Badge>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
