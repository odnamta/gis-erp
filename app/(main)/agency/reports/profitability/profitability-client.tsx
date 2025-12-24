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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShipmentProfitability,
  ProfitabilityFilters,
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
} from '@/types/agency';
import { getShipmentProfitability } from '@/app/actions/profitability-actions';
import { getMarginIndicator, DEFAULT_MARGIN_TARGET } from '@/lib/cost-revenue-utils';
import {
  Search,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfitabilityClientProps {
  initialProfitability: ShipmentProfitability[];
  customers: { id: string; name: string }[];
}

export function ProfitabilityClient({
  initialProfitability,
  customers,
}: ProfitabilityClientProps) {
  const [profitability, setProfitability] = useState<ShipmentProfitability[]>(initialProfitability);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<ProfitabilityFilters>({
    customerId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    status: undefined,
    minMargin: undefined,
    maxMargin: undefined,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate summary statistics
  const totalRevenue = profitability.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalCost = profitability.reduce((sum, p) => sum + p.totalCost, 0);
  const totalProfit = profitability.reduce((sum, p) => sum + p.grossProfit, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const aboveTargetCount = profitability.filter(p => p.profitMarginPct >= DEFAULT_MARGIN_TARGET).length;
  const belowTargetCount = profitability.filter(p => p.profitMarginPct < DEFAULT_MARGIN_TARGET).length;

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getShipmentProfitability(filters);
      if (result.success && result.data) {
        setProfitability(result.data);
      }
    } catch (error) {
      console.error('Failed to search profitability:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (key: keyof ProfitabilityFilters, value: string | number | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleClearFilters = async () => {
    const clearedFilters: ProfitabilityFilters = {
      customerId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      status: undefined,
      minMargin: undefined,
      maxMargin: undefined,
    };
    setFilters(clearedFilters);
    setIsLoading(true);
    try {
      const result = await getShipmentProfitability(clearedFilters);
      if (result.success && result.data) {
        setProfitability(result.data);
      }
    } catch (error) {
      console.error('Failed to clear filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasActiveFilters =
    filters.customerId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.status ||
    filters.minMargin !== undefined ||
    filters.maxMargin !== undefined;

  const getMarginBadge = (margin: number) => {
    const indicator = getMarginIndicator(margin, DEFAULT_MARGIN_TARGET);
    const colorClasses = {
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={cn('font-medium', colorClasses[indicator])}>
        {formatPercent(margin)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Shipment Profitability Report</h1>
        <p className="text-muted-foreground">
          Analyze financial performance across all shipments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span>Total Revenue</span>
            </div>
            <div className="text-lg font-semibold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span>Total Cost</span>
            </div>
            <div className="text-lg font-semibold text-red-600">
              {formatCurrency(totalCost)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className={cn('h-4 w-4', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')} />
              <span>Total Profit</span>
            </div>
            <div className={cn('text-lg font-semibold', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
              {formatCurrency(totalProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span>Avg Margin</span>
            </div>
            <div className="text-lg font-semibold">
              {getMarginBadge(avgMargin)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span className="h-4 w-4 rounded-full bg-green-500" />
              <span>Above Target</span>
            </div>
            <div className="text-lg font-semibold text-green-600">
              {aboveTargetCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span className="h-4 w-4 rounded-full bg-red-500" />
              <span>Below Target</span>
            </div>
            <div className="text-lg font-semibold text-red-600">
              {belowTargetCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">Customer</label>
              <Select
                value={filters.customerId || 'all'}
                onValueChange={(value) =>
                  handleFilterChange('customerId', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
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

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1 block">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div className="w-[140px]">
              <label className="text-sm text-muted-foreground mb-1 block">Date To</label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            <div className="w-[100px]">
              <label className="text-sm text-muted-foreground mb-1 block">Min Margin %</label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minMargin ?? ''}
                onChange={(e) => handleFilterChange('minMargin', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>

            <div className="w-[100px]">
              <label className="text-sm text-muted-foreground mb-1 block">Max Margin %</label>
              <Input
                type="number"
                placeholder="100"
                value={filters.maxMargin ?? ''}
                onChange={(e) => handleFilterChange('maxMargin', e.target.value ? Number(e.target.value) : undefined)}
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
        </CardContent>
      </Card>

      {/* Profitability Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Shipment Profitability ({profitability.length} bookings)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : profitability.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No profitability data found</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={handleClearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>JO Number</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-center">Margin</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitability.map((item) => {
                    const isProfit = item.grossProfit >= 0;
                    return (
                      <TableRow key={item.bookingId}>
                        <TableCell className="font-medium">
                          {item.bookingNumber}
                        </TableCell>
                        <TableCell>{item.customerName || '-'}</TableCell>
                        <TableCell>{item.joNumber || '-'}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(item.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(item.totalCost)}
                        </TableCell>
                        <TableCell className={cn('text-right font-medium', isProfit ? 'text-green-600' : 'text-red-600')}>
                          {formatCurrency(item.grossProfit)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getMarginBadge(item.profitMarginPct)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/agency/bookings/${item.bookingId}/financials`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target info */}
      <p className="text-sm text-muted-foreground text-center">
        Target profit margin: {DEFAULT_MARGIN_TARGET}% • 
        <span className="text-green-600"> Green</span> = at or above target • 
        <span className="text-yellow-600"> Yellow</span> = within 5% of target • 
        <span className="text-red-600"> Red</span> = below target
      </p>
    </div>
  );
}
