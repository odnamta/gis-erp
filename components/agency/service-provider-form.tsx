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
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ServiceProviderFormData, 
  PROVIDER_TYPES, 
  PROVIDER_TYPE_LABELS, 
  ProviderType 
} from '@/types/agency';

// Contact schema
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  notes: z.string().optional(),
});

// Service detail schema
const serviceDetailSchema = z.object({
  service: z.string().min(1, 'Service name is required'),
  unit: z.string().min(1, 'Unit is required'),
  rate: z.coerce.number().min(0, 'Rate must be non-negative'),
  currency: z.string().min(1, 'Currency is required'),
  notes: z.string().optional(),
});

// Coverage area schema
const coverageAreaSchema = z.object({
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  notes: z.string().optional(),
});

// Document schema
const documentSchema = z.object({
  name: z.string().min(1, 'Document name is required'),
  number: z.string().optional(),
  expiryDate: z.string().optional(),
});

// Main form schema
export const serviceProviderSchema = z.object({
  providerName: z.string().min(1, 'Provider name is required'),
  providerCode: z.string().optional(),
  providerType: z.string().min(1, 'Provider type is required'),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  contacts: z.array(contactSchema),
  servicesDetail: z.array(serviceDetailSchema),
  coverageAreas: z.array(coverageAreaSchema),
  paymentTerms: z.string().optional(),
  npwp: z.string().optional(),
  siup: z.string().optional(),
  documents: z.array(documentSchema),
  serviceRating: z.coerce.number().min(1).max(5).optional().or(z.literal('')),
  isPreferred: z.boolean(),
  notes: z.string().optional(),
});

export type ServiceProviderFormValues = z.infer<typeof serviceProviderSchema>;

interface ServiceProviderFormProps {
  serviceProvider?: ServiceProviderFormData | null;
  onSubmit: (data: ServiceProviderFormData) => Promise<void>;
  isLoading: boolean;
  mode: 'create' | 'edit';
}


export function ServiceProviderForm({ serviceProvider, onSubmit, isLoading, mode }: ServiceProviderFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceProviderFormValues>({
    resolver: zodResolver(serviceProviderSchema) as never,
    defaultValues: {
      providerName: serviceProvider?.providerName || '',
      providerCode: serviceProvider?.providerCode || '',
      providerType: serviceProvider?.providerType || '',
      city: serviceProvider?.city || '',
      province: serviceProvider?.province || '',
      country: serviceProvider?.country || 'Indonesia',
      address: serviceProvider?.address || '',
      phone: serviceProvider?.phone || '',
      email: serviceProvider?.email || '',
      contacts: serviceProvider?.contacts || [],
      servicesDetail: serviceProvider?.servicesDetail || [],
      coverageAreas: serviceProvider?.coverageAreas || [],
      paymentTerms: serviceProvider?.paymentTerms || '',
      npwp: serviceProvider?.npwp || '',
      siup: serviceProvider?.siup || '',
      documents: serviceProvider?.documents || [],
      serviceRating: serviceProvider?.serviceRating || undefined,
      isPreferred: serviceProvider?.isPreferred ?? false,
      notes: serviceProvider?.notes || '',
    },
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control,
    name: 'contacts',
  });

  const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
    control,
    name: 'servicesDetail',
  });

  const { fields: coverageFields, append: appendCoverage, remove: removeCoverage } = useFieldArray({
    control,
    name: 'coverageAreas',
  });

  const { fields: documentFields, append: appendDocument, remove: removeDocument } = useFieldArray({
    control,
    name: 'documents',
  });

  const isPreferred = watch('isPreferred');
  const selectedType = watch('providerType');

  const handleFormSubmit = async (data: ServiceProviderFormValues) => {
    const formData: ServiceProviderFormData = {
      ...data,
      providerType: data.providerType as ProviderType,
      serviceRating: data.serviceRating === '' ? undefined : Number(data.serviceRating),
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
            <Label htmlFor="providerName">Provider Name *</Label>
            <Input
              id="providerName"
              {...register('providerName')}
              placeholder="e.g., PT. Trucking Indonesia"
              disabled={isLoading}
            />
            {errors.providerName && (
              <p className="text-sm text-destructive">{errors.providerName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="providerCode">Provider Code</Label>
            <Input
              id="providerCode"
              {...register('providerCode')}
              placeholder="Auto-generated if empty"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Leave empty to auto-generate</p>
          </div>

          <div className="space-y-2">
            <Label>Provider Type *</Label>
            <Select value={selectedType} onValueChange={(value) => setValue('providerType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider type" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {PROVIDER_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.providerType && (
              <p className="text-sm text-destructive">{errors.providerType.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              {...register('city')}
              placeholder="e.g., Surabaya"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">Province</Label>
            <Input
              id="province"
              {...register('province')}
              placeholder="e.g., East Java"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Input
              id="country"
              {...register('country')}
              placeholder="e.g., Indonesia"
              disabled={isLoading}
            />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Full Address</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Full street address"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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
              placeholder="contact@example.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
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
                      placeholder="e.g., Operations Manager"
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
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>


      {/* Services Detail */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Services & Rates</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendService({ service: '', unit: '', rate: 0, currency: 'IDR', notes: '' })}
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {serviceFields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No services added. Click &quot;Add Service&quot; to add one.
            </p>
          ) : (
            serviceFields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Service {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeService(index)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Service Name *</Label>
                    <Input
                      {...register(`servicesDetail.${index}.service`)}
                      placeholder="e.g., Local Trucking"
                      disabled={isLoading}
                    />
                    {errors.servicesDetail?.[index]?.service && (
                      <p className="text-sm text-destructive">{errors.servicesDetail[index]?.service?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Unit *</Label>
                    <Input
                      {...register(`servicesDetail.${index}.unit`)}
                      placeholder="e.g., per trip, per day"
                      disabled={isLoading}
                    />
                    {errors.servicesDetail?.[index]?.unit && (
                      <p className="text-sm text-destructive">{errors.servicesDetail[index]?.unit?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Rate *</Label>
                    <Input
                      {...register(`servicesDetail.${index}.rate`)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      disabled={isLoading}
                    />
                    {errors.servicesDetail?.[index]?.rate && (
                      <p className="text-sm text-destructive">{errors.servicesDetail[index]?.rate?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Currency *</Label>
                    <Select 
                      value={watch(`servicesDetail.${index}.currency`)} 
                      onValueChange={(value) => setValue(`servicesDetail.${index}.currency`, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IDR">IDR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="SGD">SGD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2 lg:col-span-4">
                    <Label>Notes</Label>
                    <Input
                      {...register(`servicesDetail.${index}.notes`)}
                      placeholder="Additional notes about this service"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Coverage Areas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Coverage Areas</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendCoverage({ city: '', province: '', notes: '' })}
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Area
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {coverageFields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No coverage areas added. Click &quot;Add Area&quot; to add one.
            </p>
          ) : (
            coverageFields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Area {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCoverage(index)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input
                      {...register(`coverageAreas.${index}.city`)}
                      placeholder="e.g., Surabaya"
                      disabled={isLoading}
                    />
                    {errors.coverageAreas?.[index]?.city && (
                      <p className="text-sm text-destructive">{errors.coverageAreas[index]?.city?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Province *</Label>
                    <Input
                      {...register(`coverageAreas.${index}.province`)}
                      placeholder="e.g., East Java"
                      disabled={isLoading}
                    />
                    {errors.coverageAreas?.[index]?.province && (
                      <p className="text-sm text-destructive">{errors.coverageAreas[index]?.province?.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      {...register(`coverageAreas.${index}.notes`)}
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


      {/* Business Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Business Documents</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendDocument({ name: '', number: '', expiryDate: '' })}
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Document
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="npwp">NPWP</Label>
            <Input
              id="npwp"
              {...register('npwp')}
              placeholder="Tax ID number"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Nomor Pokok Wajib Pajak
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="siup">SIUP</Label>
            <Input
              id="siup"
              {...register('siup')}
              placeholder="Business license number"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Surat Izin Usaha Perdagangan
            </p>
          </div>

          {documentFields.length > 0 && (
            <div className="md:col-span-2 space-y-4">
              <Label>Other Documents</Label>
              {documentFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Document {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDocument(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Document Name *</Label>
                      <Input
                        {...register(`documents.${index}.name`)}
                        placeholder="e.g., Insurance Certificate"
                        disabled={isLoading}
                      />
                      {errors.documents?.[index]?.name && (
                        <p className="text-sm text-destructive">{errors.documents[index]?.name?.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Document Number</Label>
                      <Input
                        {...register(`documents.${index}.number`)}
                        placeholder="Document number"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input
                        {...register(`documents.${index}.expiryDate`)}
                        type="date"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commercial Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Commercial Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-md">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Input
              id="paymentTerms"
              {...register('paymentTerms')}
              placeholder="e.g., Net 30, COD"
              disabled={isLoading}
            />
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
            placeholder="Additional notes about this service provider..."
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
            'Update Service Provider'
          ) : (
            'Create Service Provider'
          )}
        </Button>
      </div>
    </form>
  );
}
