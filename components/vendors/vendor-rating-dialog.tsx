'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VendorRatingForm } from './vendor-rating-form';
import { RatingFormData } from '@/types/vendors';
import { rateVendor } from '@/app/(main)/vendors/rating-actions';
import { useToast } from '@/hooks/use-toast';

interface VendorRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  joId?: string;
  bkkId?: string;
  onSuccess?: () => void;
}

export function VendorRatingDialog({
  open,
  onOpenChange,
  vendorId,
  vendorName,
  joId,
  bkkId,
  onSuccess,
}: VendorRatingDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: RatingFormData) => {
    setIsLoading(true);
    try {
      const result = await rateVendor(vendorId, data, joId, bkkId);
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Rating submitted successfully',
        });
        onOpenChange(false);
        onSuccess?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate Vendor</DialogTitle>
          <DialogDescription>
            Submit your rating for {vendorName}
          </DialogDescription>
        </DialogHeader>
        <VendorRatingForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
