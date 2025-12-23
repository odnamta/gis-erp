'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Ship, Package, Users, FileText, AlertCircle, CreditCard, CheckSquare } from 'lucide-react';
import {
  SIFormData,
  BLType,
  FreightTerms,
  FreightBooking,
  BL_TYPES,
  BL_TYPE_LABELS,
  FREIGHT_TERMS,
  FREIGHT_TERMS_LABELS,
} from '@/types/agency';

// Common documents required for shipping instructions
const COMMON_DOCUMENTS = [
  { id: 'commercial_invoice', label: 'Commercial Invoice' },
  { id: 'packing_list', label: 'Packing List' },
  { id: 'certificate_of_origin', label: 'Certificate of Origin' },
  { id: 'bill_of_lading', label: 'Bill of Lading' },
  { id: 'insurance_certificate', label: 'Insurance Certificate' },
  { id: 'inspection_certificate', label: 'Inspection Certificate' },
  { id: 'phytosanitary_certificate', label: 'Phytosanitary Certificate' },
  { id: 'fumigation_certificate', label: 'Fumigation Certificate' },
  { id: 'weight_certificate', label: 'Weight Certificate' },
  { id: 'quality_certificate', label: 'Quality Certificate' },
];

// Form validation schema
export const siFormSchema = z.object({
  bookingId: z.string().min(1, 'A freight booking must be selected'),
  shipperName: z.string().min(1, 'Shipper name is required'),
  shipperAddress: z.string().min(1, 'Shipper address is required'),
  shipperContact: z.string().optional(),
  consigneeName: z.string().optional(),
  consigneeAddress: z.string().optional(),
  consigneeToOrder: z.boolean().optional(),
  toOrderText: z.string().optional(),
  notifyPartyName: z.string().optional(),
  notifyPartyAddress: z.string().optional(),
  secondNotifyName: z.string().optional(),
  secondNotifyAddress: z.string().optional(),
  cargoDescription: z.string().min(1, 'Cargo description is required'),
  marksAndNumbers: z.string().optional(),
  hsCode: z.string().optional(),
  numberOfPackages: z.coerce.number().min(0).optional(),
  packageType: z.string().optional(),
  grossWeightKg: z.coerce.number().min(0).optional(),
  netWeightKg: z.coerce.number().min(0).optional(),
  measurementCbm: z.coerce.number().min(0).optional(),
  blTypeRequested: z.string().optional(),
  originalsRequired: z.coerce.number().min(0).max(10).optional(),
  copiesRequired: z.coerce.number().min(0).max(10).optional(),
  freightTerms: z.string().optional(),
  specialInstructions: z.string().optional(),
  lcNumber: z.string().optional(),
  lcIssuingBank: z.string().optional(),
  lcTerms: z.string().optional(),
});

export type SIFormValues = z.infer<typeof siFormSchema>;


interface SIFormProps {
  booking?: FreightBooking | null;
  initialData?: SIFormData | null;
  bookings: FreightBooking[];
  onSubmit: (data: SIFormData) => Promise<void>;
  onSaveDraft?: (data: SIFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  mode: 'create' | 'edit';
}

/**
 * Shipping Instruction Form Component
 * Form for creating/editing SI with all fields including LC requirements and documents required checklist.
 * Per Requirements 2.1, 2.3, 2.4, 2.5
 */
export function SIForm({
  booking,
  initialData,
  bookings,
  onSubmit,
  onSaveDraft,
  onCancel,
  isLoading,
  mode,
}: SIFormProps) {
  const [activeTab, setActiveTab] = useState('shipper');
  const [consigneeToOrder, setConsigneeToOrder] = useState(initialData?.consigneeToOrder || false);
  const [documentsRequired, setDocumentsRequired] = useState<string[]>(initialData?.documentsRequired || []);
  const [hasLCRequirements, setHasLCRequirements] = useState(
    !!(initialData?.lcNumber || initialData?.lcIssuingBank || initialData?.lcTerms)
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get initial booking data
  const selectedBooking = booking || bookings.find(b => b.id === initialData?.bookingId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SIFormValues>({
    resolver: zodResolver(siFormSchema) as never,
    defaultValues: {
      bookingId: initialData?.bookingId || booking?.id || '',
      shipperName: initialData?.shipperName || booking?.shipperName || '',
      shipperAddress: initialData?.shipperAddress || booking?.shipperAddress || '',
      shipperContact: initialData?.shipperContact || '',
      consigneeName: initialData?.consigneeName || booking?.consigneeName || '',
      consigneeAddress: initialData?.consigneeAddress || booking?.consigneeAddress || '',
      consigneeToOrder: initialData?.consigneeToOrder || false,
      toOrderText: initialData?.toOrderText || '',
      notifyPartyName: initialData?.notifyPartyName || booking?.notifyParty || '',
      notifyPartyAddress: initialData?.notifyPartyAddress || booking?.notifyAddress || '',
      secondNotifyName: initialData?.secondNotifyName || '',
      secondNotifyAddress: initialData?.secondNotifyAddress || '',
      cargoDescription: initialData?.cargoDescription || booking?.cargoDescription || '',
      marksAndNumbers: initialData?.marksAndNumbers || '',
      hsCode: initialData?.hsCode || booking?.hsCode || '',
      numberOfPackages: initialData?.numberOfPackages || booking?.packagesCount || undefined,
      packageType: initialData?.packageType || '',
      grossWeightKg: initialData?.grossWeightKg || booking?.grossWeightKg || undefined,
      netWeightKg: initialData?.netWeightKg || undefined,
      measurementCbm: initialData?.measurementCbm || booking?.volumeCbm || undefined,
      blTypeRequested: initialData?.blTypeRequested || 'original',
      originalsRequired: initialData?.originalsRequired || 3,
      copiesRequired: initialData?.copiesRequired || 3,
      freightTerms: initialData?.freightTerms || booking?.freightTerms || 'prepaid',
      specialInstructions: initialData?.specialInstructions || '',
      lcNumber: initialData?.lcNumber || '',
      lcIssuingBank: initialData?.lcIssuingBank || '',
      lcTerms: initialData?.lcTerms || '',
    },
  });

  const watchedBookingId = watch('bookingId');
  const watchedBlTypeRequested = watch('blTypeRequested');

  // Update form when booking selection changes
  useEffect(() => {
    if (watchedBookingId && mode === 'create') {
      const selected = bookings.find(b => b.id === watchedBookingId);
      if (selected) {
        setValue('shipperName', selected.shipperName || '');
        setValue('shipperAddress', selected.shipperAddress || '');
        setValue('consigneeName', selected.consigneeName || '');
        setValue('consigneeAddress', selected.consigneeAddress || '');
        setValue('notifyPartyName', selected.notifyParty || '');
        setValue('notifyPartyAddress', selected.notifyAddress || '');
        setValue('cargoDescription', selected.cargoDescription || '');
        setValue('hsCode', selected.hsCode || '');
        setValue('numberOfPackages', selected.packagesCount || undefined);
        setValue('grossWeightKg', selected.grossWeightKg || undefined);
        setValue('measurementCbm', selected.volumeCbm || undefined);
        setValue('freightTerms', selected.freightTerms || 'prepaid');
      }
    }
  }, [watchedBookingId, bookings, mode, setValue]);

  const handleDocumentToggle = (docId: string, checked: boolean) => {
    if (checked) {
      setDocumentsRequired(prev => [...prev, docId]);
    } else {
      setDocumentsRequired(prev => prev.filter(d => d !== docId));
    }
  };

  const handleFormSubmit = async (data: SIFormValues) => {
    setValidationErrors([]);

    const formData: SIFormData = {
      bookingId: data.bookingId,
      shipperName: data.shipperName,
      shipperAddress: data.shipperAddress,
      shipperContact: data.shipperContact || undefined,
      consigneeName: consigneeToOrder ? undefined : data.consigneeName || undefined,
      consigneeAddress: consigneeToOrder ? undefined : data.consigneeAddress || undefined,
      consigneeToOrder: consigneeToOrder,
      toOrderText: consigneeToOrder ? data.toOrderText || undefined : undefined,
      notifyPartyName: data.notifyPartyName || undefined,
      notifyPartyAddress: data.notifyPartyAddress || undefined,
      secondNotifyName: data.secondNotifyName || undefined,
      secondNotifyAddress: data.secondNotifyAddress || undefined,
      cargoDescription: data.cargoDescription,
      marksAndNumbers: data.marksAndNumbers || undefined,
      hsCode: data.hsCode || undefined,
      numberOfPackages: data.numberOfPackages || undefined,
      packageType: data.packageType || undefined,
      grossWeightKg: data.grossWeightKg || undefined,
      netWeightKg: data.netWeightKg || undefined,
      measurementCbm: data.measurementCbm || undefined,
      blTypeRequested: (data.blTypeRequested as BLType) || undefined,
      originalsRequired: data.originalsRequired || 3,
      copiesRequired: data.copiesRequired || 3,
      freightTerms: (data.freightTerms as FreightTerms) || 'prepaid',
      specialInstructions: data.specialInstructions || undefined,
      lcNumber: hasLCRequirements ? data.lcNumber || undefined : undefined,
      lcIssuingBank: hasLCRequirements ? data.lcIssuingBank || undefined : undefined,
      lcTerms: hasLCRequirements ? data.lcTerms || undefined : undefined,
      documentsRequired: documentsRequired,
    };

    await onSubmit(formData);
  };

  const handleSaveDraft = async () => {
    const data = watch();
    const formData: SIFormData = {
      bookingId: data.bookingId,
      shipperName: data.shipperName,
      shipperAddress: data.shipperAddress,
      shipperContact: data.shipperContact || undefined,
      consigneeName: consigneeToOrder ? undefined : data.consigneeName || undefined,
      consigneeAddress: consigneeToOrder ? undefined : data.consigneeAddress || undefined,
      consigneeToOrder: consigneeToOrder,
      toOrderText: consigneeToOrder ? data.toOrderText || undefined : undefined,
      notifyPartyName: data.notifyPartyName || undefined,
      notifyPartyAddress: data.notifyPartyAddress || undefined,
      secondNotifyName: data.secondNotifyName || undefined,
      secondNotifyAddress: data.secondNotifyAddress || undefined,
      cargoDescription: data.cargoDescription,
      marksAndNumbers: data.marksAndNumbers || undefined,
      hsCode: data.hsCode || undefined,
      numberOfPackages: data.numberOfPackages || undefined,
      packageType: data.packageType || undefined,
      grossWeightKg: data.grossWeightKg || undefined,
      netWeightKg: data.netWeightKg || undefined,
      measurementCbm: data.measurementCbm || undefined,
      blTypeRequested: (data.blTypeRequested as BLType) || undefined,
      originalsRequired: data.originalsRequired || 3,
      copiesRequired: data.copiesRequired || 3,
      freightTerms: (data.freightTerms as FreightTerms) || 'prepaid',
      specialInstructions: data.specialInstructions || undefined,
      lcNumber: hasLCRequirements ? data.lcNumber || undefined : undefined,
      lcIssuingBank: hasLCRequirements ? data.lcIssuingBank || undefined : undefined,
      lcTerms: hasLCRequirements ? data.lcTerms || undefined : undefined,
      documentsRequired: documentsRequired,
    };

    if (onSaveDraft) {
      await onSaveDraft(formData);
    }
  };


  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Please fix the following errors:</p>
                <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="shipper" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Shipper
          </TabsTrigger>
          <TabsTrigger value="consignee" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Consignee
          </TabsTrigger>
          <TabsTrigger value="cargo" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Cargo
          </TabsTrigger>
          <TabsTrigger value="bl" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            B/L Request
          </TabsTrigger>
          <TabsTrigger value="lc" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            LC & Docs
          </TabsTrigger>
        </TabsList>

        {/* Shipper Tab */}
        <TabsContent value="shipper" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Reference</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bookingId">Freight Booking *</Label>
                <Select
                  value={watchedBookingId}
                  onValueChange={(value) => setValue('bookingId', value)}
                  disabled={isLoading || mode === 'edit'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select booking" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.bookingNumber} - {b.vesselName || 'TBN'} ({b.originPort?.portName} → {b.destinationPort?.portName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bookingId && (
                  <p className="text-sm text-destructive">{errors.bookingId.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipper Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipperName">Shipper Name *</Label>
                <Input
                  id="shipperName"
                  {...register('shipperName')}
                  placeholder="Shipper company name"
                  disabled={isLoading}
                />
                {errors.shipperName && (
                  <p className="text-sm text-destructive">{errors.shipperName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipperAddress">Shipper Address *</Label>
                <Textarea
                  id="shipperAddress"
                  {...register('shipperAddress')}
                  placeholder="Full shipper address"
                  rows={3}
                  disabled={isLoading}
                />
                {errors.shipperAddress && (
                  <p className="text-sm text-destructive">{errors.shipperAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipperContact">Shipper Contact</Label>
                <Input
                  id="shipperContact"
                  {...register('shipperContact')}
                  placeholder="Contact person / phone / email"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consignee Tab */}
        <TabsContent value="consignee" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Consignee</span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="consigneeToOrder" className="text-sm font-normal">
                    To Order
                  </Label>
                  <Switch
                    id="consigneeToOrder"
                    checked={consigneeToOrder}
                    onCheckedChange={(checked) => {
                      setConsigneeToOrder(checked);
                      setValue('consigneeToOrder', checked);
                    }}
                    disabled={isLoading}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {consigneeToOrder ? (
                <>
                  <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                    <p className="font-medium">TO ORDER</p>
                    <p className="text-sm">Consignee will be &quot;To Order&quot; - negotiable B/L</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="toOrderText">To Order Text (Optional)</Label>
                    <Input
                      id="toOrderText"
                      {...register('toOrderText')}
                      placeholder="e.g., To Order of [Bank Name]"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Specify if B/L should be &quot;To Order of&quot; a specific party
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="consigneeName">Consignee Name</Label>
                    <Input
                      id="consigneeName"
                      {...register('consigneeName')}
                      placeholder="Consignee company name"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consigneeAddress">Consignee Address</Label>
                    <Textarea
                      id="consigneeAddress"
                      {...register('consigneeAddress')}
                      placeholder="Full consignee address"
                      rows={3}
                      disabled={isLoading}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notify Party</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="notifyPartyName">Notify Party Name</Label>
                <Input
                  id="notifyPartyName"
                  {...register('notifyPartyName')}
                  placeholder="Notify party name"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notifyPartyAddress">Notify Party Address</Label>
                <Textarea
                  id="notifyPartyAddress"
                  {...register('notifyPartyAddress')}
                  placeholder="Full notify party address"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Second Notify Party (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="secondNotifyName">Second Notify Party Name</Label>
                <Input
                  id="secondNotifyName"
                  {...register('secondNotifyName')}
                  placeholder="Second notify party name"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondNotifyAddress">Second Notify Party Address</Label>
                <Textarea
                  id="secondNotifyAddress"
                  {...register('secondNotifyAddress')}
                  placeholder="Full second notify party address"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Cargo Tab */}
        <TabsContent value="cargo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cargo Description</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="cargoDescription">Description of Goods *</Label>
                <Textarea
                  id="cargoDescription"
                  {...register('cargoDescription')}
                  placeholder="Detailed description of cargo..."
                  rows={4}
                  disabled={isLoading}
                />
                {errors.cargoDescription && (
                  <p className="text-sm text-destructive">{errors.cargoDescription.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="marksAndNumbers">Marks & Numbers</Label>
                <Textarea
                  id="marksAndNumbers"
                  {...register('marksAndNumbers')}
                  placeholder="Shipping marks and numbers..."
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hsCode">HS Code</Label>
                <Input
                  id="hsCode"
                  {...register('hsCode')}
                  placeholder="e.g., 8429.52"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cargo Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="numberOfPackages">Number of Packages</Label>
                <Input
                  id="numberOfPackages"
                  type="number"
                  min="0"
                  {...register('numberOfPackages')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="packageType">Package Type</Label>
                <Input
                  id="packageType"
                  {...register('packageType')}
                  placeholder="e.g., Cartons, Pallets, Drums"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grossWeightKg">Gross Weight (kg)</Label>
                <Input
                  id="grossWeightKg"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('grossWeightKg')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="netWeightKg">Net Weight (kg)</Label>
                <Input
                  id="netWeightKg"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('netWeightKg')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="measurementCbm">Measurement (CBM)</Label>
                <Input
                  id="measurementCbm"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('measurementCbm')}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* B/L Request Tab */}
        <TabsContent value="bl" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>B/L Type Request</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="blTypeRequested">Requested B/L Type</Label>
                <Select
                  value={watchedBlTypeRequested || 'original'}
                  onValueChange={(value) => setValue('blTypeRequested', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select B/L type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {BL_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {watchedBlTypeRequested === 'original' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="originalsRequired">Number of Originals</Label>
                    <Input
                      id="originalsRequired"
                      type="number"
                      min="1"
                      max="10"
                      {...register('originalsRequired')}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">Default: 3 originals</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="copiesRequired">Number of Copies</Label>
                    <Input
                      id="copiesRequired"
                      type="number"
                      min="0"
                      max="10"
                      {...register('copiesRequired')}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">Non-negotiable copies</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Freight Terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="freightTerms">Freight Terms</Label>
                <Select
                  value={watch('freightTerms') || 'prepaid'}
                  onValueChange={(value) => setValue('freightTerms', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select freight terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {FREIGHT_TERMS.map((term) => (
                      <SelectItem key={term} value={term}>
                        {FREIGHT_TERMS_LABELS[term]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Special Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="specialInstructions">Special Instructions for B/L</Label>
                <Textarea
                  id="specialInstructions"
                  {...register('specialInstructions')}
                  placeholder="Any special instructions for the Bill of Lading..."
                  rows={4}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* LC & Documents Tab */}
        <TabsContent value="lc" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Letter of Credit Requirements
                </span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="hasLCRequirements" className="text-sm font-normal">
                    LC Required
                  </Label>
                  <Switch
                    id="hasLCRequirements"
                    checked={hasLCRequirements}
                    onCheckedChange={setHasLCRequirements}
                    disabled={isLoading}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hasLCRequirements ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lcNumber">LC Number</Label>
                    <Input
                      id="lcNumber"
                      {...register('lcNumber')}
                      placeholder="Letter of Credit number"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lcIssuingBank">Issuing Bank</Label>
                    <Input
                      id="lcIssuingBank"
                      {...register('lcIssuingBank')}
                      placeholder="Name of issuing bank"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="lcTerms">LC Terms & Conditions</Label>
                    <Textarea
                      id="lcTerms"
                      {...register('lcTerms')}
                      placeholder="Specific LC terms and conditions that must be met..."
                      rows={4}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Include any specific requirements from the LC that affect B/L preparation
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                  <p>No Letter of Credit requirements</p>
                  <p className="text-sm">Toggle the switch above if this shipment requires LC documentation</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Documents Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Select the documents required for this shipment. These will be tracked for completion.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {COMMON_DOCUMENTS.map((doc) => (
                  <div key={doc.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={doc.id}
                      checked={documentsRequired.includes(doc.id)}
                      onCheckedChange={(checked) => handleDocumentToggle(doc.id, checked as boolean)}
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor={doc.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {doc.label}
                    </Label>
                  </div>
                ))}
              </div>
              {documentsRequired.length > 0 && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    {documentsRequired.length} document{documentsRequired.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>

        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Draft'
              )}
            </Button>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              mode === 'create' ? 'Create SI' : 'Update SI'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
