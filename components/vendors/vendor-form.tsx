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
import { VendorFormData, VendorType } from '@/types/vendors';
import { VENDOR_TYPES } from '@/lib/vendor-utils';

// Validation schema
const vendorTypes = ['trucking', 'shipping', 'port', 'handling', 'forwarding', 'documentation', 'other'] as const;

export const vendorSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_type: z.enum(vendorTypes, {
    message: 'Vendor type is required',
  }),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email format').or(z.literal('')).optional(),
  website: z.string().url('Invalid URL format').or(z.literal('')).optional(),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('Invalid email format').or(z.literal('')).optional(),
  contact_position: z.string().optional(),
  legal_name: z.string().optional(),
  tax_id: z.string().optional(),
  business_license: z.string().optional(),
  bank_name: z.string().optional(),
  bank_branch: z.string().optional(),
  bank_account: z.string().optional(),
  bank_account_name: z.string().optional(),
  is_active: z.boolean(),
  is_preferred: z.boolean(),
  notes: z.string().optional(),
});

export type VendorFormValues = z.infer<typeof vendorSchema>;

interface VendorFormProps {
  vendor?: VendorFormData | null;
  onSubmit: (data: VendorFormData) => Promise<void>;
  isLoading: boolean;
  mode: 'create' | 'edit';
}

export function VendorForm({ vendor, onSubmit, isLoading, mode }: VendorFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      vendor_name: vendor?.vendor_name || '',
      vendor_type: vendor?.vendor_type || 'trucking',
      address: vendor?.address || '',
      city: vendor?.city || '',
      province: vendor?.province || '',
      postal_code: vendor?.postal_code || '',
      phone: vendor?.phone || '',
      email: vendor?.email || '',
      website: vendor?.website || '',
      contact_person: vendor?.contact_person || '',
      contact_phone: vendor?.contact_phone || '',
      contact_email: vendor?.contact_email || '',
      contact_position: vendor?.contact_position || '',
      legal_name: vendor?.legal_name || '',
      tax_id: vendor?.tax_id || '',
      business_license: vendor?.business_license || '',
      bank_name: vendor?.bank_name || '',
      bank_branch: vendor?.bank_branch || '',
      bank_account: vendor?.bank_account || '',
      bank_account_name: vendor?.bank_account_name || '',
      is_active: vendor?.is_active ?? true,
      is_preferred: vendor?.is_preferred ?? false,
      notes: vendor?.notes || '',
    },
  });

  const selectedType = watch('vendor_type');
  const isActive = watch('is_active');
  const isPreferred = watch('is_preferred');

  const handleFormSubmit = async (data: VendorFormValues) => {
    await onSubmit(data as VendorFormData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vendor_name">Vendor Name *</Label>
            <Input
              id="vendor_name"
              {...register('vendor_name')}
              placeholder="PT. Example Transport"
              disabled={isLoading}
            />
            {errors.vendor_name && (
              <p className="text-sm text-destructive">{errors.vendor_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor_type">Vendor Type *</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => setValue('vendor_type', v as VendorType)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vendor_type && (
              <p className="text-sm text-destructive">{errors.vendor_type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+62 xxx xxxx xxxx"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="vendor@example.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              {...register('website')}
              placeholder="https://example.com"
              disabled={isLoading}
            />
            {errors.website && (
              <p className="text-sm text-destructive">{errors.website.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Jl. Example No. 123"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              {...register('city')}
              placeholder="Jakarta"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">Province</Label>
            <Input
              id="province"
              {...register('province')}
              placeholder="DKI Jakarta"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal Code</Label>
            <Input
              id="postal_code"
              {...register('postal_code')}
              placeholder="12345"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Primary Contact */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact_person">Contact Person</Label>
            <Input
              id="contact_person"
              {...register('contact_person')}
              placeholder="John Doe"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_position">Position</Label>
            <Input
              id="contact_position"
              {...register('contact_position')}
              placeholder="Operations Manager"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_phone">Contact Phone</Label>
            <Input
              id="contact_phone"
              {...register('contact_phone')}
              placeholder="+62 xxx xxxx xxxx"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              type="email"
              {...register('contact_email')}
              placeholder="contact@example.com"
              disabled={isLoading}
            />
            {errors.contact_email && (
              <p className="text-sm text-destructive">{errors.contact_email.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legal & Tax Information */}
      <Card>
        <CardHeader>
          <CardTitle>Legal & Tax Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="legal_name">Legal Name</Label>
            <Input
              id="legal_name"
              {...register('legal_name')}
              placeholder="PT. Example Transport Indonesia"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_id">Tax ID (NPWP)</Label>
            <Input
              id="tax_id"
              {...register('tax_id')}
              placeholder="XX.XXX.XXX.X-XXX.XXX"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_license">Business License (SIUP/NIB)</Label>
            <Input
              id="business_license"
              {...register('business_license')}
              placeholder="License number"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bank_name">Bank Name</Label>
            <Input
              id="bank_name"
              {...register('bank_name')}
              placeholder="Bank Central Asia"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_branch">Branch</Label>
            <Input
              id="bank_branch"
              {...register('bank_branch')}
              placeholder="Jakarta Pusat"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_account">Account Number</Label>
            <Input
              id="bank_account"
              {...register('bank_account')}
              placeholder="1234567890"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank_account_name">Account Name</Label>
            <Input
              id="bank_account_name"
              {...register('bank_account_name')}
              placeholder="PT. Example Transport"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Classification */}
      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Inactive vendors won&apos;t appear in selection dropdowns
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_preferred">Preferred Vendor</Label>
              <p className="text-sm text-muted-foreground">
                Preferred vendors appear first in selection dropdowns
              </p>
            </div>
            <Switch
              id="is_preferred"
              checked={isPreferred}
              onCheckedChange={(checked) => setValue('is_preferred', checked)}
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
            placeholder="Additional notes about this vendor..."
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
            'Update Vendor'
          ) : (
            'Create Vendor'
          )}
        </Button>
      </div>
    </form>
  );
}
