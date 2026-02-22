import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getIncident, getIncidentHistory } from '@/lib/incident-actions';
import { IncidentDetailClient } from './incident-detail-client';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function IncidentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [incidentResult, historyResult, employeesResult] = await Promise.all([
    getIncident(id),
    getIncidentHistory(id),
    supabase.from('employees').select('id, full_name').eq('status', 'active').order('full_name'),
  ]);

  if (!incidentResult.success || !incidentResult.data) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <IncidentDetailClient
        incident={incidentResult.data}
        history={historyResult.data || []}
        employees={employeesResult.data || []}
      />
    </Suspense>
  );
}
