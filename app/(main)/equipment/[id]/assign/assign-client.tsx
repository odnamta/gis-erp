'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AssignmentForm } from '@/components/utilization/assignment-form';
import { Asset } from '@/types/assets';
import { getAvailabilityStatusLabel, getAvailabilityBadgeVariant } from '@/lib/utilization-utils';
import type { AvailabilityStatus } from '@/types/utilization';

interface JobOrder {
  id: string;
  jo_number: string;
  customer_name?: string;
}

interface AssignClientProps {
  asset: Asset;
  availabilityStatus: AvailabilityStatus;
  jobOrders: JobOrder[];
}

export function AssignClient({ asset, availabilityStatus, jobOrders }: AssignClientProps) {
  const router = useRouter();

  function handleSuccess() {
    router.push(`/equipment/${asset.id}`);
    router.refresh();
  }

  function handleCancel() {
    router.back();
  }

  const canAssign = availabilityStatus === 'available';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assign Asset</h1>
        <p className="text-muted-foreground">
          Assign this asset to a job order or other target
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {asset.asset_code} • {asset.asset_name}
            </CardTitle>
            <Badge variant={getAvailabilityBadgeVariant(availabilityStatus)}>
              {getAvailabilityStatusLabel(availabilityStatus)}
            </Badge>
          </div>
          {asset.registration_number && (
            <p className="text-sm text-muted-foreground">{asset.registration_number}</p>
          )}
        </CardHeader>
        <CardContent>
          {canAssign ? (
            <AssignmentForm
              assetId={asset.id}
              assetCode={asset.asset_code}
              assetName={asset.asset_name}
              currentOdometer={asset.current_units}
              jobOrders={jobOrders}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                This asset is not available for assignment.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {availabilityStatus === 'assigned'
                  ? 'The asset is currently assigned to another job.'
                  : 'The asset status must be "active" to be assigned.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
