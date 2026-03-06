'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  VesselSchedule,
  UpcomingArrival,
  Vessel,
  SCHEDULE_STATUSES,
  SCHEDULE_STATUS_LABELS,
} from '@/types/agency';
import { getSchedules, getUpcomingArrivals, getVessels } from '@/app/actions/vessel-tracking-actions';
import { useToast } from '@/hooks/use-toast';
import { ScheduleCard } from '@/components/vessel-tracking/schedule-card';
import { UpcomingArrivals } from '@/components/vessel-tracking/upcoming-arrivals';
import {
  Plus,
  Loader2,
  Search,
  Calendar,
  Ship,
  AlertTriangle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';

interface ScheduleStats {
  totalSchedules: number;
  scheduledCount: number;
  arrivedCount: number;
  delayedCount: number;
}

function calculateScheduleStats(schedules: VesselSchedule[]): ScheduleStats {
  return {
    totalSchedules: schedules.length,
    scheduledCount: schedules.filter(s => s.status === 'scheduled').length,
    arrivedCount: schedules.filter(s => s.status === 'arrived' || s.status === 'berthed').length,
    delayedCount: schedules.filter(s => s.delayHours > 0).length,
  };
}


/**
 * Schedules list client component with filters and upcoming arrivals view.
 * 
 * **Requirements: 2.1-2.8, 7.1-7.6**
 */
export function SchedulesClient() {
  const { toast } = useToast();

  const [schedules, setSchedules] = useState<VesselSchedule[]>([]);
  const [upcomingArrivals, setUpcomingArrivals] = useState<UpcomingArrival[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [stats, setStats] = useState<ScheduleStats>({
    totalSchedules: 0,
    scheduledCount: 0,
    arrivedCount: 0,
    delayedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedules');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [vesselFilter, setVesselFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [delayFilter, setDelayFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [schedulesData, arrivalsData, vesselsData] = await Promise.all([
        getSchedules(),
        getUpcomingArrivals(),
        getVessels({ isActive: true }),
      ]);

      setSchedules(schedulesData);
      setUpcomingArrivals(arrivalsData);
      setVessels(vesselsData);
      setStats(calculateScheduleStats(schedulesData));
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load schedules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    setVesselFilter('');
    setStatusFilter('');
    setDelayFilter('');
    setDateFrom('');
    setDateTo('');
  };

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    let result = [...schedules];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          s.portName.toLowerCase().includes(query) ||
          s.voyageNumber.toLowerCase().includes(query) ||
          (s.vessel?.vesselName && s.vessel.vesselName.toLowerCase().includes(query)) ||
          (s.terminal && s.terminal.toLowerCase().includes(query))
      );
    }

    // Vessel filter
    if (vesselFilter) {
      result = result.filter(s => s.vesselId === vesselFilter);
    }

    // Status filter
    if (statusFilter) {
      result = result.filter(s => s.status === statusFilter);
    }

    // Delay filter
    if (delayFilter === 'delayed') {
      result = result.filter(s => s.delayHours > 0);
    } else if (delayFilter === 'on_time') {
      result = result.filter(s => s.delayHours <= 0);
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter(s => {
        const arrivalDate = s.scheduledArrival ? new Date(s.scheduledArrival) : null;
        return arrivalDate && arrivalDate >= new Date(dateFrom);
      });
    }
    if (dateTo) {
      result = result.filter(s => {
        const arrivalDate = s.scheduledArrival ? new Date(s.scheduledArrival) : null;
        return arrivalDate && arrivalDate <= new Date(dateTo + 'T23:59:59');
      });
    }

    return result;
  }, [schedules, searchQuery, vesselFilter, statusFilter, delayFilter, dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vessel Schedules</h1>
          <p className="text-muted-foreground">
            Manage vessel schedules and port calls
          </p>
        </div>
        <Link href="/agency/schedules/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Schedule
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schedules</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSchedules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduledCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arrived/Berthed</CardTitle>
            <Ship className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.arrivedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.delayedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="schedules">All Schedules</TabsTrigger>
            <TabsTrigger value="arrivals">Upcoming Arrivals</TabsTrigger>
          </TabsList>
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
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && activeTab === 'schedules' && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-5">
                {/* Search */}
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Port, voyage, vessel..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Vessel Filter */}
                <div className="space-y-2">
                  <Label>Vessel</Label>
                  <Select value={vesselFilter || '__all__'} onValueChange={(v) => setVesselFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All vessels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All vessels</SelectItem>
                      {vessels.map((vessel) => (
                        <SelectItem key={vessel.id} value={vessel.id}>
                          {vessel.vesselName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All statuses</SelectItem>
                      {SCHEDULE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {SCHEDULE_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Delay Filter */}
                <div className="space-y-2">
                  <Label>Delay Status</Label>
                  <Select value={delayFilter || '__all__'} onValueChange={(v) => setDelayFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                      <SelectItem value="on_time">On Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full"
                    />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Date Presets & Clear */}
              <div className="flex items-center gap-2 mt-4">
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
            </CardContent>
          </Card>
        )}

        {/* All Schedules Tab */}
        <TabsContent value="schedules" className="mt-4">
          {filteredSchedules.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>
                  {schedules.length === 0
                    ? 'No schedules found'
                    : 'No schedules match your filters'}
                </p>
                {schedules.length === 0 && (
                  <Link href="/agency/schedules/new">
                    <Button variant="outline" className="mt-4">
                      Create First Schedule
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredSchedules.length} of {schedules.length} schedules
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredSchedules.map((schedule) => (
                  <ScheduleCard key={schedule.id} schedule={schedule} />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Upcoming Arrivals Tab */}
        <TabsContent value="arrivals" className="mt-4">
          <UpcomingArrivals
            arrivals={upcomingArrivals}
            onRefresh={loadData}
            isLoading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
