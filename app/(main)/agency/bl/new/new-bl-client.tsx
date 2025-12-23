'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BLForm } from '@/components/agency/bl-form';
import { createBillOfLading } from '@/app/actions/bl-documentation-actions';
import { BLFormData, FreightBooking, ShippingLine } from '@/types/agency';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface NewBLClientProps {
  shippingLines: ShippingLine[];
  bookings: FreightBooking[];
  preselectedBooking?: FreightBooking | null;
}

export function NewBLClient({
  shippingLines,
  bookings,
  preselectedBooking,
}: NewBLClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: BLFormData) => {
    setIsLoading(true);
    try {
      const result = await createBillOfLading(data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to create Bill of Lading');
        return;
      }

      toast.success('Bill of Lading created successfully');
      router.push(`/agency/bl/${result.data.id}`);
    } catch (error) {
      console.error('Error creating B/L:', error);
      toast.error('Failed to create Bill of Lading');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async (data: BLFormData) => {
    setIsLoading(true);
    try {
      const result = await createBillOfLading(data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to save draft');
        return;
      }

      toast.success('Draft saved successfully');
      router.push(`/agency/bl/${result.data.id}`);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/agency/bl');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/bl">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Bill of Lading</h1>
          <p className="text-muted-foreground">
            Create a new B/L from a freight booking
          </p>
        </div>
      </div>

      {/* Form */}
      <BLForm
        booking={preselectedBooking}
        shippingLines={shippingLines}
        bookings={bookings}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
