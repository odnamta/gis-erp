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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  PortAgentFormData, 
  Port, 
  PORT_AGENT_SERVICES, 
  PORT_AGENT_SERVICE_LABELS, 
  PortAgentService 
} from '@/types/agency';

// Contact schema
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  notes: z.string().optional(),
});

// Main form schema
export const portAgentSchema = z.object({
  agentName: z.string().min(1, 'Agent name is required'),
  agentCode: z.string().optional(),
  portId: z.string().optional(),
  portName: z.string().min(1, 'Port name is required'),
  portCountry: z.string().min(1, 'Port country is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  website: z.string().url('Invalid URL').or(z.literal('')).optional(),
  contacts: z.array(contactSchema),
  services: z.array(z.string()),
  customsLicense: z.string().optional(),
  ppjkLicense: z.string().optional(),
  otherLicenses: z.array(z.string()),
  paymentTerms: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankSwift: z.string().optional(),
  serviceRating: z.coerce.number().min(1).max(5).optional(),
  isPreferred: z.boolean(),
  notes: z.string().optional(),
});

export type PortAgentFormValues = z.infer<typeof portAgentSchema>;

interface PortAgentFormProps {
  portAgent?: PortAgentFormData | null;
  ports: Port[];
  onSubmit: (data: PortAgentFormData) => Promise<void>;
  isLoading: boolean;
  mode: 'create' | 'edit';
}

export function PortAgentForm({ portAgent, ports, onSubmit, isLoading, mode }: PortAgentFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PortAgentFormValues>({
    resolver: zodResolver(portAgentSchema) as never,
    defaultValues: {
      agentName: portAgent?.agentName || '',
      agentCode: portAgent?.agentCode || '',
      portId: portAgent?.portId || '',
      portName: portAgent?.portName || '',
      portCountry: portAgent?.portCountry || '',
      address: portAgent?.address || '',
      phone: portAgent?.phone || '',
      email: portAgent?.email || '',
      website: portAgent?.website || '',
      contacts: portAgent?.contacts || [],
      services: portAgent?.services || [],
      customsLicense: portAgent?.customsLicense || '',
      ppjkLicense: portAgent?.ppjkLicense || '',
      otherLicenses: portAgent?.otherLicenses || [],
      paymentTerms: portAgent?.paymentTerms || '',
      currency: portAgent?.currency || 'USD',
      bankName: portAgent?.bankName || '',
      bankAccount: portAgent?.bankAccount || '',
      bankSwift: portAgent?.bankSwift || '',
      serviceRating: portAgent?.serviceRating || undefined,
      isPreferred: portAgent?.isPreferred ?? false,
      notes: portAgent?.notes || '',
    },
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control,
    name: 'contacts',
  });

  const { fields: licenseFields, append: appendLicense, remove: removeLicense } = useFieldArray({
    control,
    name: 'otherLicenses' as never,
  });

  const selectedServices = watch('services') as PortAgentService[];
  const isPreferred = watch('isPreferred');
  const selectedPortId = watch('portId');

  const toggleService = (service: PortAgentService) => {
    const current = selectedServices || [];
    if (current.includes(service)) {
      setValue('services', current.filter(s => s !== service));
    } else {
      setValue('services', [...current, service]);
    }
  };

  const handlePortChange = (portId: string) => {
    setValue('portId', portId);
    const port = ports.find(p => p.id === portId);
    if (port) {
      setValue('portName', port.portName);
      setValue('portCountry', port.countryName);
    }
  };

  const handleFormSubmit = async (data: PortAgentFormValues) => {
    const formData: PortAgentFormData = {
      ...data,
      services: data.services as PortAgentService[],
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
            <Label htmlFor="agentName">Agent Name *</Label>
            <Input
              id="agentName"
              {...register('agentName')}
              placeholder="e.g., PT. Port Services Indonesia"
              disabled={isLoading}
            />
            {errors.agentName && (
              <p className="text-sm text-destructive">{errors.agentName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentCode">Agent Code</Label>
            <Input
              id="agentCode"
              {...register('agentCode')}
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
        </CardContent>
      </Card>

      {/* Port Location */}
      <Card>
        <CardHeader>
          <CardTitle>Port Location</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Select Port</Label>
            <Select value={selectedPortId || ''} onValueChange={handlePortChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a port" />
              </SelectTrigger>
              <SelectContent>
                {ports.map((port) => (
                  <SelectItem key={port.id} value={port.id}>
                    {port.portName} ({port.portCode}) - {port.countryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select from existing ports or enter manually below
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portName">Port Name *</Label>
            <Input
              id="portName"
              {...register('portName')}
              placeholder="e.g., Tanjung Perak"
              disabled={isLoading}
            />
            {errors.portName && (
              <p className="text-sm text-destructive">{errors.portName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="portCountry">Country *</Label>
            <Input
              id="portCountry"
              {...register('portCountry')}
              placeholder="e.g., Indonesia"
              disabled={isLoading}
            />
            {errors.portCountry && (
              <p className="text-sm text-destructive">{errors.portCountry.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Full address"
              disabled={isLoading}
            />
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

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle>Services Offered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PORT_AGENT_SERVICES.map((service) => (
              <Badge
                key={service}
                variant={selectedServices?.includes(service) ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() => !isLoading && toggleService(service)}
              >
                {PORT_AGENT_SERVICE_LABELS[service]}
                {selectedServices?.includes(service) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Click to toggle services</p>
        </CardContent>
      </Card>

      {/* Licenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Licenses</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendLicense('' as never)}
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Other License
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customsLicense">Customs License</Label>
            <Input
              id="customsLicense"
              {...register('customsLicense')}
              placeholder="Customs broker license number"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ppjkLicense">PPJK License</Label>
            <Input
              id="ppjkLicense"
              {...register('ppjkLicense')}
              placeholder="PPJK license number"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Pengusaha Pengurusan Jasa Kepabeanan
            </p>
          </div>

          {licenseFields.length > 0 && (
            <div className="md:col-span-2 space-y-4">
              <Label>Other Licenses</Label>
              {licenseFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    {...register(`otherLicenses.${index}` as never)}
                    placeholder="License name/number"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLicense(index)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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
        <CardContent className="grid gap-4 md:grid-cols-2">
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
            <Label htmlFor="currency">Currency *</Label>
            <Select 
              value={watch('currency')} 
              onValueChange={(value) => setValue('currency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
              </SelectContent>
            </Select>
            {errors.currency && (
              <p className="text-sm text-destructive">{errors.currency.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle>Bank Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              {...register('bankName')}
              placeholder="e.g., Bank Central Asia"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankAccount">Account Number</Label>
            <Input
              id="bankAccount"
              {...register('bankAccount')}
              placeholder="Account number"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankSwift">SWIFT Code</Label>
            <Input
              id="bankSwift"
              {...register('bankSwift')}
              placeholder="e.g., CENAIDJA"
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
            placeholder="Additional notes about this port agent..."
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
            'Update Port Agent'
          ) : (
            'Create Port Agent'
          )}
        </Button>
      </div>
    </form>
  );
}
