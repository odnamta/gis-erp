'use client';

// =====================================================
// v0.65: ALERT CARD COMPONENT
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  X,
  Eye,
  Clock,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertInstance, AlertSeverity, AlertStatus } from '@/types/alerts';
import { getRelativeTimeString } from '@/lib/alert-utils';

interface AlertCardProps {
  alert: AlertInstance;
  onAcknowledge?: (alertId: string) => Promise<void>;
  onResolve?: (alertId: string, notes?: string) => Promise<void>;
  onDismiss?: (alertId: string) => Promise<void>;
  onViewDetails?: (alertId: string) => void;
}

const severityConfig: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
};

const statusBadgeVariant: Record<AlertStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'destructive',
  acknowledged: 'secondary',
  resolved: 'outline',
  dismissed: 'outline',
};

export function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onDismiss,
  onViewDetails,
}: AlertCardProps) {
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const severity = alert.rule?.severity || 'info';
  const config = severityConfig[severity];
  const Icon = config.icon;

  const handleAcknowledge = async () => {
    if (!onAcknowledge) return;
    setIsLoading(true);
    try {
      await onAcknowledge(alert.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!onResolve) return;
    setIsLoading(true);
    try {
      await onResolve(alert.id, resolutionNotes);
      setIsResolveDialogOpen(false);
      setResolutionNotes('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!onDismiss) return;
    setIsLoading(true);
    try {
      await onDismiss(alert.id);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className={`${config.bgColor} border-l-4 ${severity === 'critical' ? 'border-l-red-500' : severity === 'warning' ? 'border-l-orange-500' : 'border-l-blue-500'}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.color}`} />
              <span className="font-semibold">{alert.rule?.ruleName || 'Alert'}</span>
            </div>
            <Badge variant={statusBadgeVariant[alert.status]}>
              {alert.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-sm text-muted-foreground mb-2">
            {alert.alertMessage}
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {getRelativeTimeString(alert.triggeredAt)}
            </div>
            {alert.acknowledgedByUser && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Acknowledged by {alert.acknowledgedByUser.full_name}
              </div>
            )}
            {alert.currentValue !== undefined && (
              <div>
                Value: <span className="font-medium">{alert.currentValue}</span>
                {alert.thresholdValue !== undefined && (
                  <span> (threshold: {alert.thresholdValue})</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-2 gap-2">
          {alert.status === 'active' && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAcknowledge}
                disabled={isLoading}
              >
                <Eye className="h-4 w-4 mr-1" />
                Acknowledge
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsResolveDialogOpen(true)}
                disabled={isLoading}
              >
                <Check className="h-4 w-4 mr-1" />
                Resolve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            </>
          )}
          {alert.status === 'acknowledged' && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => setIsResolveDialogOpen(true)}
                disabled={isLoading}
              >
                <Check className="h-4 w-4 mr-1" />
                Resolve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" />
                Dismiss
              </Button>
            </>
          )}
          {onViewDetails && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewDetails(alert.id)}
              className="ml-auto"
            >
              View Details
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              Add optional notes about how this alert was resolved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Resolution notes (optional)"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResolveDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={isLoading}>
              {isLoading ? 'Resolving...' : 'Resolve Alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
