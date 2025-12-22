'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, Calculator, Gauge } from 'lucide-react';
import { CostingDashboardStats } from '@/types/depreciation';
import { formatIDR } from '@/lib/pjo-utils';

interface CostingSummaryCardsProps {
  stats: CostingDashboardStats;
}

export function CostingSummaryCards({ stats }: CostingSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Fleet Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatIDR(stats.totalFleetValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            Current book value of {stats.assetCount} assets
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Accumulated Depreciation</CardTitle>
          <TrendingDown className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatIDR(stats.totalAccumulatedDepreciation)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total depreciation recorded
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total TCO</CardTitle>
          <Calculator className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatIDR(stats.totalTCO)}
          </div>
          <p className="text-xs text-muted-foreground">
            Total Cost of Ownership
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Cost/Km</CardTitle>
          <Gauge className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatIDR(stats.averageCostPerKm)}
          </div>
          <p className="text-xs text-muted-foreground">
            Fleet average cost per kilometer
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
