import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { EditManifestClient } from './edit-manifest-client';
import { getCargoManifest, getBillsOfLading } from '@/app/actions/bl-documentation-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EditManifestPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditManifestPage({ params }: EditManifestPageProps) {
  const { id } = await params;
  
  const manifest = await getCargoManifest(id);

  if (!manifest) {
    notFound();
  }

  // Only draft manifests can be edited
  if (manifest.status !== 'draft') {
    redirect(`/agency/manifests/${id}`);
  }

  // Get all B/Ls that can be linked to a manifest
  const [issuedBLs, releasedBLs, surrenderedBLs] = await Promise.all([
    getBillsOfLading({ status: 'issued' }),
    getBillsOfLading({ status: 'released' }),
    getBillsOfLading({ status: 'surrendered' }),
  ]);

  // Combine all B/Ls that can be linked to manifests
  const availableBLs = [
    ...issuedBLs,
    ...releasedBLs,
    ...surrenderedBLs,
  ];

  // Get linked B/Ls
  const linkedBLs = availableBLs.filter(bl => manifest.blIds.includes(bl.id));

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditManifestClient
        manifest={manifest}
        availableBLs={availableBLs}
        linkedBLs={linkedBLs}
      />
    </Suspense>
  );
}
