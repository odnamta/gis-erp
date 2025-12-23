'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ServiceProviderForm } from '@/components/agency/service-provider-form';
import { ServiceProviderFormData } from '@/types/agency';
import { createServiceProvider } from '@/app/actions/agency-actions';
import { useToast } from '@/hooks/use-toast';

export default function NewServiceProviderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: ServiceProviderFormData) => {
    setIsLoading(true);
    try {
      const result = await createServiceProvider(data);
      if (result.success && result.data) {
        toast({
          title: 'Success',
          description: 'Service provider created successfully',
        });
        router.push(`/agency/service-providers/${result.data.id}`);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create service provider',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating service provider:', error);
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
          onClick={() => router.push('/agency/service-providers')}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Service Providers
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Add Service Provider</h1>
        <p className="text-muted-foreground">
          Create a new service provider record
        </p>
      </div>

      {/* Form */}
      <ServiceProviderForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
