'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EquipmentForm } from '@/components/vendors/equipment-form';
import { EquipmentFormData } from '@/types/vendors';
import { createEquipment } from '../../../equipment-actions';
import { useToast } from '@/hooks/use-toast';

export default function NewEquipmentPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const vendorId = params.id as string;

  const handleSubmit = async (data: EquipmentFormData) => {
    setIsLoading(true);
    try {
      const result = await createEquipment(vendorId, data);
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Equipment added successfully',
        });
        router.push(`/vendors/${vendorId}`);
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
          <h1 className="text-3xl font-bold tracking-tight">Add Equipment</h1>
          <p className="text-muted-foreground">
            Register new equipment for this vendor
          </p>
        </div>
      </div>

      <EquipmentForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
