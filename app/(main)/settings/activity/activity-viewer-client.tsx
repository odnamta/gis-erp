'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActivityTimeline } from '@/components/activity/activity-timeline';
import { ActivityChart } from '@/components/activity/activity-chart';
import type { UserActivityLog, ActivityFilters, DailyActivityCount, ActionType } from '@/types/activity';
import { getDateRangeFilter } from '@/lib/user-activity-utils';
import { Users, Activity, BarChart3 } from 'lucide-react';

interface ActivityViewerClientProps {
  users: { user_id: string; user_email: string | null }[];
}

export function ActivityViewerClient({ users: initialUsers }: ActivityViewerClientProps) {
  const [filters, setFilters] = useState<ActivityFilters>({
    dateRange: 'last_7_days',
  });
  const [activities, setActivities] = useState<UserActivityLog[]>([]);
  const [chartData, setChartData] = useState<DailyActivityCount[]>([]);
  const [dailyActiveUsers, setDailyActiveUsers] = useState(0);
  const [users, setUsers] = useState(initialUsers);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRangeFilter(filters.dateRange);
      
      // Build query params
      const params = new URLSearchParams();
      params.set('start', start.toISOString());
      params.set('end', end.toISOString());
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.actionType && filters.actionType !== 'all') {
        params.set('actionType', filters.actionType);
      }

      const response = await fetch(`/api/activity/query?${params.toString()}`);
      const data = await response.json();

      if (data.error) {
        console.error('Error fetching activities:', data.error);
        return;
      }

      setActivities(data.activities || []);
      setChartData(data.chartData || []);
      setDailyActiveUsers(data.dailyActiveUsers || 0);
      
      // Update users list from response if available
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const actionTypes: (ActionType | 'all')[] = [
    'all',
    'page_view',
    'create',
    'update',
    'delete',
    'approve',
    'reject',
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <label className="text-sm font-medium mb-1 block">User</label>
              <Select
                value={filters.userId || 'all'}
                onValueChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    userId: value === 'all' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.user_email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-1 block">Action Type</label>
              <Select
                value={filters.actionType || 'all'}
                onValueChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    actionType: value as ActionType | 'all',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === 'all' ? 'All Actions' : type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium mb-1 block">Date Range</label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    dateRange: value as ActivityFilters['dateRange'],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Active Users</p>
                <p className="text-2xl font-bold">{dailyActiveUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold">{activities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Daily Actions</p>
                <p className="text-2xl font-bold">
                  {chartData.length > 0
                    ? Math.round(
                        chartData.reduce((sum, d) => sum + d.count, 0) / chartData.length
                      )
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <ActivityChart data={chartData} />
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <ActivityTimeline activities={activities.slice(0, 50)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
