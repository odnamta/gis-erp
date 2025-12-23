'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SIForm } from '@/components/agency/si-form';
import { updateShippingInstruction } from '@/app/actions/bl-documentation-actions';
import { ShippingInstruction, SIFormData, FreightBooking } from '@/types/agency';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface EditSIClientProps {
  si: ShippingInstruction;
  bookings: FreightBooking[];
}

export function EditSIClient({ si, bookings }: EditSIClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Convert SI to form data
  const initialData: SIFormData = {
    bookingId: si.bookingId,
    shipperName: si.shipperName,
    shipperAddress: si.shipperAddress,
    shipperContact: si.shipperContact,
    consigneeName: si.consigneeName,
    consigneeAddress: si.consigneeAddress,
    consigneeToOrder: si.consigneeToOrder,
    toOrderText: si.toOrderText,
    notifyPartyName: si.notifyPartyName,
    notifyPartyAddress: si.notifyPartyAddress,
    secondNotifyName: si.secondNotifyName,
    secondNotifyAddress: si.secondNotifyAddress,
    cargoDescription: si.cargoDescription,
    marksAndNumbers: si.marksAndNumbers,
    hsCode: si.hsCode,
    numberOfPackages: si.numberOfPackages,
    packageType: si.packageType,
    grossWeightKg: si.grossWeightKg,
    netWeightKg: si.netWeightKg,
    measurementCbm: si.measurementCbm,
    blTypeRequested: si.blTypeRequested,
    originalsRequired: si.originalsRequired,
    copiesRequired: si.copiesRequired,
    freightTerms: si.freightTerms,
    specialInstructions: si.specialInstructions,
    lcNumber: si.lcNumber,
    lcIssuingBank: si.lcIssuingBank,
    lcTerms: si.lcTerms,
    documentsRequired: si.documentsRequired,
  };

  const handleSubmit = async (data: SIFormData) => {
    setIsLoading(true);
    try {
      const result = await updateShippingInstruction(si.id, data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to update Shipping Instruction');
        return;
      }

      toast.success('Shipping Instruction updated successfully');
      router.push(`/agency/si/${si.id}`);
    } catch (error) {
      console.error('Error updating SI:', error);
      toast.error('Failed to update Shipping Instruction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/agency/si/${si.id}`);
  };

  // Find the booking for this SI
  const booking = bookings.find(b => b.id === si.bookingId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/agency/si/${si.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Shipping Instruction</h1>
          <p className="text-muted-foreground font-mono">{si.siNumber}</p>
        </div>
      </div>

      {/* Form */}
      <SIForm
        booking={booking}
        initialData={initialData}
        bookings={bookings}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}
