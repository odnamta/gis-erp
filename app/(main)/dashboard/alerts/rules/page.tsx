// =====================================================
// v0.65: ALERT RULES MANAGEMENT PAGE
// =====================================================

import { Suspense } from 'react';
import { getAlertRules } from '@/lib/alert-actions';
import { AlertRulesClient } from './alert-rules-client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Alert Rules | Gama ERP',
  description: 'Manage alert rules and thresholds',
};

async function AlertRulesSection() {
  const { data: rules, error } = await getAlertRules();

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load alert rules: {error}
      </div>
    );
  }

  return <AlertRulesClient initialRules={rules || []} />;
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

export default function AlertRulesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alert Rules</h1>
        <p className="text-muted-foreground">
          Configure rules to monitor KPIs and trigger alerts
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <AlertRulesSection />
      </Suspense>
    </div>
  );
}
