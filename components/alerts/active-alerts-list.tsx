'use client';

// =====================================================
// v0.65: ACTIVE ALERTS LIST COMPONENT
// =====================================================

import { AlertInstance } from '@/types/alerts';
import { AlertCard } from './alert-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle } from 'lucide-react';

interface ActiveAlertsListProps {
  alerts: AlertInstance[];
  onAcknowledge?: (alertId: string) => Promise<void>;
  onResolve?: (alertId: string, notes?: string) => Promise<void>;
  onDismiss?: (alertId: string) => Promise<void>;
  onViewDetails?: (alertId: string) => void;
  title?: string;
  emptyMessage?: string;
  maxItems?: number;
}

export function ActiveAlertsList({
  alerts,
  onAcknowledge,
  onResolve,
  onDismiss,
  onViewDetails,
  title = 'Active Alerts',
  emptyMessage = 'No active alerts',
  maxItems,
}: ActiveAlertsListProps) {
  const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;
  const hasMore = maxItems && alerts.length > maxItems;

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-muted-foreground">{emptyMessage}</p>
            <p className="text-sm text-muted-foreground mt-1">
              All systems operating normally
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {title}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onAcknowledge={onAcknowledge}
            onResolve={onResolve}
            onDismiss={onDismiss}
            onViewDetails={onViewDetails}
          />
        ))}
        {hasMore && (
          <p className="text-center text-sm text-muted-foreground pt-2">
            +{alerts.length - maxItems} more alerts
          </p>
        )}
      </CardContent>
    </Card>
  );
}
