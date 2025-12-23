'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Star, TrendingUp, Layers } from 'lucide-react';

interface ServiceProviderStats {
  totalProviders: number;
  preferredCount: number;
  averageRating: number;
  typesCount: number;
}

interface ServiceProviderSummaryCardsProps {
  stats: ServiceProviderStats;
}

export function ServiceProviderSummaryCards({ stats }: ServiceProviderSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProviders}</div>
          <p className="text-xs text-muted-foreground">
            Active service providers
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Preferred</CardTitle>
          <Star className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.preferredCount}</div>
          <p className="text-xs text-muted-foreground">
            Preferred partners
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
          </div>
          <p className="text-xs text-muted-foreground">
            Average service rating
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Service Types</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.typesCount}</div>
          <p className="text-xs text-muted-foreground">
            Different provider types
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
