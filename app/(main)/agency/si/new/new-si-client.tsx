'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SIForm } from '@/components/agency/si-form';
import { createShippingInstruction } from '@/app/actions/bl-documentation-actions';
import { SIFormData, FreightBooking } from '@/types/agency';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface NewSIClientProps {
  bookings: FreightBooking[];
  preselectedBooking?: FreightBooking | null;
}

export function NewSIClient({
  bookings,
  preselectedBooking,
}: NewSIClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: SIFormData) => {
    setIsLoading(true);
    try {
      const result = await createShippingInstruction(data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to create Shipping Instruction');
        return;
      }

      toast.success('Shipping Instruction created successfully');
      router.push(`/agency/si/${result.data.id}`);
    } catch (error) {
      console.error('Error creating SI:', error);
      toast.error('Failed to create Shipping Instruction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async (data: SIFormData) => {
    setIsLoading(true);
    try {
      const result = await createShippingInstruction(data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to save draft');
        return;
      }

      toast.success('Draft saved successfully');
      router.push(`/agency/si/${result.data.id}`);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/agency/si');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/si">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Shipping Instruction</h1>
          <p className="text-muted-foreground">
            Create a new SI from a freight booking
          </p>
        </div>
      </div>

      {/* Form */}
      <SIForm
        booking={preselectedBooking}
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
