'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Star, TrendingUp, Globe } from 'lucide-react';
import { PortAgentStats } from '@/types/agency';

interface PortAgentSummaryCardsProps {
  stats: PortAgentStats;
}

export function PortAgentSummaryCards({ stats }: PortAgentSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAgents}</div>
          <p className="text-xs text-muted-foreground">Active port agents</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Preferred</CardTitle>
          <Star className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.preferredCount}</div>
          <p className="text-xs text-muted-foreground">Preferred partners</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold flex items-center gap-1">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
            {stats.averageRating > 0 && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
          </div>
          <p className="text-xs text-muted-foreground">Average service rating</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Countries</CardTitle>
          <Globe className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.countriesCount}</div>
          <p className="text-xs text-muted-foreground">Countries covered</p>
        </CardContent>
      </Card>
    </div>
  );
}
