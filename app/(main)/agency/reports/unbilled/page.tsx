import { Suspense } from 'react';
import { UnbilledRevenueClient } from './unbilled-client';
import { getUnbilledRevenue } from '@/app/actions/profitability-actions';
import { getCustomersForSelection } from '@/lib/jmp-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UnbilledRevenuePage() {
  // Fetch initial data in parallel
  const [unbilledResult, customers] = await Promise.all([
    getUnbilledRevenue(),
    getCustomersForSelection(),
  ]);

  const unbilledRevenue = unbilledResult.success ? unbilledResult.data || [] : [];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <UnbilledRevenueClient
        initialUnbilledRevenue={unbilledRevenue}
        customers={customers}
      />
    </Suspense>
  );
}
