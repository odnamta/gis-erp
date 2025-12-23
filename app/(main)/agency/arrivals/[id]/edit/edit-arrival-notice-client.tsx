'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrivalNoticeForm } from '@/components/agency/arrival-notice-form';
import { updateArrivalNotice } from '@/app/actions/bl-documentation-actions';
import { ArrivalNotice, ArrivalNoticeFormData, BillOfLading } from '@/types/agency';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface EditArrivalNoticeClientProps {
  notice: ArrivalNotice;
  billsOfLading: BillOfLading[];
}

export function EditArrivalNoticeClient({
  notice,
  billsOfLading,
}: EditArrivalNoticeClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Convert notice to form data
  const initialData: ArrivalNoticeFormData = {
    blId: notice.blId,
    bookingId: notice.bookingId,
    vesselName: notice.vesselName,
    voyageNumber: notice.voyageNumber,
    eta: notice.eta,
    ata: notice.ata,
    portOfDischarge: notice.portOfDischarge,
    terminal: notice.terminal,
    berth: notice.berth,
    containerNumbers: notice.containerNumbers,
    cargoDescription: notice.cargoDescription,
    freeTimeDays: notice.freeTimeDays,
    estimatedCharges: notice.estimatedCharges,
    deliveryInstructions: notice.deliveryInstructions,
    deliveryAddress: notice.deliveryAddress,
    notes: notice.notes,
  };

  const handleSubmit = async (data: ArrivalNoticeFormData) => {
    setIsLoading(true);
    try {
      const result = await updateArrivalNotice(notice.id, data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to update Arrival Notice');
        return;
      }

      toast.success('Arrival Notice updated successfully');
      router.push(`/agency/arrivals/${notice.id}`);
    } catch (error) {
      console.error('Error updating Arrival Notice:', error);
      toast.error('Failed to update Arrival Notice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/agency/arrivals/${notice.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/agency/arrivals/${notice.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Arrival Notice</h1>
          <p className="text-muted-foreground">
            {notice.noticeNumber}
          </p>
        </div>
      </div>

      {/* Form */}
      <ArrivalNoticeForm
        initialData={initialData}
        billsOfLading={billsOfLading}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="edit"
      />
    </div>
  );
}
