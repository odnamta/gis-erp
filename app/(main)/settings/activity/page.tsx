import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/permissions-server';
import { ActivityViewerClient } from './activity-viewer-client';

export const metadata = {
  title: 'Activity Viewer | GAMA ERP',
  description: 'View user activity and adoption metrics',
};

export default async function ActivityViewerPage() {
  const profile = await getUserProfile();

  // Only owner, director, sysadmin can access
  if (!profile || !['owner', 'director', 'sysadmin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  // Users will be fetched client-side via the API
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity Viewer</h1>
        <p className="text-muted-foreground">
          Monitor user adoption and activity across the ERP
        </p>
      </div>

      <ActivityViewerClient users={[]} />
    </div>
  );
}
