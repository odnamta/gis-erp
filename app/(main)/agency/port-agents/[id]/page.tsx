import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getPortAgentById } from '@/app/actions/agency-actions';
import { PortAgentDetail } from './port-agent-detail';

interface PortAgentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PortAgentDetailPage({ params }: PortAgentDetailPageProps) {
  const { id } = await params;
  const result = await getPortAgentById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <Suspense fallback={<PortAgentDetailSkeleton />}>
      <PortAgentDetail portAgent={result.data} />
    </Suspense>
  );
}

function PortAgentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-9 w-48 bg-muted animate-pulse rounded" />
          <div className="h-5 w-32 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 h-48" />
        ))}
      </div>
    </div>
  );
}
