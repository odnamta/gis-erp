'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookingForm } from '@/components/agency/booking-form';
import {
  updateBooking,
  submitBookingRequest,
  addContainer,
  removeContainer,
} from '@/app/actions/booking-actions';
import {
  FreightBooking,
  BookingFormData,
  BookingContainer,
  ShippingLine,
  Port,
} from '@/types/agency';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface EditBookingClientProps {
  booking: FreightBooking;
  containers: BookingContainer[];
  shippingLines: ShippingLine[];
  ports: Port[];
  customers: { id: string; name: string }[];
  jobOrders: { id: string; joNumber: string }[];
}

export function EditBookingClient({
  booking,
  containers: initialContainers,
  shippingLines,
  ports,
  customers,
  jobOrders,
}: EditBookingClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const bookingFormData: BookingFormData = {
    jobOrderId: booking.jobOrderId,
    quotationId: booking.quotationId,
    customerId: booking.customerId,
    shippingLineId: booking.shippingLineId,
    carrierBookingNumber: booking.carrierBookingNumber,
    originPortId: booking.originPortId,
    destinationPortId: booking.destinationPortId,
    vesselName: booking.vesselName,
    voyageNumber: booking.voyageNumber,
    etd: booking.etd,
    eta: booking.eta,
    cutoffDate: booking.cutoffDate,
    cutoffTime: booking.cutoffTime,
    siCutoff: booking.siCutoff,
    cargoDescription: booking.cargoDescription,
    hsCode: booking.hsCode,
    commodityType: booking.commodityType,
    containerType: booking.containerType,
    containerQuantity: booking.containerQuantity,
    packagesCount: booking.packagesCount,
    grossWeightKg: booking.grossWeightKg,
    volumeCbm: booking.volumeCbm,
    cargoLengthM: booking.cargoLengthM,
    cargoWidthM: booking.cargoWidthM,
    cargoHeightM: booking.cargoHeightM,
    shipperName: booking.shipperName,
    shipperAddress: booking.shipperAddress,
    consigneeName: booking.consigneeName,
    consigneeAddress: booking.consigneeAddress,
    notifyParty: booking.notifyParty,
    notifyAddress: booking.notifyAddress,
    incoterm: booking.incoterm,
    freightTerms: booking.freightTerms,
    freightRate: booking.freightRate,
    freightCurrency: booking.freightCurrency,
    totalFreight: booking.totalFreight,
    specialRequirements: booking.specialRequirements,
    dangerousGoods: booking.dangerousGoods,
    documents: booking.documents,
    notes: booking.notes,
  };

  const syncContainers = async (newContainers: BookingContainer[]) => {
    // Remove containers that are no longer in the list
    const existingIds = new Set(newContainers.filter(c => c.id).map(c => c.id));
    for (const container of initialContainers) {
      if (!existingIds.has(container.id)) {
        await removeContainer(container.id);
      }
    }

    // Add new containers (those without IDs)
    for (const container of newContainers) {
      if (!container.id || !initialContainers.find(c => c.id === container.id)) {
        await addContainer(booking.id, {
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
    }
  };

  const handleSubmit = async (data: BookingFormData, containers: BookingContainer[]) => {
    setIsLoading(true);
    try {
      // Update booking
      const result = await updateBooking(booking.id, data);
      
      if (!result.success) {
        toast.error(result.error || 'Failed to update booking');
        return;
      }

      // Sync containers
      await syncContainers(containers);

      // Submit booking request
      const submitResult = await submitBookingRequest(booking.id);
      
      if (!submitResult.success) {
        toast.warning(`Booking updated but not submitted: ${submitResult.error}`);
        router.push(`/agency/bookings/${booking.id}`);
        return;
      }

      toast.success('Booking updated and submitted successfully');
      router.push(`/agency/bookings/${booking.id}`);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async (data: BookingFormData, containers: BookingContainer[]) => {
    setIsLoading(true);
    try {
      const result = await updateBooking(booking.id, data);
      
      if (!result.success) {
        toast.error(result.error || 'Failed to save draft');
        return;
      }

      // Sync containers
      await syncContainers(containers);

      toast.success('Draft saved successfully');
      router.push(`/agency/bookings/${booking.id}`);
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
        <Link href={`/agency/bookings/${booking.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Booking</h1>
          <p className="text-muted-foreground">{booking.bookingNumber}</p>
        </div>
      </div>

      {/* Form */}
      <BookingForm
        booking={bookingFormData}
        containers={initialContainers}
        shippingLines={shippingLines}
        ports={ports}
        customers={customers}
        jobOrders={jobOrders.map(jo => ({ id: jo.id, joNumber: jo.joNumber }))}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}
