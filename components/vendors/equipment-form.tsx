'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { EquipmentFormData, EquipmentType, EquipmentCondition } from '@/types/vendors';
import { EQUIPMENT_TYPES, EQUIPMENT_CONDITIONS } from '@/lib/vendor-utils';

// Validation schema
const equipmentTypes = [
  'trailer_40ft',
  'trailer_20ft',
  'lowbed',
  'fuso',
  'wingbox',
  'crane',
  'forklift',
  'excavator',
  'other',
] as const;

const conditions = ['excellent', 'good', 'fair', 'poor'] as const;

export const equipmentSchema = z.object({
  equipment_type: z.enum(equipmentTypes, {
    message: 'Equipment type is required',
  }),
  plate_number: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year_made: z.number().int().min(1900).max(2100).optional().nullable(),
  capacity_kg: z.number().min(0).optional().nullable(),
  capacity_m3: z.number().min(0).optional().nullable(),
  capacity_description: z.string().optional(),
  length_m: z.number().min(0).optional().nullable(),
  width_m: z.number().min(0).optional().nullable(),
  height_m: z.number().min(0).optional().nullable(),
  daily_rate: z.number().min(0).optional().nullable(),
  rate_notes: z.string().optional(),
  is_available: z.boolean(),
  condition: z.enum(conditions),
  stnk_expiry: z.string().optional(),
  kir_expiry: z.string().optional(),
  insurance_expiry: z.string().optional(),
  notes: z.string().optional(),
});

export type EquipmentFormValues = z.infer<typeof equipmentSchema>;

interface EquipmentFormProps {
  equipment?: EquipmentFormData | null;
  onSubmit: (data: EquipmentFormData) => Promise<void>;
  isLoading: boolean;
  mode: 'create' | 'edit';
}

export function EquipmentForm({ equipment, onSubmit, isLoading, mode }: EquipmentFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      equipment_type: equipment?.equipment_type || 'trailer_40ft',
      plate_number: equipment?.plate_number || '',
      brand: equipment?.brand || '',
      model: equipment?.model || '',
      year_made: equipment?.year_made || undefined,
      capacity_kg: equipment?.capacity_kg || undefined,
      capacity_m3: equipment?.capacity_m3 || undefined,
      capacity_description: equipment?.capacity_description || '',
      length_m: equipment?.length_m || undefined,
      width_m: equipment?.width_m || undefined,
      height_m: equipment?.height_m || undefined,
      daily_rate: equipment?.daily_rate || undefined,
      rate_notes: equipment?.rate_notes || '',
      is_available: equipment?.is_available ?? true,
      condition: equipment?.condition || 'good',
      stnk_expiry: equipment?.stnk_expiry || '',
      kir_expiry: equipment?.kir_expiry || '',
      insurance_expiry: equipment?.insurance_expiry || '',
      notes: equipment?.notes || '',
    },
  });

  const selectedType = watch('equipment_type');
  const selectedCondition = watch('condition');
  const isAvailable = watch('is_available');

  const handleFormSubmit = async (data: EquipmentFormValues) => {
    await onSubmit(data as EquipmentFormData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="equipment_type">Equipment Type *</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => setValue('equipment_type', v as EquipmentType)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.equipment_type && (
              <p className="text-sm text-destructive">{errors.equipment_type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plate_number">Plate Number</Label>
            <Input
              id="plate_number"
              {...register('plate_number')}
              placeholder="B 1234 ABC"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              {...register('brand')}
              placeholder="Hino, Mitsubishi, etc."
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              {...register('model')}
              placeholder="Model name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year_made">Year Made</Label>
            <Input
              id="year_made"
              type="number"
              {...register('year_made', { valueAsNumber: true })}
              placeholder="2020"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select
              value={selectedCondition}
              onValueChange={(v) => setValue('condition', v as EquipmentCondition)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_CONDITIONS.map((cond) => (
                  <SelectItem key={cond.value} value={cond.value}>
                    {cond.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Capacity & Dimensions */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity & Dimensions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="capacity_kg">Capacity (kg)</Label>
            <Input
              id="capacity_kg"
              type="number"
              {...register('capacity_kg', { valueAsNumber: true })}
              placeholder="20000"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity_m3">Capacity (m³)</Label>
            <Input
              id="capacity_m3"
              type="number"
              step="0.1"
              {...register('capacity_m3', { valueAsNumber: true })}
              placeholder="60"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity_description">Capacity Description</Label>
            <Input
              id="capacity_description"
              {...register('capacity_description')}
              placeholder="e.g., 2x20ft containers"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="length_m">Length (m)</Label>
            <Input
              id="length_m"
              type="number"
              step="0.1"
              {...register('length_m', { valueAsNumber: true })}
              placeholder="12.2"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="width_m">Width (m)</Label>
            <Input
              id="width_m"
              type="number"
              step="0.1"
              {...register('width_m', { valueAsNumber: true })}
              placeholder="2.4"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="height_m">Height (m)</Label>
            <Input
              id="height_m"
              type="number"
              step="0.1"
              {...register('height_m', { valueAsNumber: true })}
              placeholder="2.6"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="daily_rate">Daily Rate (IDR)</Label>
            <Input
              id="daily_rate"
              type="number"
              {...register('daily_rate', { valueAsNumber: true })}
              placeholder="5000000"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rate_notes">Rate Notes</Label>
            <Input
              id="rate_notes"
              {...register('rate_notes')}
              placeholder="e.g., Includes driver, fuel extra"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Expiry Dates */}
      <Card>
        <CardHeader>
          <CardTitle>Document Expiry Dates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="stnk_expiry">STNK Expiry</Label>
            <Input
              id="stnk_expiry"
              type="date"
              {...register('stnk_expiry')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="kir_expiry">KIR Expiry</Label>
            <Input
              id="kir_expiry"
              type="date"
              {...register('kir_expiry')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
            <Input
              id="insurance_expiry"
              type="date"
              {...register('insurance_expiry')}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Availability & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Status & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_available">Available for Assignment</Label>
              <p className="text-sm text-muted-foreground">
                Unavailable equipment won&apos;t appear in selection dropdowns
              </p>
            </div>
            <Switch
              id="is_available"
              checked={isAvailable}
              onCheckedChange={(checked) => setValue('is_available', checked)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes about this equipment..."
              rows={3}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : mode === 'edit' ? (
            'Update Equipment'
          ) : (
            'Add Equipment'
          )}
        </Button>
      </div>
    </form>
  );
}
