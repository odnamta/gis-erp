'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { AssignmentInput, AssignmentType } from '@/types/utilization';
import { ASSIGNMENT_TYPES } from '@/lib/utilization-utils';
import { assignAsset } from '@/lib/utilization-actions';
import { toast } from 'sonner';

interface JobOrder {
  id: string;
  jo_number: string;
  customer_name?: string;
}

interface AssignmentFormProps {
  assetId: string;
  assetCode: string;
  assetName: string;
  currentOdometer?: number;
  currentHours?: number;
  jobOrders: JobOrder[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AssignmentForm({
  assetId,
  assetCode,
  assetName,
  currentOdometer,
  currentHours,
  jobOrders,
  onSuccess,
  onCancel,
}: AssignmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('job_order');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>();

  const { register, handleSubmit, setValue } = useForm<{
    jobOrderId: string;
    startKm: number;
    startHours: number;
    notes: string;
  }>({
    defaultValues: {
      startKm: currentOdometer || 0,
      startHours: currentHours || 0,
    },
  });

  async function onSubmit(data: { jobOrderId: string; startKm: number; startHours: number; notes: string }) {
    setLoading(true);
    try {
      const input: AssignmentInput = {
        assetId,
        assignmentType,
        jobOrderId: assignmentType === 'job_order' ? data.jobOrderId : undefined,
        assignedFrom: startDate.toISOString(),
        assignedTo: endDate?.toISOString(),
        startKm: data.startKm || undefined,
        startHours: data.startHours || undefined,
        notes: data.notes || undefined,
      };

      const result = await assignAsset(input);

      if (result.success) {
        toast.success('Asset assigned successfully');
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to assign asset');
      }
    } catch (error) {
      console.error('Error assigning asset:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-lg border p-4 bg-muted/50">
        <p className="font-medium">{assetCode} • {assetName}</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Assign To</Label>
          <RadioGroup
            value={assignmentType}
            onValueChange={(value) => setAssignmentType(value as AssignmentType)}
            className="flex gap-4 mt-2"
          >
            {ASSIGNMENT_TYPES.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <RadioGroupItem value={type.value} id={type.value} />
                <Label htmlFor={type.value} className="font-normal cursor-pointer">
                  {type.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {assignmentType === 'job_order' && (
          <div className="space-y-2">
            <Label htmlFor="jobOrderId">Job Order *</Label>
            <Select onValueChange={(value) => setValue('jobOrderId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select job order" />
              </SelectTrigger>
              <SelectContent>
                {jobOrders.map((jo) => (
                  <SelectItem key={jo.id} value={jo.id}>
                    {jo.jo_number} {jo.customer_name && `- ${jo.customer_name}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd/MM/yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !endDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd/MM/yyyy') : 'Leave empty if ongoing'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startKm">Current Odometer (km)</Label>
            <Input
              id="startKm"
              type="number"
              {...register('startKm', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startHours">Current Hour Meter</Label>
            <Input
              id="startHours"
              type="number"
              step="0.1"
              {...register('startHours', { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Add any notes about this assignment..."
            {...register('notes')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirm Assignment
        </Button>
      </div>
    </form>
  );
}
