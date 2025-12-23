'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { ShippingLineFormData, SERVICE_TYPES, SERVICE_TYPE_LABELS, ServiceType } from '@/types/agency';

// Contact schema
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  notes: z.string().optional(),
});

// Route schema
const routeSchema = z.object({
  originPort: z.string().min(1, 'Origin port is required'),
  destinationPort: z.string().min(1, 'Destination port is required'),
  frequency: z.string().optional(),
  transitDays: z.coerce.number().min(0).optional().nullable().transform(val => val ?? undefined),
});

// Main form schema
export const shippingLineSchema = z.object({
  lineName: z.string().min(1, 'Line name is required'),
  lineCode: z.string().optional(),
  headOfficeAddress: z.string().optional(),
  headOfficeCountry: z.string().optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  bookingPortalUrl: z.string().url('Invalid URL').or(z.literal('')).optional(),
  trackingUrl: z.string().url('Invalid URL').or(z.literal('')).optional(),
  localAgentName: z.string().optional(),
  localAgentAddress: z.string().optional(),
  localAgentPhone: z.string().optional(),
  localAgentEmail: z.string().email('Invalid email').or(z.literal('')).optional(),
  contacts: z.array(contactSchema),
  servicesOffered: z.array(z.string()),
  routesServed: z.array(routeSchema),
  paymentTerms: z.string().optional(),
  creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative').optional(),
  creditDays: z.coerce.number().min(0, 'Credit days cannot be negative').optional(),
  serviceRating: z.coerce.number().min(1).max(5).optional(),
  isPreferred: z.boolean(),
  notes: z.string().optional(),
});

export type ShippingLineFormValues = z.infer<typeof shippingLineSchema>;

interface ShippingLineFormProps {
  shippingLine?: ShippingLineFormData | null;
  onSubmit: (data: ShippingLineFormData) => Promise<void>;
  isLoading: boolean;
  mode: 'create' | 'edit';
}

export function ShippingLineForm({ shippingLine, onSubmit, isLoading, mode }: ShippingLineFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ShippingLineFormValues>({
    resolver: zodResolver(shippingLineSchema) as never,
    defaultValues: {
      lineName: shippingLine?.lineName || '',
      lineCode: shippingLine?.lineCode || '',
      headOfficeAddress: shippingLine?.headOfficeAddress || '',
      headOfficeCountry: shippingLine?.headOfficeCountry || '',
      website: shippingLine?.website || '',
      bookingPortalUrl: shippingLine?.bookingPortalUrl || '',
      trackingUrl: shippingLine?.trackingUrl || '',
      localAgentName: shippingLine?.localAgentName || '',
      localAgentAddress: shippingLine?.localAgentAddress || '',
      localAgentPhone: shippingLine?.localAgentPhone || '',
      localAgentEmail: shippingLine?.localAgentEmail || '',
      contacts: shippingLine?.contacts || [],
      servicesOffered: shippingLine?.servicesOffered || [],
      routesServed: shippingLine?.routesServed || [],
      paymentTerms: shippingLine?.paymentTerms || '',
      creditLimit: shippingLine?.creditLimit || undefined,
      creditDays: shippingLine?.creditDays || undefined,
      serviceRating: shippingLine?.serviceRating || undefined,
      isPreferred: shippingLine?.isPreferred ?? false,
      notes: shippingLine?.notes || '',
    },
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control,
    name: 'contacts',
  });

  const { fields: routeFields, append: appendRoute, remove: removeRoute } = useFieldArray({
    control,
    name: 'routesServed',
  });

  const selectedServices = watch('servicesOffered') as ServiceType[];
  const isPreferred = watch('isPreferred');

  const toggleService = (service: ServiceType) => {
    const current = selectedServices || [];
    if (current.includes(service)) {
      setValue('servicesOffered', current.filter(s => s !== service));
    } else {
      setValue('servicesOffered', [...current, service]);
    }
  };

  const handleFormSubmit = async (data: ShippingLineFormValues) => {
    const formData: ShippingLineFormData = {
      ...data,
      servicesOffered: data.servicesOffered as ServiceType[],
      routesServed: data.routesServed.map(r => ({
        ...r,
        transitDays: r.transitDays ?? undefined,
      })),
    };
    await onSubmit(formData);
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
            <Label htmlFor="lineName">Line Name *</Label>
            <Input
              id="lineName"
              {...register('lineName')}
              placeholder="e.g., Maersk Line"
              disabled={isLoading}
            />
            {errors.lineName && (
              <p className="text-sm text-destructive">{errors.lineName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lineCode">Line Code</Label>
            <Input
              id="lineCode"
              {...register('lineCode')}
              placeholder="Auto-generated if empty"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Leave empty to auto-generate</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              {...register('website')}
              placeholder="https://www.example.com"
              disabled={isLoading}
            />
            {errors.website && (
              <p className="text-sm text-destructive">{errors.website.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bookingPortalUrl">Booking Portal URL</Label>
            <Input
              id="bookingPortalUrl"
              {...register('bookingPortalUrl')}
              placeholder="https://booking.example.com"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trackingUrl">Tracking URL</Label>
            <Input
              id="trackingUrl"
              {...register('trackingUrl')}
              placeholder="https://tracking.example.com"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Head Office */}
      <Card>
        <CardHeader>
          <CardTitle>Head Office</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="headOfficeAddress">Address</Label>
            <Input
              id="headOfficeAddress"
              {...register('headOfficeAddress')}
              placeholder="Head office address"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headOfficeCountry">Country</Label>
            <Input
              id="headOfficeCountry"
              {...register('headOfficeCountry')}
              placeholder="e.g., Denmark"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Local Representative */}
      <Card>
        <CardHeader>
          <CardTitle>Local Representative</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="localAgentName">Agent Name</Label>
            <Input
              id="localAgentName"
              {...register('localAgentName')}
              placeholder="Local agent company name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="localAgentPhone">Phone</Label>
            <Input
              id="localAgentPhone"
              {...register('localAgentPhone')}
              placeholder="+62 xxx xxxx xxxx"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="localAgentEmail">Email</Label>
            <Input
              id="localAgentEmail"
              type="email"
              {...register('localAgentEmail')}
              placeholder="agent@example.com"
              disabled={isLoading}
            />
            {errors.localAgentEmail && (
              <p className="text-sm text-destructive">{errors.localAgentEmail.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="localAgentAddress">Address</Label>
            <Input
              id="localAgentAddress"
              {...register('localAgentAddress')}
              placeholder="Local agent address"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Contacts</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendContact({ name: '', role: '', phone: '', email: '', notes: '' })}
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {contactFields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No contacts added. Click &quot;Add Contact&quot; to add one.
            </p>
          ) : (
            contactFields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Contact {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeContact(index)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      {...register(`contacts.${index}.name`)}
                      placeholder="Contact name"
                      disabled={isLoading}
                    />
                    {errors.contacts?.[index]?.name && (
                      <p className="text-sm text-destructive">{errors.contacts[index]?.name?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Input
                      {...register(`contacts.${index}.role`)}
                      placeholder="e.g., Sales Manager"
                      disabled={isLoading}
                    />
                    {errors.contacts?.[index]?.role && (
                      <p className="text-sm text-destructive">{errors.contacts[index]?.role?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      {...register(`contacts.${index}.phone`)}
                      placeholder="+62 xxx xxxx xxxx"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      {...register(`contacts.${index}.email`)}
                      type="email"
                      placeholder="contact@example.com"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Notes</Label>
                    <Input
                      {...register(`contacts.${index}.notes`)}
                      placeholder="Additional notes"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Services Offered */}
      <Card>
        <CardHeader>
          <CardTitle>Services Offered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SERVICE_TYPES.map((service) => (
              <Badge
                key={service}
                variant={selectedServices?.includes(service) ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => !isLoading && toggleService(service)}
              >
                {SERVICE_TYPE_LABELS[service]}
                {selectedServices?.includes(service) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Click to toggle services</p>
        </CardContent>
      </Card>


      {/* Routes Served */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Routes Served</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendRoute({ originPort: '', destinationPort: '', frequency: '', transitDays: undefined })}
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Route
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {routeFields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No routes added. Click &quot;Add Route&quot; to add one.
            </p>
          ) : (
            routeFields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Route {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRoute(index)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Origin Port *</Label>
                    <Input
                      {...register(`routesServed.${index}.originPort`)}
                      placeholder="e.g., IDTPP"
                      disabled={isLoading}
                    />
                    {errors.routesServed?.[index]?.originPort && (
                      <p className="text-sm text-destructive">{errors.routesServed[index]?.originPort?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Destination Port *</Label>
                    <Input
                      {...register(`routesServed.${index}.destinationPort`)}
                      placeholder="e.g., SGSIN"
                      disabled={isLoading}
                    />
                    {errors.routesServed?.[index]?.destinationPort && (
                      <p className="text-sm text-destructive">{errors.routesServed[index]?.destinationPort?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Input
                      {...register(`routesServed.${index}.frequency`)}
                      placeholder="e.g., Weekly"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Transit Days</Label>
                    <Input
                      {...register(`routesServed.${index}.transitDays`)}
                      type="number"
                      min="0"
                      placeholder="e.g., 7"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Commercial Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Commercial Terms</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              {...register('paymentTerms')}
              placeholder="e.g., Net 30"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditLimit">Credit Limit (USD)</Label>
            <Input
              id="creditLimit"
              {...register('creditLimit')}
              type="number"
              min="0"
              placeholder="e.g., 50000"
              disabled={isLoading}
            />
            {errors.creditLimit && (
              <p className="text-sm text-destructive">{errors.creditLimit.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditDays">Credit Days</Label>
            <Input
              id="creditDays"
              {...register('creditDays')}
              type="number"
              min="0"
              placeholder="e.g., 30"
              disabled={isLoading}
            />
            {errors.creditDays && (
              <p className="text-sm text-destructive">{errors.creditDays.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rating & Status */}
      <Card>
        <CardHeader>
          <CardTitle>Rating & Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="serviceRating">Service Rating (1-5)</Label>
              <Input
                id="serviceRating"
                {...register('serviceRating')}
                type="number"
                min="1"
                max="5"
                step="0.1"
                placeholder="e.g., 4.5"
                disabled={isLoading}
              />
              {errors.serviceRating && (
                <p className="text-sm text-destructive">{errors.serviceRating.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isPreferred">Preferred Partner</Label>
              <p className="text-sm text-muted-foreground">
                Preferred partners are highlighted in the list
              </p>
            </div>
            <Switch
              id="isPreferred"
              checked={isPreferred}
              onCheckedChange={(checked) => setValue('isPreferred', checked)}
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
            placeholder="Additional notes about this shipping line..."
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
            'Update Shipping Line'
          ) : (
            'Create Shipping Line'
          )}
        </Button>
      </div>
    </form>
  );
}
