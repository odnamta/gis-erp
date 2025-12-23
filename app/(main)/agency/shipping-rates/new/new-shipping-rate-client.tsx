'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ShippingLine, Port, ShippingRateFormData } from '@/types/agency';
import { getShippingLines, getPorts, createShippingRate } from '@/app/actions/agency-actions';
import { ShippingRateForm } from '@/components/agency/shipping-rate-form';
import { useToast } from '@/hooks/use-toast';

export function NewShippingRateClient() {
  const router = useRouter();
  const { toast } = useToast();

  const [shippingLines, setShippingLines] = useState<ShippingLine[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [linesResult, portsResult] = await Promise.all([
        getShippingLines(),
        getPorts(),
      ]);

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
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (data: ShippingRateFormData) => {
    setSubmitting(true);
    try {
      const result = await createShippingRate(data);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Shipping rate created successfully',
        });
        router.push('/agency/shipping-rates/manage');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create shipping rate',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to create shipping rate:', error);
      toast({
        title: 'Error',
        description: 'Failed to create shipping rate',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/agency/shipping-rates/manage')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Rates
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">New Shipping Rate</h1>
        <p className="text-muted-foreground">
          Create a new shipping rate for a route
        </p>
      </div>

      {/* Form */}
      <ShippingRateForm
        shippingLines={shippingLines}
        ports={ports}
        onSubmit={handleSubmit}
        isLoading={submitting}
        mode="create"
      />
    </div>
  );
}
