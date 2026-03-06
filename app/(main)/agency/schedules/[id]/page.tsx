import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getSchedule, getVessel } from '@/app/actions/vessel-tracking-actions';
import { ScheduleDetail } from './schedule-detail';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

interface ScheduleDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Schedule detail page.
 * Shows schedule information including times, cutoffs, and delay status.
 * 
 * **Requirements: 2.1-2.8**
 */
export default async function ScheduleDetailPage({ params }: ScheduleDetailPageProps) {

  const profile = await getCurrentUserProfile();
  await guardPage(!!profile);
  const { id } = await params;
  
  const schedule = await getSchedule(id);

  if (!schedule) {
    notFound();
  }

  // Get full vessel details if available
  let vessel = schedule.vessel;
  if (schedule.vesselId && !vessel) {
    vessel = await getVessel(schedule.vesselId) || undefined;
  }

  return (
    <Suspense fallback={<ScheduleDetailSkeleton />}>
      <ScheduleDetail schedule={schedule} vessel={vessel} />
    </Suspense>
  );
}

function ScheduleDetailSkeleton() {
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
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6 h-48" />
        ))}
      </div>
    </div>
  );
}
