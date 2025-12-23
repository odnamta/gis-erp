import { Suspense } from 'react';
import { BLListClient } from './bl-list-client';
import { getBillsOfLading, getBLStats } from '@/app/actions/bl-documentation-actions';
import { getShippingLines } from '@/app/actions/agency-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function BillsOfLadingPage() {
  const [bls, stats, shippingLinesResult] = await Promise.all([
    getBillsOfLading({}),
    getBLStats(),
    getShippingLines(),
  ]);

  // Extract shipping lines from result
  const shippingLines = shippingLinesResult.success ? shippingLinesResult.data || [] : [];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BLListClient
        initialBLs={bls}
        initialStats={stats}
        shippingLines={shippingLines}
      />
    </Suspense>
  );
}
