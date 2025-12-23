'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrivalNoticeForm } from '@/components/agency/arrival-notice-form';
import { createArrivalNotice } from '@/app/actions/bl-documentation-actions';
import { ArrivalNoticeFormData, BillOfLading } from '@/types/agency';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface NewArrivalNoticeClientProps {
  billsOfLading: BillOfLading[];
  preselectedBL?: BillOfLading | null;
}

export function NewArrivalNoticeClient({
  billsOfLading,
  preselectedBL,
}: NewArrivalNoticeClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: ArrivalNoticeFormData) => {
    setIsLoading(true);
    try {
      const result = await createArrivalNotice(data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to create Arrival Notice');
        return;
      }

      toast.success('Arrival Notice created successfully');
      router.push(`/agency/arrivals/${result.data.id}`);
    } catch (error) {
      console.error('Error creating Arrival Notice:', error);
      toast.error('Failed to create Arrival Notice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async (data: ArrivalNoticeFormData) => {
    setIsLoading(true);
    try {
      const result = await createArrivalNotice(data);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to save draft');
        return;
      }

      toast.success('Draft saved successfully');
      router.push(`/agency/arrivals/${result.data.id}`);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/agency/arrivals');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/agency/arrivals">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Arrival Notice</h1>
          <p className="text-muted-foreground">
            Create an arrival notice from a Bill of Lading
          </p>
        </div>
      </div>

      {/* Form */}
      <ArrivalNoticeForm
        bl={preselectedBL}
        billsOfLading={billsOfLading}
        onSubmit={handleSubmit}
        onSaveDraft={handleSaveDraft}
        onCancel={handleCancel}
        isLoading={isLoading}
        mode="create"
      />
    </div>
  );
}
