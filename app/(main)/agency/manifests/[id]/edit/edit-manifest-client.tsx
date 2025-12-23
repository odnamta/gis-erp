'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ManifestForm } from '@/components/agency/manifest-form';
import { updateCargoManifest, linkBLsToManifest } from '@/app/actions/bl-documentation-actions';
import { ManifestFormData, CargoManifest, BillOfLading } from '@/types/agency';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface EditManifestClientProps {
  manifest: CargoManifest;
  availableBLs: BillOfLading[];
  linkedBLs: BillOfLading[];
}

export function EditManifestClient({
  manifest,
  availableBLs,
  linkedBLs,
}: EditManifestClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Convert manifest to form data
  const initialData: ManifestFormData = {
    manifestType: manifest.manifestType,
    vesselName: manifest.vesselName,
    voyageNumber: manifest.voyageNumber,
    portOfLoading: manifest.portOfLoading,
    portOfDischarge: manifest.portOfDischarge,
    departureDate: manifest.departureDate,
    arrivalDate: manifest.arrivalDate,
    blIds: manifest.blIds,
  };

  const handleSubmit = async (data: ManifestFormData) => {
    setIsLoading(true);
    try {
      // Update manifest details
      const updateResult = await updateCargoManifest(manifest.id, {
        manifestType: data.manifestType,
        vesselName: data.vesselName,
        voyageNumber: data.voyageNumber,
        portOfLoading: data.portOfLoading,
        portOfDischarge: data.portOfDischarge,
        departureDate: data.departureDate,
        arrivalDate: data.arrivalDate,
      });
      
      if (!updateResult.success) {
        toast.error(updateResult.error || 'Failed to update Cargo Manifest');
        return;
      }

      // Update linked B/Ls if changed
      if (data.blIds) {
        const linkResult = await linkBLsToManifest(manifest.id, data.blIds);
        if (!linkResult.success) {
          toast.error(linkResult.error || 'Failed to update linked B/Ls');
          return;
        }
      }

      toast.success('Cargo Manifest updated successfully');
      router.push(`/agency/manifests/${manifest.id}`);
    } catch (error) {
      console.error('Error updating Cargo Manifest:', error);
      toast.error('Failed to update Cargo Manifest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/agency/manifests/${manifest.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/agency/manifests/${manifest.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Cargo Manifest</h1>
          <p className="text-muted-foreground font-mono">
            {manifest.manifestNumber}
          </p>
        </div>
      </div>

      {/* Form */}
      <ManifestForm
        availableBLs={availableBLs}
        initialData={initialData}
        linkedBLs={linkedBLs}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}
