'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Pause, Wrench, BarChart3 } from 'lucide-react';
import { UtilizationDashboardStats } from '@/types/utilization';
import { formatUtilizationRate } from '@/lib/utilization-utils';

interface UtilizationSummaryCardsProps {
  stats: UtilizationDashboardStats;
}

export function UtilizationSummaryCards({ stats }: UtilizationSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Utilization Rate</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatUtilizationRate(stats.averageUtilizationRate)}
          </div>
          <p className="text-xs text-muted-foreground">
            Across {stats.totalAssets} assets
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Operating</CardTitle>
          <Activity className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.operatingCount}</div>
          <p className="text-xs text-muted-foreground">
            Assets with ≥50% utilization
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Idle</CardTitle>
          <Pause className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.idleCount}</div>
          <p className="text-xs text-muted-foreground">
            Assets with &lt;25% utilization
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
          <Wrench className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.maintenanceCount}</div>
          <p className="text-xs text-muted-foreground">
            Assets with maintenance days
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
