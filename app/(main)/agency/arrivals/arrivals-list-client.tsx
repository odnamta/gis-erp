'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrivalNoticeCard } from '@/components/agency/arrival-notice-card';
import {
  ArrivalNotice,
  ArrivalNoticeStatus,
  ARRIVAL_NOTICE_STATUSES,
  ARRIVAL_NOTICE_STATUS_LABELS,
} from '@/types/agency';
import { getArrivalNotices, markConsigneeNotified } from '@/app/actions/bl-documentation-actions';
import { 
  Plus, 
  Search, 
  X, 
  Loader2, 
  Ship, 
  Clock, 
  CheckCircle, 
  Truck,
  Bell,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


export interface ArrivalStats {
  total: number;
  pending: number;
  notified: number;
  cleared: number;
  delivered: number;
}

interface ArrivalsFilters {
  search?: string;
  status?: ArrivalNoticeStatus;
  dateFrom?: string;
  dateTo?: string;
}

interface ArrivalsListClientProps {
  initialArrivals: ArrivalNotice[];
  pendingArrivals: ArrivalNotice[];
  initialStats: ArrivalStats;
}

export function ArrivalsListClient({
  initialArrivals,
  pendingArrivals,
  initialStats,
}: ArrivalsListClientProps) {
  const [arrivals, setArrivals] = useState<ArrivalNotice[]>(initialArrivals);
  const [stats] = useState<ArrivalStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [filters, setFilters] = useState<ArrivalsFilters>({
    search: '',
    status: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });
  const { toast } = useToast();

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await getArrivalNotices(filters);
      setArrivals(results);
    } catch (error) {
      console.error('Failed to search arrivals:', error);
      toast({
        title: 'Error',
        description: 'Failed to search arrival notices',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, toast]);

  const handleFilterChange = (key: keyof ArrivalsFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
  };

  const handleClearFilters = async () => {
    const clearedFilters: ArrivalsFilters = {
      search: '',
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };
    setFilters(clearedFilters);
    setIsLoading(true);
    try {
      const results = await getArrivalNotices(clearedFilters);
      setArrivals(results);
    } catch (error) {
      console.error('Failed to clear filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotify = async (notice: ArrivalNotice) => {
    try {
      const result = await markConsigneeNotified(notice.id, 'Current User');
      if (result.success) {
        toast({
          title: 'Success',
          description: `Consignee notified for ${notice.noticeNumber}`,
        });
        // Refresh the list
        handleSearch();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to notify consignee',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to notify consignee:', error);
      toast({
        title: 'Error',
        description: 'Failed to notify consignee',
        variant: 'destructive',
      });
    }
  };

  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.dateFrom ||
    filters.dateTo;

  // Get arrivals with expiring free time (within 3 days)
  const getExpiringArrivals = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    return pendingArrivals.filter(a => {
      if (!a.freeTimeExpires) return false;
      const expiryDate = new Date(a.freeTimeExpires);
      expiryDate.setHours(0, 0, 0, 0);
      return expiryDate <= threeDaysFromNow && a.status !== 'delivered';
    });
  };

  const expiringArrivals = getExpiringArrivals();

  // Filter arrivals based on active tab
  const getFilteredArrivals = () => {
    switch (activeTab) {
      case 'pending':
        return arrivals.filter(a => a.status === 'pending' || a.status === 'notified');
      case 'cleared':
        return arrivals.filter(a => a.status === 'cleared');
      case 'delivered':
        return arrivals.filter(a => a.status === 'delivered');
      default:
        return arrivals;
    }
  };

  const filteredArrivals = getFilteredArrivals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Arrival Notices</h1>
          <p className="text-muted-foreground">
            Track cargo arrivals and manage consignee notifications
          </p>
        </div>
        <Link href="/agency/arrivals/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Arrival Notice
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notified</CardTitle>
            <Bell className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleared</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cleared}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <Truck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Free Time Expiring Alert */}
      {expiringArrivals.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-4 w-4" />
              Free Time Expiring Soon ({expiringArrivals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-700">
              {expiringArrivals.length} arrival notice{expiringArrivals.length !== 1 ? 's have' : ' has'} free time expiring within 3 days.
              Take action to avoid demurrage charges.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search by notice number, vessel, port..."
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
              {ARRIVAL_NOTICE_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {ARRIVAL_NOTICE_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-[150px]">
          <Input
            type="date"
            placeholder="ETA From"
            value={filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
        </div>

        <div className="w-[150px]">
          <Input
            type="date"
            placeholder="ETA To"
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending ({stats.pending + stats.notified})
          </TabsTrigger>
          <TabsTrigger value="cleared" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Cleared ({stats.cleared})
          </TabsTrigger>
          <TabsTrigger value="delivered" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Delivered ({stats.delivered})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Ship className="h-4 w-4" />
            All ({stats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Results */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredArrivals.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/50">
              <p className="text-muted-foreground">No arrival notices found</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={handleClearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredArrivals.map((notice) => (
                <ArrivalNoticeCard
                  key={notice.id}
                  notice={notice}
                  onNotify={handleNotify}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Results count */}
      {!isLoading && filteredArrivals.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredArrivals.length} arrival notice{filteredArrivals.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
