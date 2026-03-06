'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { VesselForm } from '@/components/vessel-tracking/vessel-form';
import { VesselFormData, ShippingLine } from '@/types/agency';
import { createVessel } from '@/app/actions/vessel-tracking-actions';
import { getShippingLines } from '@/app/actions/shipping-line-actions';
import { useToast } from '@/hooks/use-toast';

/**
 * New vessel form page.
 * Allows creating a new vessel with validation for IMO and MMSI formats.
 * 
 * **Requirements: 1.1-1.5**
 */
export default function NewVesselPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([]);
  const [loadingShippingLines, setLoadingShippingLines] = useState(true);

  useEffect(() => {
    if (document.cookie.includes('gama-explorer-mode=true')) {
      router.replace('/agency/vessels');
    }
  }, [router]);

  useEffect(() => {
    async function loadShippingLines() {
      try {
        const result = await getShippingLines();
        if (result.success && result.data) {
          setShippingLines(result.data);
        }
      } catch {
      } finally {
        setLoadingShippingLines(false);
      }
    }
    loadShippingLines();
  }, []);

  const handleSubmit = async (data: VesselFormData) => {
    setIsLoading(true);
    try {
      const result = await createVessel(data);
      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: 'Vessel created successfully',
        });
        router.push(`/agency/vessels/${result.data.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create vessel',
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
    router.push('/agency/vessels');
  };

  if (loadingShippingLines) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/agency/vessels')}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Vessels
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add Vessel</h1>
        <p className="text-muted-foreground">
          Create a new vessel record in the database
        </p>
      </div>

      {/* Form */}
      <VesselForm
        shippingLines={shippingLines}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
