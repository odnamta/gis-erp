import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { EditArrivalNoticeClient } from './edit-arrival-notice-client';
import { getArrivalNotice } from '@/app/actions/arrival-notice-actions';
import { getBillsOfLading } from '@/app/actions/bl-actions';
import { Loader2 } from 'lucide-react';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

interface EditArrivalNoticePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditArrivalNoticePage({ params }: EditArrivalNoticePageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/agency/arrivals');
  }
  const { id } = await params;
  
  const [notice, issuedBLs, releasedBLs, surrenderedBLs] = await Promise.all([
    getArrivalNotice(id),
    getBillsOfLading({ status: 'issued' }),
    getBillsOfLading({ status: 'released' }),
    getBillsOfLading({ status: 'surrendered' }),
  ]);

  if (!notice) {
    notFound();
  }

  // Only allow editing of pending notices
  if (notice.status !== 'pending') {
    notFound();
  }

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
      <EditArrivalNoticeClient
        notice={notice}
        billsOfLading={allBLs}
      />
    </Suspense>
  );
}
