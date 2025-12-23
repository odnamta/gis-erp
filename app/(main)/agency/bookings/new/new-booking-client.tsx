'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookingForm } from '@/components/agency/booking-form';
import { createBooking, submitBookingRequest, addContainer } from '@/app/actions/booking-actions';
import { BookingFormData, BookingContainer, ShippingLine, Port } from '@/types/agency';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface NewBookingClientProps {
  shippingLines: ShippingLine[];
  ports: Port[];
  customers: { id: string; name: string }[];
  jobOrders: { id: string; joNumber: string }[];
}

export function NewBookingClient({
  shippingLines,
  ports,
  customers,
  jobOrders,
}: NewBookingClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: BookingFormData, containers: BookingContainer[]) => {
    setIsLoading(true);
    try {
      // Create booking first
      const result = await createBooking(data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to create booking');
        return;
      }

      const bookingId = result.data.id;

      // Add containers
      for (const container of containers) {
        await addContainer(bookingId, {
          containerType: container.containerType,
          containerNumber: container.containerNumber,
          sealNumber: container.sealNumber,
          packagesCount: container.packagesCount,
          packageType: container.packageType,
          grossWeightKg: container.grossWeightKg,
          cargoDescription: container.cargoDescription,
          cargoDimensions: container.cargoDimensions,
        });
      }

      // Submit booking request
      const submitResult = await submitBookingRequest(bookingId);
      
      if (!submitResult.success) {
        toast.warning(`Booking created but not submitted: ${submitResult.error}`);
        router.push(`/agency/bookings/${bookingId}`);
        return;
      }

      toast.success('Booking created and submitted successfully');
      router.push(`/agency/bookings/${bookingId}`);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async (data: BookingFormData, containers: BookingContainer[]) => {
    setIsLoading(true);
    try {
      const result = await createBooking(data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to save draft');
        return;
      }

      const bookingId = result.data.id;

      // Add containers
      for (const container of containers) {
        await addContainer(bookingId, {
          containerType: container.containerType,
          containerNumber: container.containerNumber,
          sealNumber: container.sealNumber,
          packagesCount: container.packagesCount,
          packageType: container.packageType,
          grossWeightKg: container.grossWeightKg,
          cargoDescription: container.cargoDescription,
          cargoDimensions: container.cargoDimensions,
        });
      }

      toast.success('Draft saved successfully');
      router.push(`/agency/bookings/${bookingId}`);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Freight Booking</h1>
          <p className="text-muted-foreground">
            Create a new shipping line booking request
          </p>
        </div>
      </div>

      {/* Form */}
      <BookingForm
        shippingLines={shippingLines}
        ports={ports}
        customers={customers}
        jobOrders={jobOrders.map(jo => ({ id: jo.id, joNumber: jo.joNumber }))}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
