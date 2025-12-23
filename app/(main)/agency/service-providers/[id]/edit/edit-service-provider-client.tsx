'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ServiceProvider, ServiceProviderFormData } from '@/types/agency';
import { ServiceProviderForm } from '@/components/agency/service-provider-form';
import { updateServiceProvider } from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';

interface EditServiceProviderClientProps {
  serviceProvider: ServiceProvider;
}

export function EditServiceProviderClient({ serviceProvider }: EditServiceProviderClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: ServiceProviderFormData) => {
    setIsLoading(true);
    try {
      const result = await updateServiceProvider(serviceProvider.id, data);
      if (result.success) {
        toast({ title: 'Success', description: 'Service provider updated successfully' });
        router.push(`/agency/service-providers/${serviceProvider.id}`);
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update service provider', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const formData: ServiceProviderFormData = {
    providerCode: serviceProvider.providerCode,
    providerName: serviceProvider.providerName,
    providerType: serviceProvider.providerType,
    city: serviceProvider.city,
    province: serviceProvider.province,
    country: serviceProvider.country,
    address: serviceProvider.address,
    phone: serviceProvider.phone,
    email: serviceProvider.email,
    contacts: serviceProvider.contacts,
    servicesDetail: serviceProvider.servicesDetail,
    coverageAreas: serviceProvider.coverageAreas,
    paymentTerms: serviceProvider.paymentTerms,
    npwp: serviceProvider.npwp,
    siup: serviceProvider.siup,
    documents: serviceProvider.documents,
    serviceRating: serviceProvider.serviceRating,
    isPreferred: serviceProvider.isPreferred,
    notes: serviceProvider.notes,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/agency/service-providers/${serviceProvider.id}`)} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Details
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Service Provider</h1>
        <p className="text-muted-foreground">Update {serviceProvider.providerName}</p>
      </div>

      <ServiceProviderForm
        serviceProvider={formData}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}
