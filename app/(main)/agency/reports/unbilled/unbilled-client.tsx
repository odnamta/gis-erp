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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ShipmentRevenue } from '@/types/agency';
import { getUnbilledRevenue } from '@/app/actions/profitability-actions';
import {
  Search,
  X,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
} from 'lucide-react';

// Type for unbilled revenue grouped by booking
interface UnbilledRevenueByBooking {
  bookingId: string;
  bookingNumber: string;
  customerName?: string;
  items: ShipmentRevenue[];
  totalUnbilled: number;
}

interface UnbilledFilters {
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface UnbilledRevenueClientProps {
  initialUnbilledRevenue: UnbilledRevenueByBooking[];
  customers: { id: string; name: string }[];
}

export function UnbilledRevenueClient({
  initialUnbilledRevenue,
  customers,
}: UnbilledRevenueClientProps) {
  const [unbilledRevenue, setUnbilledRevenue] = useState<UnbilledRevenueByBooking[]>(initialUnbilledRevenue);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<UnbilledFilters>({
    customerId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Calculate totals
  const totalUnbilled = unbilledRevenue.reduce((sum, b) => sum + b.totalUnbilled, 0);
  const totalBookings = unbilledRevenue.length;
  const totalItems = unbilledRevenue.reduce((sum, b) => sum + b.items.length, 0);

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getUnbilledRevenue(filters);
      if (result.success && result.data) {
        setUnbilledRevenue(result.data);
      }
    } catch (error) {
      console.error('Failed to search unbilled revenue:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (key: keyof UnbilledFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleClearFilters = async () => {
    const clearedFilters: UnbilledFilters = {
      customerId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };
    setFilters(clearedFilters);
    setIsLoading(true);
    try {
      const result = await getUnbilledRevenue(clearedFilters);
      if (result.success && result.data) {
        setUnbilledRevenue(result.data);
      }
    } catch (error) {
      console.error('Failed to clear filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleBooking = (bookingId: string) => {
    const newExpanded = new Set(expandedBookings);
    if (newExpanded.has(bookingId)) {
      newExpanded.delete(bookingId);
    } else {
      newExpanded.add(bookingId);
    }
    setExpandedBookings(newExpanded);
  };

  const expandAll = () => {
    setExpandedBookings(new Set(unbilledRevenue.map(b => b.bookingId)));
  };

  const collapseAll = () => {
    setExpandedBookings(new Set());
  };

  const hasActiveFilters =
    filters.customerId ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Unbilled Revenue Report</h1>
        <p className="text-muted-foreground">
          Track revenue items that have not yet been invoiced
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span>Total Unbilled</span>
            </div>
            <div className="text-2xl font-semibold text-yellow-600">
              {formatCurrency(totalUnbilled)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span>Bookings with Unbilled</span>
            </div>
            <div className="text-2xl font-semibold">
              {totalBookings}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span>Total Line Items</span>
            </div>
            <div className="text-2xl font-semibold">
              {totalItems}
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

      {/* Unbilled Revenue List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Unbilled Revenue by Booking
            </CardTitle>
            {unbilledRevenue.length > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>
                  Expand All
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : unbilledRevenue.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <AlertCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <p className="text-lg font-medium text-green-600">All revenue has been billed!</p>
              <p className="text-muted-foreground mt-1">No unbilled revenue items found</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={handleClearFilters} className="mt-2">
                  Clear filters to see all
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {unbilledRevenue.map((booking) => (
                <Collapsible
                  key={booking.bookingId}
                  open={expandedBookings.has(booking.bookingId)}
                  onOpenChange={() => toggleBooking(booking.bookingId)}
                >
                  <div className="border rounded-lg">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          {expandedBookings.has(booking.bookingId) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <div className="font-medium">{booking.bookingNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {booking.customerName || 'No customer'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">
                            {booking.items.length} item{booking.items.length !== 1 ? 's' : ''}
                          </Badge>
                          <div className="text-right">
                            <div className="font-semibold text-yellow-600">
                              {formatCurrency(booking.totalUnbilled)}
                            </div>
                            <div className="text-xs text-muted-foreground">Unbilled</div>
                          </div>
                          <Link href={`/agency/bookings/${booking.bookingId}/financials`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t px-4 pb-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Charge</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Tax</TableHead>
                              <TableHead className="text-right">Total (IDR)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {booking.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                  {item.chargeType?.chargeName || 'Unknown'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {item.description || '-'}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.currency} {item.amount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.taxAmount)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(item.amountIdr)}
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/50">
                              <TableCell colSpan={4} className="font-medium text-right">
                                Subtotal:
                              </TableCell>
                              <TableCell className="text-right font-semibold text-yellow-600">
                                {formatCurrency(booking.totalUnbilled)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grand Total */}
      {unbilledRevenue.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Grand Total Unbilled Revenue</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totalUnbilled)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
