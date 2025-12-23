'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ShippingLineForm } from '@/components/agency/shipping-line-form';
import { ShippingLineFormData } from '@/types/agency';
import { createShippingLine } from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';

export default function NewShippingLinePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: ShippingLineFormData) => {
    setIsLoading(true);
    try {
      const result = await createShippingLine(data);
      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: 'Shipping line created successfully',
        });
        router.push(`/agency/shipping-lines/${result.data.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create shipping line',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating shipping line:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/agency/shipping-lines')}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shipping Lines
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add Shipping Line</h1>
        <p className="text-muted-foreground">
          Create a new shipping line partner record
        </p>
      </div>

      {/* Form */}
      <ShippingLineForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
