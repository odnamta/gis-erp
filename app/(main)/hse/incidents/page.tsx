import { Suspense } from 'react';
import { getIncidents } from '@/lib/incident-actions';
import { IncidentsClient } from './incidents-client';

export const dynamic = 'force-dynamic';

export default async function IncidentsPage() {
  const result = await getIncidents();

  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <IncidentsClient incidents={result.data || []} />
    </Suspense>
  );
}
