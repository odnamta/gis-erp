import { getCurrentUserProfile, guardPage } from '@/lib/auth-utils';
import { canAccessFeature } from '@/lib/permissions';
import { ExplorerReadOnlyBanner } from '@/components/layout/explorer-read-only-banner';
import { RecordsClient } from './records-client';

export const dynamic = 'force-dynamic';

export default async function TrainingRecordsPage() {
  const profile = await getCurrentUserProfile();
  const { explorerReadOnly } = await guardPage(
    canAccessFeature(profile, 'hse.training.view')
  );

  return (
    <>
      {explorerReadOnly && <ExplorerReadOnlyBanner />}
      <RecordsClient readOnly={explorerReadOnly} />
    </>
  );
}
