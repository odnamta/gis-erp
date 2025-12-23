import { Suspense } from 'react';
import { ArrivalsListClient } from './arrivals-list-client';
import { getPendingArrivals, getArrivalNotices } from '@/app/actions/bl-documentation-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ArrivalsPage() {
  // Fetch both pending arrivals (for priority display) and all arrivals
  const [pendingArrivals, allArrivals] = await Promise.all([
    getPendingArrivals(),
    getArrivalNotices({}),
  ]);

  // Calculate stats from all arrivals
  const stats = {
    total: allArrivals.length,
    pending: allArrivals.filter(a => a.status === 'pending').length,
    notified: allArrivals.filter(a => a.status === 'notified').length,
    cleared: allArrivals.filter(a => a.status === 'cleared').length,
    delivered: allArrivals.filter(a => a.status === 'delivered').length,
  };

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ArrivalsListClient
        initialArrivals={allArrivals}
        pendingArrivals={pendingArrivals}
        initialStats={stats}
      />
    </Suspense>
  );
}
