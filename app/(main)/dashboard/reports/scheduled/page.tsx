// =====================================================
// v0.65: SCHEDULED REPORTS PAGE
// =====================================================

import { Suspense } from 'react';
import { getScheduledReports } from '@/lib/scheduled-report-actions';
import { ScheduledReportsClient } from './scheduled-reports-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Scheduled Reports | Gama ERP',
  description: 'Manage automated report generation and delivery',
};

async function ScheduledReportsSection() {
  const { data: reports, error } = await getScheduledReports();

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load scheduled reports: {error}
      </div>
    );
  }

  return <ScheduledReportsClient initialReports={reports || []} />;
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScheduledReportsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scheduled Reports</h1>
        <p className="text-muted-foreground">
          Configure automated report generation and delivery
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <ScheduledReportsSection />
      </Suspense>
    </div>
  );
}
