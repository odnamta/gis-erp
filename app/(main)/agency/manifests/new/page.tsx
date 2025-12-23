import { Suspense } from 'react';
import { NewManifestClient } from './new-manifest-client';
import { getBillsOfLading } from '@/app/actions/bl-documentation-actions';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewManifestPage() {
  // Get all B/Ls that can be linked to a manifest
  // Typically issued, released, or surrendered B/Ls
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

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewManifestClient availableBLs={availableBLs} />
    </Suspense>
  );
}
