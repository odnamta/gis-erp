'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  AgencyChargeType,
  ShipmentRevenueFormData,
  ShipmentRevenue,
} from '@/types/agency';
import {
  convertToIdr,
  calculateTotalWithTax,
  calculateLineAmount,
  DEFAULT_TAX_RATE,
} from '@/lib/cost-revenue-utils';

// Common currencies used in shipping
const CURRENCIES = ['IDR', 'USD', 'EUR', 'SGD', 'JPY', 'CNY'];

// Form validation schema
const revenueFormSchema = z.object({
  chargeTypeId: z.string().min(1, 'Charge type is required'),
  description: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be non-negative'),
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
  exchangeRate: z.coerce.number().optional(),
  isTaxable: z.boolean().optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

type RevenueFormValues = {
  chargeTypeId: string;
  description?: string;
  currency: string;
  unitPrice: number;
  quantity: number;
  exchangeRate?: number;
  isTaxable?: boolean;
  taxRate?: number;
  notes?: string;
};

interface RevenueFormProps {
  bookingId?: string;
  blId?: string;
  jobOrderId?: string;
  invoiceId?: string;
  revenue?: ShipmentRevenue | null;
  chargeTypes: AgencyChargeType[];
  onSubmit: (data: ShipmentRevenueFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export function RevenueForm({
  bookingId,
  blId,
  jobOrderId,
  invoiceId,
  revenue,
  chargeTypes,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: RevenueFormProps) {
  // Filter charge types to only show revenue or both types
  const revenueChargeTypes = chargeTypes.filter(
    (ct) => ct.chargeType === 'revenue' || ct.chargeType === 'both'
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<RevenueFormValues>({
    resolver: zodResolver(revenueFormSchema) as any,
    defaultValues: {
      chargeTypeId: revenue?.chargeTypeId || '',
      description: revenue?.description || '',
      currency: revenue?.currency || 'IDR',
      unitPrice: revenue?.unitPrice || 0,
      quantity: revenue?.quantity || 1,
      exchangeRate: revenue?.exchangeRate || 1,
      isTaxable: revenue?.isTaxable ?? true,
      taxRate: revenue?.taxRate ?? DEFAULT_TAX_RATE,
      notes: revenue?.notes || '',
    },
  });

  // Watch form values for auto-calculation
  const watchedCurrency = watch('currency');
  const watchedUnitPrice = watch('unitPrice');
  const watchedQuantity = watch('quantity');
  const watchedExchangeRate = watch('exchangeRate');
  const watchedIsTaxable = watch('isTaxable');
  const watchedTaxRate = watch('taxRate');
  const watchedChargeTypeId = watch('chargeTypeId');

  // Calculate derived values
  const [calculatedValues, setCalculatedValues] = useState({
    amount: 0,
    amountIdr: 0,
    taxAmount: 0,
    totalAmount: 0,
  });

  // Auto-calculate amounts when inputs change
  useEffect(() => {
    const unitPrice = watchedUnitPrice || 0;
    const quantity = watchedQuantity || 1;
    const exchangeRate = watchedCurrency === 'IDR' ? 1 : (watchedExchangeRate || 1);
    const taxRate = watchedTaxRate ?? DEFAULT_TAX_RATE;
    const isTaxable = watchedIsTaxable ?? true;

    const amount = calculateLineAmount(unitPrice, quantity);
    const amountIdr = watchedCurrency === 'IDR' ? amount : convertToIdr(amount, watchedCurrency, exchangeRate);
    const { tax, total } = calculateTotalWithTax(amountIdr, taxRate, isTaxable);

    setCalculatedValues({
      amount,
      amountIdr,
      taxAmount: tax,
      totalAmount: total,
    });
  }, [watchedCurrency, watchedUnitPrice, watchedQuantity, watchedExchangeRate, watchedIsTaxable, watchedTaxRate]);

  // Update default currency when charge type changes
  useEffect(() => {
    if (watchedChargeTypeId && mode === 'create') {
      const selectedChargeType = revenueChargeTypes.find((ct) => ct.id === watchedChargeTypeId);
      if (selectedChargeType?.defaultCurrency) {
        setValue('currency', selectedChargeType.defaultCurrency);
      }
    }
  }, [watchedChargeTypeId, revenueChargeTypes, setValue, mode]);

  const handleFormSubmit = async (data: RevenueFormValues) => {
    const formData: ShipmentRevenueFormData = {
      bookingId,
      blId,
      jobOrderId,
      invoiceId,
      chargeTypeId: data.chargeTypeId,
      description: data.description || undefined,
      currency: data.currency,
      unitPrice: data.unitPrice,
      quantity: data.quantity,
      exchangeRate: data.currency === 'IDR' ? 1 : data.exchangeRate,
      isTaxable: data.isTaxable,
      taxRate: data.taxRate,
      notes: data.notes || undefined,
    };

    await onSubmit(formData);
  };

  const formatCurrency = (value: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency === 'IDR' ? 'IDR' : currency,
      minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    }).format(value);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Charge Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="chargeTypeId">Charge Type *</Label>
        <Select
          value={watchedChargeTypeId}
          onValueChange={(value) => setValue('chargeTypeId', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select charge type" />
          </SelectTrigger>
          <SelectContent>
            {revenueChargeTypes.map((ct) => (
              <SelectItem key={ct.id} value={ct.id}>
                {ct.chargeName} ({ct.chargeCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.chargeTypeId && (
          <p className="text-sm text-destructive">{errors.chargeTypeId.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          {...register('description')}
          placeholder="Optional description"
          disabled={isLoading}
        />
      </div>

      {/* Currency and Amount */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="currency">Currency *</Label>
          <Select
            value={watchedCurrency}
            onValueChange={(value) => setValue('currency', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((curr) => (
                <SelectItem key={curr} value={curr}>
                  {curr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.currency && (
            <p className="text-sm text-destructive">{errors.currency.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="unitPrice">Unit Price *</Label>
          <Input
            id="unitPrice"
            type="number"
            step="0.01"
            min="0"
            {...register('unitPrice')}
            disabled={isLoading}
          />
          {errors.unitPrice && (
            <p className="text-sm text-destructive">{errors.unitPrice.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            min="0.01"
            {...register('quantity')}
            disabled={isLoading}
          />
          {errors.quantity && (
            <p className="text-sm text-destructive">{errors.quantity.message}</p>
          )}
        </div>
      </div>

      {/* Exchange Rate (only for non-IDR currencies) */}
      {watchedCurrency !== 'IDR' && (
        <div className="space-y-2">
          <Label htmlFor="exchangeRate">Exchange Rate to IDR *</Label>
          <Input
            id="exchangeRate"
            type="number"
            step="0.000001"
            min="0.000001"
            {...register('exchangeRate')}
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground">
            1 {watchedCurrency} = {watchedExchangeRate || 1} IDR
          </p>
          {errors.exchangeRate && (
            <p className="text-sm text-destructive">{errors.exchangeRate.message}</p>
          )}
        </div>
      )}

      {/* Tax Settings */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>Taxable</Label>
            <p className="text-sm text-muted-foreground">Apply tax to this revenue</p>
          </div>
          <Switch
            checked={watchedIsTaxable}
            onCheckedChange={(checked) => setValue('isTaxable', checked)}
            disabled={isLoading}
          />
        </div>

        {watchedIsTaxable && (
          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input
              id="taxRate"
              type="number"
              step="0.01"
              min="0"
              max="100"
              {...register('taxRate')}
              disabled={isLoading}
            />
            {errors.taxRate && (
              <p className="text-sm text-destructive">{errors.taxRate.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Calculated Amounts Display */}
      <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
        <h4 className="font-medium">Calculated Amounts</h4>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span>Amount ({watchedCurrency}):</span>
            <span className="font-medium">{formatCurrency(calculatedValues.amount, watchedCurrency)}</span>
          </div>
          {watchedCurrency !== 'IDR' && (
            <div className="flex justify-between">
              <span>Amount (IDR):</span>
              <span className="font-medium">{formatCurrency(calculatedValues.amountIdr, 'IDR')}</span>
            </div>
          )}
          {watchedIsTaxable && (
            <div className="flex justify-between">
              <span>Tax ({watchedTaxRate}%):</span>
              <span className="font-medium">{formatCurrency(calculatedValues.taxAmount, 'IDR')}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Total (IDR):</span>
            <span className="font-bold">{formatCurrency(calculatedValues.totalAmount, 'IDR')}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          {...register('notes')}
          placeholder="Additional notes..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Add Revenue' : 'Update Revenue'}
        </Button>
      </div>
    </form>
  );
}
