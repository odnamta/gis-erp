'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VendorForm } from '@/components/vendors/vendor-form';
import { VendorFormData } from '@/types/vendors';
import { createVendor } from '../actions';
import { useToast } from '@/hooks/use-toast';

export default function NewVendorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: VendorFormData) => {
    setIsLoading(true);
    try {
      const result = await createVendor(data);
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else if (result.data) {
        toast({
          title: 'Success',
          description: 'Vendor created successfully',
        });
        router.push(`/vendors/${result.data.id}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Vendor</h1>
          <p className="text-muted-foreground">
            Add a new vendor to your system
          </p>
        </div>
      </div>

      <VendorForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
