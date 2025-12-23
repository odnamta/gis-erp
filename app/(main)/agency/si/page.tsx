import { Suspense } from 'react';
import { SIListClient } from './si-list-client';
import { getShippingInstructions, getSIStats } from '@/app/actions/bl-documentation-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ShippingInstructionsPage() {
  const [sis, stats] = await Promise.all([
    getShippingInstructions({}),
    getSIStats(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SIListClient
        initialSIs={sis}
        initialStats={stats}
      />
    </Suspense>
  );
}
