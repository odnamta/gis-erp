'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { DailyLogInput, DailyLogStatus } from '@/types/utilization';
import { DAILY_LOG_STATUSES } from '@/lib/utilization-utils';
import { logDailyUtilization } from '@/lib/utilization-actions';
import { toast } from 'sonner';

interface JobOrder {
  id: string;
  jo_number: string;
  customer_name?: string;
}

interface DailyLogFormProps {
  assetId: string;
  assetCode: string;
  assetName: string;
  currentOdometer?: number;
  currentHours?: number;
  jobOrders?: JobOrder[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DailyLogForm({
  assetId,
  assetCode,
  assetName,
  currentOdometer,
  currentHours,
  jobOrders = [],
  onSuccess,
  onCancel,
}: DailyLogFormProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<DailyLogStatus>('operating');
  const [jobOrderId, setJobOrderId] = useState<string>('');

  const { register, handleSubmit } = useForm<{
    logDate: string;
    startKm: number;
    endKm: number;
    startHours: number;
    endHours: number;
    fuelLiters: number;
    fuelCost: number;
    operatorName: string;
    notes: string;
  }>({
    defaultValues: {
      logDate: new Date().toISOString().split('T')[0],
      startKm: currentOdometer || 0,
      endKm: currentOdometer || 0,
      startHours: currentHours || 0,
      endHours: currentHours || 0,
      fuelLiters: 0,
      fuelCost: 0,
    },
  });


  async function onSubmit(data: {
    logDate: string;
    startKm: number;
    endKm: number;
    startHours: number;
    endHours: number;
    fuelLiters: number;
    fuelCost: number;
    operatorName: string;
    notes: string;
  }) {
    setLoading(true);
    try {
      const input: DailyLogInput = {
        assetId,
        logDate: data.logDate,
        status,
        jobOrderId: jobOrderId || undefined,
        startKm: data.startKm || undefined,
        endKm: data.endKm || undefined,
        startHours: data.startHours || undefined,
        endHours: data.endHours || undefined,
        fuelLiters: data.fuelLiters || undefined,
        fuelCost: data.fuelCost || undefined,
        operatorName: data.operatorName || undefined,
        notes: data.notes || undefined,
      };

      const result = await logDailyUtilization(input);

      if (result.success) {
        toast.success('Daily log saved successfully');
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to save daily log');
      }
    } catch (error) {
      console.error('Error saving daily log:', error);
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

      <Card>
        <CardHeader>
          <CardTitle>Log Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="logDate">Date *</Label>
            <Input
              id="logDate"
              type="date"
              {...register('logDate', { required: true })}
            />
          </div>

          <div className="space-y-2">
            <Label>Status *</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DailyLogStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAILY_LOG_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status === 'operating' && jobOrders.length > 0 && (
            <div className="space-y-2 md:col-span-2">
              <Label>Job Order (optional)</Label>
              <Select value={jobOrderId} onValueChange={setJobOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No job order</SelectItem>
                  {jobOrders.map((jo) => (
                    <SelectItem key={jo.id} value={jo.id}>
                      {jo.jo_number} {jo.customer_name && `- ${jo.customer_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Meter Readings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startKm">Start Odometer (km)</Label>
            <Input
              id="startKm"
              type="number"
              min="0"
              {...register('startKm', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endKm">End Odometer (km)</Label>
            <Input
              id="endKm"
              type="number"
              min="0"
              {...register('endKm', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startHours">Start Hour Meter</Label>
            <Input
              id="startHours"
              type="number"
              min="0"
              step="0.1"
              {...register('startHours', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endHours">End Hour Meter</Label>
            <Input
              id="endHours"
              type="number"
              min="0"
              step="0.1"
              {...register('endHours', { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fuel Consumption</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fuelLiters">Fuel (Liters)</Label>
            <Input
              id="fuelLiters"
              type="number"
              min="0"
              step="0.1"
              {...register('fuelLiters', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fuelCost">Fuel Cost (IDR)</Label>
            <Input
              id="fuelCost"
              type="number"
              min="0"
              {...register('fuelCost', { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Operator & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="operatorName">Operator Name</Label>
            <Input
              id="operatorName"
              placeholder="Name of operator"
              {...register('operatorName')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              {...register('notes')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Daily Log
        </Button>
      </div>
    </form>
  );
}
