import { Suspense } from 'react';
import { NewArrivalNoticeClient } from './new-arrival-notice-client';
import { getBillsOfLading, getBillOfLading } from '@/app/actions/bl-documentation-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface NewArrivalNoticePageProps {
  searchParams: Promise<{ blId?: string }>;
}

export default async function NewArrivalNoticePage({ searchParams }: NewArrivalNoticePageProps) {
  const params = await searchParams;
  const blId = params.blId;

  // Get issued B/Ls that can have arrival notices created
  const [issuedBLs, releasedBLs, surrenderedBLs, preselectedBL] = await Promise.all([
    getBillsOfLading({ status: 'issued' }),
    getBillsOfLading({ status: 'released' }),
    getBillsOfLading({ status: 'surrendered' }),
    blId ? getBillOfLading(blId) : Promise.resolve(null),
  ]);

  // Combine all B/Ls that can have arrival notices
  const allBLs = [
    ...issuedBLs,
    ...releasedBLs,
    ...surrenderedBLs,
  ];

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewArrivalNoticeClient
        billsOfLading={allBLs}
        preselectedBL={preselectedBL}
      />
    </Suspense>
  );
}
