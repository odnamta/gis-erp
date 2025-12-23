'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowRight } from 'lucide-react';
import {
  AmendmentFormData,
  AmendmentType,
  AMENDMENT_TYPES,
  AMENDMENT_TYPE_LABELS,
} from '@/types/agency';

const amendmentSchema = z.object({
  amendmentType: z.string().min(1, 'Amendment type is required'),
  description: z.string().min(1, 'Description is required'),
  notes: z.string().optional(),
});

type AmendmentFormValues = z.infer<typeof amendmentSchema>;

interface AmendmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AmendmentFormData) => Promise<void>;
  bookingNumber: string;
  currentValues?: Record<string, unknown>;
  isLoading?: boolean;
}

export function AmendmentDialog({
  open,
  onOpenChange,
  onSubmit,
  bookingNumber,
  currentValues = {},
  isLoading = false,
}: AmendmentDialogProps) {
  const [newValues, setNewValues] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AmendmentFormValues>({
    resolver: zodResolver(amendmentSchema),
    defaultValues: {
      amendmentType: '',
      description: '',
      notes: '',
    },
  });

  const selectedType = watch('amendmentType') as AmendmentType;

  const getFieldsForType = (type: AmendmentType): string[] => {
    switch (type) {
      case 'schedule_change':
        return ['etd', 'eta', 'cutoffDate'];
      case 'quantity_change':
        return ['containerQuantity', 'grossWeightKg'];
      case 'vessel_change':
        return ['vesselName', 'voyageNumber'];
      case 'rate_change':
        return ['freightRate', 'totalFreight'];
      case 'consignee_change':
        return ['consigneeName', 'consigneeAddress'];
      default:
        return [];
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      etd: 'ETD',
      eta: 'ETA',
      cutoffDate: 'Cutoff Date',
      containerQuantity: 'Container Quantity',
      grossWeightKg: 'Gross Weight (kg)',
      vesselName: 'Vessel Name',
      voyageNumber: 'Voyage Number',
      freightRate: 'Freight Rate',
      totalFreight: 'Total Freight',
      consigneeName: 'Consignee Name',
      consigneeAddress: 'Consignee Address',
    };
    return labels[field] || field;
  };

  const handleFormSubmit = async (data: AmendmentFormValues) => {
    const fields = getFieldsForType(data.amendmentType as AmendmentType);
    const oldValues: Record<string, unknown> = {};
    const newValuesObj: Record<string, unknown> = {};

    fields.forEach((field) => {
      oldValues[field] = currentValues[field] || '';
      newValuesObj[field] = newValues[field] || '';
    });

    const formData: AmendmentFormData = {
      amendmentType: data.amendmentType as AmendmentType,
      description: data.description,
      oldValues,
      newValues: newValuesObj,
      notes: data.notes,
    };

    await onSubmit(formData);
    reset();
    setNewValues({});
  };

  const handleClose = () => {
    reset();
    setNewValues({});
    onOpenChange(false);
  };

  const fields = selectedType ? getFieldsForType(selectedType) : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Request Amendment</DialogTitle>
          <DialogDescription>
            Request changes to booking {bookingNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amendmentType">Amendment Type *</Label>
            <Select
              value={selectedType || ''}
              onValueChange={(value) => {
                setValue('amendmentType', value);
                setNewValues({});
              }}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select amendment type" />
              </SelectTrigger>
              <SelectContent>
                {AMENDMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {AMENDMENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.amendmentType && (
              <p className="text-sm text-destructive">{errors.amendmentType.message}</p>
            )}
          </div>

          {fields.length > 0 && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium text-sm">Value Changes</h4>
              {fields.map((field) => (
                <div key={field} className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Current {getFieldLabel(field)}
                    </Label>
                    <Input
                      value={String(currentValues[field] || '-')}
                      disabled
                      className="bg-background"
                    />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-5" />
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      New {getFieldLabel(field)}
                    </Label>
                    <Input
                      value={newValues[field] || ''}
                      onChange={(e) =>
                        setNewValues((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                      placeholder={`Enter new ${getFieldLabel(field).toLowerCase()}`}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe the reason for this amendment..."
              rows={3}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes..."
              rows={2}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Amendment Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
