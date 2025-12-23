'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BLForm } from '@/components/agency/bl-form';
import { updateBillOfLading } from '@/app/actions/bl-documentation-actions';
import { BillOfLading, BLFormData, FreightBooking, ShippingLine } from '@/types/agency';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface EditBLClientProps {
  bl: BillOfLading;
  shippingLines: ShippingLine[];
  bookings: FreightBooking[];
}

export function EditBLClient({
  bl,
  shippingLines,
  bookings,
}: EditBLClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Convert BillOfLading to BLFormData
  const blFormData: BLFormData = {
    bookingId: bl.bookingId,
    jobOrderId: bl.jobOrderId,
    blType: bl.blType,
    originalCount: bl.originalCount,
    shippingLineId: bl.shippingLineId,
    carrierBlNumber: bl.carrierBlNumber,
    vesselName: bl.vesselName,
    voyageNumber: bl.voyageNumber,
    flag: bl.flag,
    portOfLoading: bl.portOfLoading,
    portOfDischarge: bl.portOfDischarge,
    placeOfReceipt: bl.placeOfReceipt,
    placeOfDelivery: bl.placeOfDelivery,
    shippedOnBoardDate: bl.shippedOnBoardDate,
    blDate: bl.blDate,
    shipperName: bl.shipperName,
    shipperAddress: bl.shipperAddress,
    consigneeName: bl.consigneeName,
    consigneeAddress: bl.consigneeAddress,
    consigneeToOrder: bl.consigneeToOrder,
    notifyPartyName: bl.notifyPartyName,
    notifyPartyAddress: bl.notifyPartyAddress,
    cargoDescription: bl.cargoDescription,
    marksAndNumbers: bl.marksAndNumbers,
    numberOfPackages: bl.numberOfPackages,
    packageType: bl.packageType,
    grossWeightKg: bl.grossWeightKg,
    measurementCbm: bl.measurementCbm,
    containers: bl.containers,
    freightTerms: bl.freightTerms,
    freightAmount: bl.freightAmount,
    freightCurrency: bl.freightCurrency,
    remarks: bl.remarks,
  };

  const handleSubmit = async (data: BLFormData) => {
    setIsLoading(true);
    try {
      const result = await updateBillOfLading(bl.id, data);
      
      if (!result.success) {
        toast.error(result.error || 'Failed to update Bill of Lading');
        return;
      }

      toast.success('Bill of Lading updated successfully');
      router.push(`/agency/bl/${bl.id}`);
    } catch (error) {
      console.error('Error updating B/L:', error);
      toast.error('Failed to update Bill of Lading');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async (data: BLFormData) => {
    setIsLoading(true);
    try {
      const result = await updateBillOfLading(bl.id, data);
      
      if (!result.success) {
        toast.error(result.error || 'Failed to save draft');
        return;
      }

      toast.success('Draft saved successfully');
      router.push(`/agency/bl/${bl.id}`);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/agency/bl/${bl.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/agency/bl/${bl.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Bill of Lading</h1>
          <p className="text-muted-foreground font-mono">{bl.blNumber}</p>
        </div>
      </div>

      {/* Form */}
      <BLForm
        booking={bl.booking}
        initialData={blFormData}
        shippingLines={shippingLines}
        bookings={bookings}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}
