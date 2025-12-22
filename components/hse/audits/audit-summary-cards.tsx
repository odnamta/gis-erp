'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Search, AlertTriangle, TrendingUp } from 'lucide-react';
import { AuditDashboardMetrics } from '@/types/audit';

interface AuditSummaryCardsProps {
  metrics: AuditDashboardMetrics;
}

export function AuditSummaryCards({ metrics }: AuditSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.dueSoonCount}</div>
          <p className="text-xs text-muted-foreground">
            {metrics.overdueAuditsCount > 0 && (
              <span className="text-red-600">
                {metrics.overdueAuditsCount} overdue
              </span>
            )}
            {metrics.overdueAuditsCount === 0 && 'Within next 7 days'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Findings</CardTitle>
          <Search className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.openFindingsCount}</div>
          <p className="text-xs text-muted-foreground">
            Requiring corrective action
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Findings</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.criticalFindingsCount > 0 ? 'text-red-600' : ''}`}>
            {metrics.criticalFindingsCount}
          </div>
          <p className="text-xs text-muted-foreground">
            Immediate attention required
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Score (MTD)</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            metrics.averageScoreMTD >= 80 ? 'text-green-600' :
            metrics.averageScoreMTD >= 60 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {metrics.averageScoreMTD > 0 ? `${metrics.averageScoreMTD.toFixed(0)}%` : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            Month to date average
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
