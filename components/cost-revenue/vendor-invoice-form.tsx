'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Link as LinkIcon } from 'lucide-react';
import {
  VendorInvoiceFormData,
  AgencyVendorInvoice,
  ServiceProvider,
  ShipmentCost,
} from '@/types/agency';

// Common currencies
const CURRENCIES = ['IDR', 'USD', 'EUR', 'SGD', 'JPY', 'CNY'];

// Form validation schema
const vendorInvoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  vendorId: z.string().min(1, 'Vendor is required'),
  vendorName: z.string().optional(),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  dueDate: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
  subtotal: z.coerce.number().min(0, 'Subtotal must be non-negative'),
  taxAmount: z.coerce.number().min(0, 'Tax amount must be non-negative'),
  totalAmount: z.coerce.number().min(0, 'Total amount must be non-negative'),
  documentUrl: z.string().optional(),
  notes: z.string().optional(),
});

type VendorInvoiceFormValues = z.infer<typeof vendorInvoiceFormSchema>;

interface VendorInvoiceFormProps {
  invoice?: AgencyVendorInvoice | null;
  vendors: ServiceProvider[];
  availableCosts?: ShipmentCost[];
  onSubmit: (data: VendorInvoiceFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export function VendorInvoiceForm({
  invoice,
  vendors,
  availableCosts = [],
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: VendorInvoiceFormProps) {
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>(invoice?.costIds || []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VendorInvoiceFormValues>({
    resolver: zodResolver(vendorInvoiceFormSchema) as any,
    defaultValues: {
      invoiceNumber: invoice?.invoiceNumber || '',
      vendorId: invoice?.vendorId || '',
      vendorName: invoice?.vendorName || '',
      invoiceDate: invoice?.invoiceDate || new Date().toISOString().split('T')[0],
      dueDate: invoice?.dueDate || '',
      currency: invoice?.currency || 'IDR',
      subtotal: invoice?.subtotal || 0,
      taxAmount: invoice?.taxAmount || 0,
      totalAmount: invoice?.totalAmount || 0,
      documentUrl: invoice?.documentUrl || '',
      notes: invoice?.notes || '',
    },
  });

  const watchedVendorId = watch('vendorId');
  const watchedSubtotal = watch('subtotal');
  const watchedTaxAmount = watch('taxAmount');
  const watchedCurrency = watch('currency');

  // Update vendor name when vendor is selected
  useEffect(() => {
    if (watchedVendorId && vendors.length > 0) {
      const selectedVendor = vendors.find((v) => v.id === watchedVendorId);
      if (selectedVendor) {
        setValue('vendorName', selectedVendor.providerName);
      }
    }
  }, [watchedVendorId, vendors, setValue]);

  // Auto-calculate total amount
  useEffect(() => {
    const subtotal = watchedSubtotal || 0;
    const taxAmount = watchedTaxAmount || 0;
    setValue('totalAmount', subtotal + taxAmount);
  }, [watchedSubtotal, watchedTaxAmount, setValue]);

  // Filter available costs by selected vendor
  const vendorCosts = availableCosts.filter(
    (cost) => cost.vendorId === watchedVendorId || !cost.vendorId
  );

  const handleCostToggle = (costId: string, checked: boolean) => {
    if (checked) {
      setSelectedCostIds((prev) => [...prev, costId]);
    } else {
      setSelectedCostIds((prev) => prev.filter((id) => id !== costId));
    }
  };

  const handleFormSubmit = async (data: VendorInvoiceFormValues) => {
    const formData: VendorInvoiceFormData = {
      invoiceNumber: data.invoiceNumber,
      vendorId: data.vendorId,
      vendorName: data.vendorName || undefined,
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate || undefined,
      currency: data.currency,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount,
      totalAmount: data.totalAmount,
      costIds: selectedCostIds,
      documentUrl: data.documentUrl || undefined,
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
    <form onSubmit={handleSubmit(handleFormSubmit as any)} className="space-y-6">
      {/* Basic Information */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice Number *</Label>
          <Input
            id="invoiceNumber"
            {...register('invoiceNumber')}
            placeholder="e.g., INV-2024-001"
            disabled={isLoading}
          />
          {errors.invoiceNumber && (
            <p className="text-sm text-destructive">{errors.invoiceNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendorId">Vendor *</Label>
          <Select
            value={watchedVendorId}
            onValueChange={(value) => setValue('vendorId', value)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.providerName} ({vendor.providerCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vendorId && (
            <p className="text-sm text-destructive">{errors.vendorId.message}</p>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoiceDate">Invoice Date *</Label>
          <Input
            id="invoiceDate"
            type="date"
            {...register('invoiceDate')}
            disabled={isLoading}
          />
          {errors.invoiceDate && (
            <p className="text-sm text-destructive">{errors.invoiceDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            {...register('dueDate')}
            disabled={isLoading}
          />
          {errors.dueDate && (
            <p className="text-sm text-destructive">{errors.dueDate.message}</p>
          )}
        </div>
      </div>

      {/* Amounts */}
      <div className="grid gap-4 md:grid-cols-4">
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
          <Label htmlFor="subtotal">Subtotal *</Label>
          <Input
            id="subtotal"
            type="number"
            step="0.01"
            min="0"
            {...register('subtotal')}
            disabled={isLoading}
          />
          {errors.subtotal && (
            <p className="text-sm text-destructive">{errors.subtotal.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxAmount">Tax Amount</Label>
          <Input
            id="taxAmount"
            type="number"
            step="0.01"
            min="0"
            {...register('taxAmount')}
            disabled={isLoading}
          />
          {errors.taxAmount && (
            <p className="text-sm text-destructive">{errors.taxAmount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="totalAmount">Total Amount</Label>
          <Input
            id="totalAmount"
            type="number"
            step="0.01"
            min="0"
            {...register('totalAmount')}
            disabled={isLoading}
            className="bg-muted"
          />
          {errors.totalAmount && (
            <p className="text-sm text-destructive">{errors.totalAmount.message}</p>
          )}
        </div>
      </div>

      {/* Cost Linking */}
      {vendorCosts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Link Costs to Invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {vendorCosts.map((cost) => (
                <div
                  key={cost.id}
                  className="flex items-center space-x-3 rounded-lg border p-3"
                >
                  <Checkbox
                    id={`cost-${cost.id}`}
                    checked={selectedCostIds.includes(cost.id)}
                    onCheckedChange={(checked) =>
                      handleCostToggle(cost.id, checked as boolean)
                    }
                    disabled={isLoading}
                  />
                  <label
                    htmlFor={`cost-${cost.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {cost.chargeType?.chargeName || 'Unknown Charge'}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(cost.totalAmount, 'IDR')}
                      </span>
                    </div>
                    {cost.description && (
                      <p className="text-muted-foreground text-xs mt-1">
                        {cost.description}
                      </p>
                    )}
                  </label>
                </div>
              ))}
            </div>
            {selectedCostIds.length > 0 && (
              <div className="mt-3 pt-3 border-t text-sm">
                <span className="text-muted-foreground">
                  {selectedCostIds.length} cost(s) selected
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document URL */}
      <div className="space-y-2">
        <Label htmlFor="documentUrl">Document URL</Label>
        <Input
          id="documentUrl"
          {...register('documentUrl')}
          placeholder="Link to invoice document"
          disabled={isLoading}
        />
        <p className="text-sm text-muted-foreground">
          Optional link to the uploaded invoice document
        </p>
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
          {mode === 'create' ? 'Create Invoice' : 'Update Invoice'}
        </Button>
      </div>
    </form>
  );
}
