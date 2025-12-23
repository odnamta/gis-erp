'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Calculator } from 'lucide-react';
import {
  ShippingRateFormData,
  ShippingLine,
  Port,
  CONTAINER_TYPES,
  SHIPPING_TERMS,
  ContainerType,
  ShippingTerms,
  SurchargeItem,
} from '@/types/agency';
import { calculateTotalRate } from '@/lib/rate-calculation-utils';
import { format } from 'date-fns';


// Surcharge schema
const surchargeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
});

// Main form schema
export const shippingRateSchema = z.object({
  shippingLineId: z.string().min(1, 'Shipping line is required'),
  originPortId: z.string().min(1, 'Origin port is required'),
  destinationPortId: z.string().min(1, 'Destination port is required'),
  containerType: z.enum(['20GP', '40GP', '40HC', '20OT', '40OT', '20FR', '40FR', 'BREAKBULK'] as const),
  oceanFreight: z.coerce.number().min(0, 'Ocean freight must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  baf: z.coerce.number().min(0).optional().default(0),
  caf: z.coerce.number().min(0).optional().default(0),
  pss: z.coerce.number().min(0).optional().default(0),
  ens: z.coerce.number().min(0).optional().default(0),
  otherSurcharges: z.array(surchargeSchema).optional().default([]),
  transitDays: z.coerce.number().min(0).optional().nullable().transform(val => val ?? undefined),
  frequency: z.string().optional(),
  validFrom: z.string().min(1, 'Valid from date is required'),
  validTo: z.string().min(1, 'Valid to date is required'),
  terms: z.enum(['CY-CY', 'CY-Door', 'Door-CY', 'Door-Door'] as const),
  notes: z.string().optional(),
}).refine(data => {
  const from = new Date(data.validFrom);
  const to = new Date(data.validTo);
  return to >= from;
}, {
  message: 'Valid to date must be after valid from date',
  path: ['validTo'],
});

export type ShippingRateFormValues = z.infer<typeof shippingRateSchema>;

interface ShippingRateFormProps {
  shippingRate?: ShippingRateFormData | null;
  shippingLines: ShippingLine[];
  ports: Port[];
  onSubmit: (data: ShippingRateFormData) => Promise<void>;
  isLoading: boolean;
  mode: 'create' | 'edit';
}

export function ShippingRateForm({
  shippingRate,
  shippingLines,
  ports,
  onSubmit,
  isLoading,
  mode,
}: ShippingRateFormProps) {
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShippingRateFormValues>({
    resolver: zodResolver(shippingRateSchema) as never,
    defaultValues: {
      shippingLineId: shippingRate?.shippingLineId || '',
      originPortId: shippingRate?.originPortId || '',
      destinationPortId: shippingRate?.destinationPortId || '',
      containerType: shippingRate?.containerType || '20GP',
      oceanFreight: shippingRate?.oceanFreight || 0,
      currency: shippingRate?.currency || 'USD',
      baf: shippingRate?.baf || 0,
      caf: shippingRate?.caf || 0,
      pss: shippingRate?.pss || 0,
      ens: shippingRate?.ens || 0,
      otherSurcharges: shippingRate?.otherSurcharges || [],
      transitDays: shippingRate?.transitDays || undefined,
      frequency: shippingRate?.frequency || '',
      validFrom: shippingRate?.validFrom || format(new Date(), 'yyyy-MM-dd'),
      validTo: shippingRate?.validTo || format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      terms: shippingRate?.terms || 'CY-CY',
      notes: shippingRate?.notes || '',
    },
  });

  const { fields: surchargeFields, append: appendSurcharge, remove: removeSurcharge } = useFieldArray({
    control,
    name: 'otherSurcharges',
  });

  // Watch values for auto-calculation
  const oceanFreight = watch('oceanFreight');
  const baf = watch('baf');
  const caf = watch('caf');
  const pss = watch('pss');
  const ens = watch('ens');
  const otherSurcharges = watch('otherSurcharges');
  const currency = watch('currency');

  // Auto-calculate total rate
  useEffect(() => {
    const total = calculateTotalRate(
      oceanFreight || 0,
      baf || 0,
      caf || 0,
      pss || 0,
      ens || 0,
      otherSurcharges || []
    );
    setCalculatedTotal(total);
  }, [oceanFreight, baf, caf, pss, ens, otherSurcharges]);

  const handleFormSubmit = async (data: ShippingRateFormValues) => {
    const formData: ShippingRateFormData = {
      ...data,
      containerType: data.containerType as ContainerType,
      terms: data.terms as ShippingTerms,
      transitDays: data.transitDays ?? undefined,
      otherSurcharges: data.otherSurcharges as SurchargeItem[],
    };
    await onSubmit(formData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Route Information */}
      <Card>
        <CardHeader>
          <CardTitle>Route Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="shippingLineId">Shipping Line *</Label>
            <Select
              value={watch('shippingLineId')}
              onValueChange={(value) => setValue('shippingLineId', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select shipping line" />
              </SelectTrigger>
              <SelectContent>
                {shippingLines.map((line) => (
                  <SelectItem key={line.id} value={line.id}>
                    {line.lineName} ({line.lineCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.shippingLineId && (
              <p className="text-sm text-destructive">{errors.shippingLineId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="containerType">Container Type *</Label>
            <Select
              value={watch('containerType')}
              onValueChange={(value) => setValue('containerType', value as ContainerType)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select container type" />
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.containerType && (
              <p className="text-sm text-destructive">{errors.containerType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="originPortId">Origin Port *</Label>
            <Select
              value={watch('originPortId')}
              onValueChange={(value) => setValue('originPortId', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select origin port" />
              </SelectTrigger>
              <SelectContent>
                {ports.map((port) => (
                  <SelectItem key={port.id} value={port.id}>
                    {port.portCode} - {port.portName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.originPortId && (
              <p className="text-sm text-destructive">{errors.originPortId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationPortId">Destination Port *</Label>
            <Select
              value={watch('destinationPortId')}
              onValueChange={(value) => setValue('destinationPortId', value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination port" />
              </SelectTrigger>
              <SelectContent>
                {ports.map((port) => (
                  <SelectItem key={port.id} value={port.id}>
                    {port.portCode} - {port.portName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.destinationPortId && (
              <p className="text-sm text-destructive">{errors.destinationPortId.message}</p>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="oceanFreight">Ocean Freight *</Label>
              <Input
                id="oceanFreight"
                {...register('oceanFreight')}
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 1500"
                disabled={isLoading}
              />
              {errors.oceanFreight && (
                <p className="text-sm text-destructive">{errors.oceanFreight.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={watch('currency')}
                onValueChange={(value) => setValue('currency', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="IDR">IDR</SelectItem>
                  <SelectItem value="SGD">SGD</SelectItem>
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-sm text-destructive">{errors.currency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms *</Label>
              <Select
                value={watch('terms')}
                onValueChange={(value) => setValue('terms', value as ShippingTerms)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select terms" />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_TERMS.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.terms && (
                <p className="text-sm text-destructive">{errors.terms.message}</p>
              )}
            </div>
          </div>

          {/* Standard Surcharges */}
          <div>
            <Label className="text-base font-medium">Standard Surcharges</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Common surcharges applied to shipping rates
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="baf">BAF (Bunker Adjustment)</Label>
                <Input
                  id="baf"
                  {...register('baf')}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="caf">CAF (Currency Adjustment)</Label>
                <Input
                  id="caf"
                  {...register('caf')}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pss">PSS (Peak Season)</Label>
                <Input
                  id="pss"
                  {...register('pss')}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ens">ENS (Equipment)</Label>
                <Input
                  id="ens"
                  {...register('ens')}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Other Surcharges */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-base font-medium">Other Surcharges</Label>
                <p className="text-sm text-muted-foreground">
                  Additional surcharges specific to this rate
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSurcharge({ name: '', amount: 0, currency: currency || 'USD' })}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Surcharge
              </Button>
            </div>

            {surchargeFields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                No additional surcharges. Click &quot;Add Surcharge&quot; to add one.
              </p>
            ) : (
              <div className="space-y-3">
                {surchargeFields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Name</Label>
                      <Input
                        {...register(`otherSurcharges.${index}.name`)}
                        placeholder="e.g., THC"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Amount</Label>
                      <Input
                        {...register(`otherSurcharges.${index}.amount`)}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="w-24 space-y-2">
                      <Label>Currency</Label>
                      <Input
                        {...register(`otherSurcharges.${index}.currency`)}
                        placeholder="USD"
                        disabled={isLoading}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSurcharge(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calculated Total */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Calculated Total Rate</span>
              </div>
              <span className="text-2xl font-bold">{formatCurrency(calculatedTotal)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ocean Freight + All Surcharges
            </p>
          </div>
        </CardContent>
      </Card>


      {/* Validity & Transit */}
      <Card>
        <CardHeader>
          <CardTitle>Validity & Transit</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="validFrom">Valid From *</Label>
            <Input
              id="validFrom"
              {...register('validFrom')}
              type="date"
              disabled={isLoading}
            />
            {errors.validFrom && (
              <p className="text-sm text-destructive">{errors.validFrom.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="validTo">Valid To *</Label>
            <Input
              id="validTo"
              {...register('validTo')}
              type="date"
              disabled={isLoading}
            />
            {errors.validTo && (
              <p className="text-sm text-destructive">{errors.validTo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transitDays">Transit Days</Label>
            <Input
              id="transitDays"
              {...register('transitDays')}
              type="number"
              min="0"
              placeholder="e.g., 14"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency</Label>
            <Input
              id="frequency"
              {...register('frequency')}
              placeholder="e.g., Weekly"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register('notes')}
            placeholder="Additional notes about this rate..."
            rows={4}
            disabled={isLoading}
          />
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
            'Update Shipping Rate'
          ) : (
            'Create Shipping Rate'
          )}
        </Button>
      </div>
    </form>
  );
}
