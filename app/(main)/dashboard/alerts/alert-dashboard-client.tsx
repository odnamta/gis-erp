'use client';

// =====================================================
// v0.65: ALERT DASHBOARD CLIENT COMPONENT
// =====================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertInstance } from '@/types/alerts';
import { ScheduledReport } from '@/types/scheduled-reports';
import { ActiveAlertsList } from '@/components/alerts/active-alerts-list';
import { UpcomingReportsList } from '@/components/alerts/upcoming-reports-list';
import { acknowledgeAlert, resolveAlert, dismissAlert } from '@/lib/alert-actions';
import { useToast } from '@/hooks/use-toast';

interface AlertDashboardClientProps {
  initialAlerts: AlertInstance[];
  initialReports: ScheduledReport[];
}

export function AlertDashboardClient({
  initialAlerts,
  initialReports,
}: AlertDashboardClientProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const handleAcknowledge = async (alertId: string) => {
    // Get current user ID - in real app, get from auth context
    const userId = 'current-user-id'; // TODO: Get from auth
    
    const { data, error } = await acknowledgeAlert(alertId, userId);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      setAlerts(prev => prev.map(a => a.id === alertId ? data : a));
      toast({
        title: 'Alert Acknowledged',
        description: 'The alert has been acknowledged.',
      });
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const handleResolve = async (alertId: string, notes?: string) => {
    const { data, error } = await resolveAlert(alertId, notes);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast({
        title: 'Alert Resolved',
        description: 'The alert has been resolved.',
      });
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const handleDismiss = async (alertId: string) => {
    const { data, error } = await dismissAlert(alertId);
    
    if (error) {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    if (data) {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast({
        title: 'Alert Dismissed',
        description: 'The alert has been dismissed.',
      });
    }

    startTransition(() => {
      router.refresh();
    });
  };

  const handleViewAlertDetails = (alertId: string) => {
    router.push(`/dashboard/alerts/${alertId}`);
  };

  const handleRunReportNow = async (reportId: string) => {
    // TODO: Implement run report now functionality
    toast({
      title: 'Running Report',
      description: 'The report is being generated...',
    });
  };

  const handleViewReportDetails = (reportId: string) => {
    router.push(`/dashboard/reports/scheduled/${reportId}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ActiveAlertsList
        alerts={alerts}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
        onDismiss={handleDismiss}
        onViewDetails={handleViewAlertDetails}
        maxItems={5}
      />
      <UpcomingReportsList
        reports={initialReports}
        onRunNow={handleRunReportNow}
        onViewDetails={handleViewReportDetails}
        maxItems={5}
      />
    </div>
  );
}
