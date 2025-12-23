// =====================================================
// v0.65: ALERT DASHBOARD PAGE
// =====================================================

import { Suspense } from 'react';
import { AlertSummaryCards } from '@/components/alerts/alert-summary-cards';
import { ActiveAlertsList } from '@/components/alerts/active-alerts-list';
import { UpcomingReportsList } from '@/components/alerts/upcoming-reports-list';
import { getAlertSummary, getAlertInstances } from '@/lib/alert-actions';
import { getScheduledReports } from '@/lib/scheduled-report-actions';
import { AlertDashboardClient } from './alert-dashboard-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const metadata = {
  title: 'Alert Dashboard | Gama ERP',
  description: 'Monitor alerts and scheduled reports',
};

async function AlertSummarySection() {
  const { data: summary, error } = await getAlertSummary();

  if (error || !summary) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Failed to load alert summary
      </div>
    );
  }

  return <AlertSummaryCards {...summary} />;
}

async function AlertsAndReportsSection() {
  const [alertsResult, reportsResult] = await Promise.all([
    getAlertInstances({ status: 'active', limit: 10 }),
    getScheduledReports({ isActive: true }),
  ]);

  return (
    <AlertDashboardClient
      initialAlerts={alertsResult.data || []}
      initialReports={reportsResult.data || []}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AlertDashboardPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alert Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor alerts and manage scheduled reports
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <AlertSummarySection />
      </Suspense>

      <Suspense fallback={<LoadingSkeleton />}>
        <AlertsAndReportsSection />
      </Suspense>
    </div>
  );
}
