'use client';

// =====================================================
// v0.65: ALERT SUMMARY CARDS COMPONENT
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Info, Bell, CheckCircle2, Activity } from 'lucide-react';

interface AlertSummaryCardsProps {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  activeRulesCount: number;
  resolvedMtdCount: number;
  totalActiveCount: number;
}

export function AlertSummaryCards({
  criticalCount,
  warningCount,
  infoCount,
  activeRulesCount,
  resolvedMtdCount,
  totalActiveCount,
}: AlertSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Critical Alerts */}
      <Card className={criticalCount > 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
          <AlertTriangle className={`h-4 w-4 ${criticalCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-600' : ''}`}>
            {criticalCount}
          </div>
          <p className="text-xs text-muted-foreground">
            Requires immediate attention
          </p>
        </CardContent>
      </Card>

      {/* Warning Alerts */}
      <Card className={warningCount > 0 ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Warning Alerts</CardTitle>
          <AlertCircle className={`h-4 w-4 ${warningCount > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${warningCount > 0 ? 'text-orange-600' : ''}`}>
            {warningCount}
          </div>
          <p className="text-xs text-muted-foreground">
            Review recommended
          </p>
        </CardContent>
      </Card>

      {/* Active Rules */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeRulesCount}</div>
          <p className="text-xs text-muted-foreground">
            Monitoring your KPIs
          </p>
        </CardContent>
      </Card>

      {/* Resolved This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolved MTD</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{resolvedMtdCount}</div>
          <p className="text-xs text-muted-foreground">
            Alerts resolved this month
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
