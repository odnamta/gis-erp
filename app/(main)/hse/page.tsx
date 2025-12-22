import { Suspense } from 'react';
import { getIncidentDashboardSummary, getIncidents, getIncidentStatistics } from '@/lib/incident-actions';
import { HSEClient } from './hse-client';

export const dynamic = 'force-dynamic';

export default async function HSEPage() {
  const [summaryResult, incidentsResult, statsResult] = await Promise.all([
    getIncidentDashboardSummary(),
    getIncidents({ status: ['reported', 'under_investigation', 'pending_actions'] }),
    getIncidentStatistics(),
  ]);

  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <HSEClient
        summary={summaryResult.data}
        recentIncidents={incidentsResult.data || []}
        statistics={statsResult.data}
      />
    </Suspense>
  );
}
