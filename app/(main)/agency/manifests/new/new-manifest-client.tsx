'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ManifestForm } from '@/components/agency/manifest-form';
import { createCargoManifest } from '@/app/actions/bl-documentation-actions';
import { ManifestFormData, BillOfLading } from '@/types/agency';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface NewManifestClientProps {
  availableBLs: BillOfLading[];
}

export function NewManifestClient({ availableBLs }: NewManifestClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: ManifestFormData) => {
    setIsLoading(true);
    try {
      const result = await createCargoManifest(data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to create Cargo Manifest');
        return;
      }

      toast.success('Cargo Manifest created successfully');
      router.push(`/agency/manifests/${result.data.id}`);
    } catch (error) {
      console.error('Error creating Cargo Manifest:', error);
      toast.error('Failed to create Cargo Manifest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async (data: ManifestFormData) => {
    setIsLoading(true);
    try {
      const result = await createCargoManifest(data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to save draft');
        return;
      }

      toast.success('Draft saved successfully');
      router.push(`/agency/manifests/${result.data.id}`);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/agency/manifests');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/manifests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Cargo Manifest</h1>
          <p className="text-muted-foreground">
            Create a cargo manifest and link Bills of Lading
          </p>
        </div>
      </div>

      {/* Form */}
      <ManifestForm
        availableBLs={availableBLs}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
