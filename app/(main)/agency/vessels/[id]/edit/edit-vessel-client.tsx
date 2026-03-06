'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { VesselForm } from '@/components/vessel-tracking/vessel-form';
import { Vessel, VesselFormData, ShippingLine } from '@/types/agency';
import { updateVessel } from '@/app/actions/vessel-tracking-actions';
import { useToast } from '@/hooks/use-toast';

interface EditVesselClientProps {
  vessel: Vessel;
  shippingLines: ShippingLine[];
}

/**
 * Edit vessel form page client component.
 * Allows updating vessel information with validation for IMO and MMSI formats.
 * 
 * **Requirements: 1.1-1.5**
 */
export function EditVesselClient({ vessel, shippingLines }: EditVesselClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: VesselFormData) => {
    setIsLoading(true);
    try {
      const result = await updateVessel(vessel.id, data);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Vessel updated successfully',
        });
        router.push(`/agency/vessels/${vessel.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update vessel',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/agency/vessels/${vessel.id}`);
  };

  // Convert Vessel to VesselFormData
  const formData: VesselFormData = {
    vesselName: vessel.vesselName,
    imoNumber: vessel.imoNumber,
    mmsi: vessel.mmsi,
    vesselType: vessel.vesselType,
    flag: vessel.flag,
    callSign: vessel.callSign,
    lengthM: vessel.lengthM,
    beamM: vessel.beamM,
    draftM: vessel.draftM,
    grossTonnage: vessel.grossTonnage,
    deadweightTons: vessel.deadweightTons,
    teuCapacity: vessel.teuCapacity,
    owner: vessel.owner,
    operator: vessel.operator,
    shippingLineId: vessel.shippingLineId,
    currentStatus: vessel.currentStatus,
    lastPort: vessel.lastPort,
    nextPort: vessel.nextPort,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/agency/vessels/${vessel.id}`)}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Details
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Vessel</h1>
        <p className="text-muted-foreground">
          Update {vessel.vesselName}
          {vessel.imoNumber && ` (IMO: ${vessel.imoNumber})`}
        </p>
      </div>

      {/* Form */}
      <VesselForm
        initialData={formData}
        shippingLines={shippingLines}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}
