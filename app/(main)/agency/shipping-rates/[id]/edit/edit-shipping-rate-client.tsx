'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ShippingLine, Port, ShippingRate, ShippingRateFormData } from '@/types/agency';
import { 
  getShippingLines, 
  getPorts, 
  getShippingRateById, 
  updateShippingRate 
} from '@/app/actions/agency-actions';
import { ShippingRateForm } from '@/components/agency/shipping-rate-form';
import { useToast } from '@/hooks/use-toast';

interface EditShippingRateClientProps {
  id: string;
}

export function EditShippingRateClient({ id }: EditShippingRateClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [shippingRate, setShippingRate] = useState<ShippingRate | null>(null);
  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rateResult, linesResult, portsResult] = await Promise.all([
        getShippingRateById(id),
        getShippingLines(),
        getPorts(),
      ]);

      if (rateResult.success && rateResult.data) {
        setShippingRate(rateResult.data);
      } else {
        toast({
          title: 'Error',
          description: 'Shipping rate not found',
          variant: 'destructive',
        });
        router.push('/agency/shipping-rates/manage');
        return;
      }

      if (linesResult.success && linesResult.data) {
        setShippingLines(linesResult.data);
      }
      if (portsResult.success && portsResult.data) {
        setPorts(portsResult.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (data: ShippingRateFormData) => {
    setSubmitting(true);
    try {
      const result = await updateShippingRate(id, data);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Shipping rate updated successfully',
        });
        router.push('/agency/shipping-rates/manage');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update shipping rate',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to update shipping rate:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shipping rate',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!shippingRate) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Shipping rate not found
      </div>
    );
  }

  // Convert ShippingRate to ShippingRateFormData
  const formData: ShippingRateFormData = {
    shippingLineId: shippingRate.shippingLineId,
    originPortId: shippingRate.originPortId,
    destinationPortId: shippingRate.destinationPortId,
    containerType: shippingRate.containerType,
    oceanFreight: shippingRate.oceanFreight,
    currency: shippingRate.currency,
    baf: shippingRate.baf,
    caf: shippingRate.caf,
    pss: shippingRate.pss,
    ens: shippingRate.ens,
    otherSurcharges: shippingRate.otherSurcharges,
    transitDays: shippingRate.transitDays,
    frequency: shippingRate.frequency,
    validFrom: shippingRate.validFrom,
    validTo: shippingRate.validTo,
    terms: shippingRate.terms,
    notes: shippingRate.notes,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/agency/shipping-rates/manage')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Rates
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Shipping Rate</h1>
        <p className="text-muted-foreground">
          Update shipping rate for {shippingRate.shippingLine?.lineName || 'Unknown'} - {shippingRate.containerType}
        </p>
      </div>

      {/* Form */}
      <ShippingRateForm
        shippingRate={formData}
        shippingLines={shippingLines}
        ports={ports}
        onSubmit={handleSubmit}
        isLoading={submitting}
        mode="edit"
      />
    </div>
  );
}
