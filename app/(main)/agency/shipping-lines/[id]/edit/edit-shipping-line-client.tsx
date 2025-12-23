'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ShippingLineForm } from '@/components/agency/shipping-line-form';
import { ShippingLine, ShippingLineFormData } from '@/types/agency';
import { updateShippingLine } from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';

interface EditShippingLineClientProps {
  shippingLine: ShippingLine;
}

export function EditShippingLineClient({ shippingLine }: EditShippingLineClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: ShippingLineFormData) => {
    setIsLoading(true);
    try {
      const result = await updateShippingLine(shippingLine.id, data);
      if (result.success) {
        toast({
          title: 'Success',
          description: 'Shipping line updated successfully',
        });
        router.push(`/agency/shipping-lines/${shippingLine.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update shipping line',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating shipping line:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Convert ShippingLine to ShippingLineFormData
  const formData: ShippingLineFormData = {
    lineCode: shippingLine.lineCode,
    lineName: shippingLine.lineName,
    headOfficeAddress: shippingLine.headOfficeAddress,
    headOfficeCountry: shippingLine.headOfficeCountry,
    website: shippingLine.website,
    bookingPortalUrl: shippingLine.bookingPortalUrl,
    trackingUrl: shippingLine.trackingUrl,
    localAgentName: shippingLine.localAgentName,
    localAgentAddress: shippingLine.localAgentAddress,
    localAgentPhone: shippingLine.localAgentPhone,
    localAgentEmail: shippingLine.localAgentEmail,
    contacts: shippingLine.contacts,
    servicesOffered: shippingLine.servicesOffered,
    routesServed: shippingLine.routesServed,
    paymentTerms: shippingLine.paymentTerms,
    creditLimit: shippingLine.creditLimit,
    creditDays: shippingLine.creditDays,
    serviceRating: shippingLine.serviceRating,
    isPreferred: shippingLine.isPreferred,
    notes: shippingLine.notes,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/agency/shipping-lines/${shippingLine.id}`)}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Details
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Shipping Line</h1>
        <p className="text-muted-foreground">
          Update {shippingLine.lineName} ({shippingLine.lineCode})
        </p>
      </div>

      {/* Form */}
      <ShippingLineForm
        shippingLine={formData}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}
