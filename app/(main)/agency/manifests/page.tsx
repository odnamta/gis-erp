import { Suspense } from 'react';
import { ManifestsListClient } from './manifests-list-client';
import { getCargoManifests } from '@/app/actions/bl-documentation-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ManifestsPage() {
  // Fetch all manifests
  const manifests = await getCargoManifests({});

  // Calculate stats from all manifests
  const stats = {
    total: manifests.length,
    draft: manifests.filter(m => m.status === 'draft').length,
    submitted: manifests.filter(m => m.status === 'submitted').length,
    approved: manifests.filter(m => m.status === 'approved').length,
    inward: manifests.filter(m => m.manifestType === 'inward').length,
    outward: manifests.filter(m => m.manifestType === 'outward').length,
  };

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ManifestsListClient
        initialManifests={manifests}
        initialStats={stats}
      />
    </Suspense>
  );
}
