import { notFound } from 'next/navigation';
import { getSchedule, getVessels } from '@/app/actions/vessel-tracking-actions';
import { getPorts } from '@/app/actions/port-actions';
import { EditScheduleClient } from './edit-schedule-client';
import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';

interface EditSchedulePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Edit schedule form page.
 * Allows updating schedule information including times and cutoffs.
 * 
 * **Requirements: 2.1-2.5**
 */
export default async function EditSchedulePage({ params }: EditSchedulePageProps) {

  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(!!profile);
  if (explorerReadOnly) {
    const { redirect } = await import('next/navigation');
    redirect('/agency/schedules');
  }
  const { id } = await params;
  
  const [schedule, vessels, portsResult] = await Promise.all([
    getSchedule(id),
    getVessels({ isActive: true }),
    getPorts(),
  ]);

  if (!schedule) {
    notFound();
  }

  const ports = portsResult.success && portsResult.data ? portsResult.data : [];

  return (
    <EditScheduleClient 
      schedule={schedule} 
      vessels={vessels}
      ports={ports}
    />
  );
}
