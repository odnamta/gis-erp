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
import { Loader2, Ship, Package, Users, FileText, AlertCircle } from 'lucide-react';
import { ContainerDetailsEditor } from './container-details-editor';
import {
  BLFormData,
  BLContainer,
  BLType,
  FreightTerms,
  FreightBooking,
  ShippingLine,
  BL_TYPES,
  BL_TYPE_LABELS,
  FREIGHT_TERMS,
  FREIGHT_TERMS_LABELS,
} from '@/types/agency';
import { validateBLData } from '@/lib/bl-documentation-utils';

// Form validation schema
export const blFormSchema = z.object({
  bookingId: z.string().min(1, 'A freight booking must be selected'),
  jobOrderId: z.string().optional(),
  blType: z.string().min(1, 'B/L type is required'),
  originalCount: z.coerce.number().min(1).max(10).optional(),
  shippingLineId: z.string().optional(),
  carrierBlNumber: z.string().optional(),
  vesselName: z.string().min(1, 'Vessel name is required'),
  voyageNumber: z.string().optional(),
  flag: z.string().optional(),
  portOfLoading: z.string().min(1, 'Port of loading is required'),
  portOfDischarge: z.string().min(1, 'Port of discharge is required'),
  placeOfReceipt: z.string().optional(),
  placeOfDelivery: z.string().optional(),
  shippedOnBoardDate: z.string().optional(),
  blDate: z.string().optional(),
  shipperName: z.string().min(1, 'Shipper name is required'),
  shipperAddress: z.string().optional(),
  consigneeName: z.string().optional(),
  consigneeAddress: z.string().optional(),
  consigneeToOrder: z.boolean().optional(),
  notifyPartyName: z.string().optional(),
  notifyPartyAddress: z.string().optional(),
  cargoDescription: z.string().min(1, 'Cargo description is required'),
  marksAndNumbers: z.string().optional(),
  numberOfPackages: z.coerce.number().min(0).optional(),
  packageType: z.string().optional(),
  grossWeightKg: z.coerce.number().min(0).optional(),
  measurementCbm: z.coerce.number().min(0).optional(),
  freightTerms: z.string().optional(),
  freightAmount: z.coerce.number().min(0).optional(),
  freightCurrency: z.string().optional(),
  remarks: z.string().optional(),
});

export type BLFormValues = z.infer<typeof blFormSchema>;

interface BLFormProps {
  booking?: FreightBooking | null;
  initialData?: BLFormData | null;
  shippingLines: ShippingLine[];
  bookings: FreightBooking[];
  onSubmit: (data: BLFormData) => Promise<void>;
  onSaveDraft?: (data: BLFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  mode: 'create' | 'edit';
}


export function BLForm({
  booking,
  initialData,
  shippingLines,
  bookings,
  onSubmit,
  onSaveDraft,
  onCancel,
  isLoading,
  mode,
}: BLFormProps) {
  const [containers, setContainers] = useState<BLContainer[]>(initialData?.containers || []);
  const [activeTab, setActiveTab] = useState('shipping');
  const [consigneeToOrder, setConsigneeToOrder] = useState(initialData?.consigneeToOrder || false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get initial booking data
  const selectedBooking = booking || bookings.find(b => b.id === initialData?.bookingId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BLFormValues>({
    resolver: zodResolver(blFormSchema) as never,
    defaultValues: {
      bookingId: initialData?.bookingId || booking?.id || '',
      jobOrderId: initialData?.jobOrderId || booking?.jobOrderId || '',
      blType: initialData?.blType || 'original',
      originalCount: initialData?.originalCount || 3,
      shippingLineId: initialData?.shippingLineId || booking?.shippingLineId || '',
      carrierBlNumber: initialData?.carrierBlNumber || '',
      vesselName: initialData?.vesselName || booking?.vesselName || '',
      voyageNumber: initialData?.voyageNumber || booking?.voyageNumber || '',
      flag: initialData?.flag || '',
      portOfLoading: initialData?.portOfLoading || booking?.originPort?.portName || '',
      portOfDischarge: initialData?.portOfDischarge || booking?.destinationPort?.portName || '',
      placeOfReceipt: initialData?.placeOfReceipt || '',
      placeOfDelivery: initialData?.placeOfDelivery || '',
      shippedOnBoardDate: initialData?.shippedOnBoardDate || '',
      blDate: initialData?.blDate || '',
      shipperName: initialData?.shipperName || booking?.shipperName || '',
      shipperAddress: initialData?.shipperAddress || booking?.shipperAddress || '',
      consigneeName: initialData?.consigneeName || booking?.consigneeName || '',
      consigneeAddress: initialData?.consigneeAddress || booking?.consigneeAddress || '',
      consigneeToOrder: initialData?.consigneeToOrder || false,
      notifyPartyName: initialData?.notifyPartyName || booking?.notifyParty || '',
      notifyPartyAddress: initialData?.notifyPartyAddress || booking?.notifyAddress || '',
      cargoDescription: initialData?.cargoDescription || booking?.cargoDescription || '',
      marksAndNumbers: initialData?.marksAndNumbers || '',
      numberOfPackages: initialData?.numberOfPackages || booking?.packagesCount || undefined,
      packageType: initialData?.packageType || '',
      grossWeightKg: initialData?.grossWeightKg || booking?.grossWeightKg || undefined,
      measurementCbm: initialData?.measurementCbm || booking?.volumeCbm || undefined,
      freightTerms: initialData?.freightTerms || booking?.freightTerms || 'prepaid',
      freightAmount: initialData?.freightAmount || booking?.totalFreight || undefined,
      freightCurrency: initialData?.freightCurrency || booking?.freightCurrency || 'USD',
      remarks: initialData?.remarks || '',
    },
  });

  const watchedBookingId = watch('bookingId');
  const watchedBlType = watch('blType');
  const watchedShippingLineId = watch('shippingLineId');

  // Update form when booking selection changes
  useEffect(() => {
    if (watchedBookingId && mode === 'create') {
      const selected = bookings.find(b => b.id === watchedBookingId);
      if (selected) {
        setValue('vesselName', selected.vesselName || '');
        setValue('voyageNumber', selected.voyageNumber || '');
        setValue('portOfLoading', selected.originPort?.portName || '');
        setValue('portOfDischarge', selected.destinationPort?.portName || '');
        setValue('shipperName', selected.shipperName || '');
        setValue('shipperAddress', selected.shipperAddress || '');
        setValue('consigneeName', selected.consigneeName || '');
        setValue('consigneeAddress', selected.consigneeAddress || '');
        setValue('notifyPartyName', selected.notifyParty || '');
        setValue('notifyPartyAddress', selected.notifyAddress || '');
        setValue('cargoDescription', selected.cargoDescription || '');
        setValue('numberOfPackages', selected.packagesCount || undefined);
        setValue('grossWeightKg', selected.grossWeightKg || undefined);
        setValue('measurementCbm', selected.volumeCbm || undefined);
        setValue('freightTerms', selected.freightTerms || 'prepaid');
        setValue('freightAmount', selected.totalFreight || undefined);
        setValue('freightCurrency', selected.freightCurrency || 'USD');
        setValue('shippingLineId', selected.shippingLineId || '');
      }
    }
  }, [watchedBookingId, bookings, mode, setValue]);

  const handleFormSubmit = async (data: BLFormValues) => {
    setValidationErrors([]);

    const formData: BLFormData = {
      bookingId: data.bookingId,
      jobOrderId: data.jobOrderId || undefined,
      blType: data.blType as BLType,
      originalCount: data.originalCount,
      shippingLineId: data.shippingLineId || undefined,
      carrierBlNumber: data.carrierBlNumber || undefined,
      vesselName: data.vesselName,
      voyageNumber: data.voyageNumber || undefined,
      flag: data.flag || undefined,
      portOfLoading: data.portOfLoading,
      portOfDischarge: data.portOfDischarge,
      placeOfReceipt: data.placeOfReceipt || undefined,
      placeOfDelivery: data.placeOfDelivery || undefined,
      shippedOnBoardDate: data.shippedOnBoardDate || undefined,
      blDate: data.blDate || undefined,
      shipperName: data.shipperName,
      shipperAddress: data.shipperAddress || undefined,
      consigneeName: consigneeToOrder ? undefined : data.consigneeName || undefined,
      consigneeAddress: consigneeToOrder ? undefined : data.consigneeAddress || undefined,
      consigneeToOrder: consigneeToOrder,
      notifyPartyName: data.notifyPartyName || undefined,
      notifyPartyAddress: data.notifyPartyAddress || undefined,
      cargoDescription: data.cargoDescription,
      marksAndNumbers: data.marksAndNumbers || undefined,
      numberOfPackages: data.numberOfPackages || undefined,
      packageType: data.packageType || undefined,
      grossWeightKg: data.grossWeightKg || undefined,
      measurementCbm: data.measurementCbm || undefined,
      containers: containers,
      freightTerms: (data.freightTerms as FreightTerms) || 'prepaid',
      freightAmount: data.freightAmount || undefined,
      freightCurrency: data.freightCurrency || 'USD',
      remarks: data.remarks || undefined,
    };

    // Validate using utility function
    const validation = validateBLData(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors.map(e => e.message));
      return;
    }

    await onSubmit(formData);
  };

  const handleSaveDraft = async () => {
    const data = watch();
    const formData: BLFormData = {
      bookingId: data.bookingId,
      jobOrderId: data.jobOrderId || undefined,
      blType: data.blType as BLType,
      originalCount: data.originalCount,
      shippingLineId: data.shippingLineId || undefined,
      carrierBlNumber: data.carrierBlNumber || undefined,
      vesselName: data.vesselName,
      voyageNumber: data.voyageNumber || undefined,
      flag: data.flag || undefined,
      portOfLoading: data.portOfLoading,
      portOfDischarge: data.portOfDischarge,
      placeOfReceipt: data.placeOfReceipt || undefined,
      placeOfDelivery: data.placeOfDelivery || undefined,
      shippedOnBoardDate: data.shippedOnBoardDate || undefined,
      blDate: data.blDate || undefined,
      shipperName: data.shipperName,
      shipperAddress: data.shipperAddress || undefined,
      consigneeName: consigneeToOrder ? undefined : data.consigneeName || undefined,
      consigneeAddress: consigneeToOrder ? undefined : data.consigneeAddress || undefined,
      consigneeToOrder: consigneeToOrder,
      notifyPartyName: data.notifyPartyName || undefined,
      notifyPartyAddress: data.notifyPartyAddress || undefined,
      cargoDescription: data.cargoDescription,
      marksAndNumbers: data.marksAndNumbers || undefined,
      numberOfPackages: data.numberOfPackages || undefined,
      packageType: data.packageType || undefined,
      grossWeightKg: data.grossWeightKg || undefined,
      measurementCbm: data.measurementCbm || undefined,
      containers: containers,
      freightTerms: (data.freightTerms as FreightTerms) || 'prepaid',
      freightAmount: data.freightAmount || undefined,
      freightCurrency: data.freightCurrency || 'USD',
      remarks: data.remarks || undefined,
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="parties" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Parties
          </TabsTrigger>
          <TabsTrigger value="cargo" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Cargo
          </TabsTrigger>
          <TabsTrigger value="terms" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Terms
          </TabsTrigger>
        </TabsList>

        {/* Shipping Details Tab */}
        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Reference</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
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
                        {b.bookingNumber} - {b.vesselName || 'TBN'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bookingId && (
                  <p className="text-sm text-destructive">{errors.bookingId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingLineId">Shipping Line</Label>
                <Select
                  value={watchedShippingLineId || ''}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="carrierBlNumber">Carrier B/L Number</Label>
                <Input
                  id="carrierBlNumber"
                  {...register('carrierBlNumber')}
                  placeholder="Carrier's B/L reference"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>B/L Type</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="blType">B/L Type *</Label>
                <Select
                  value={watchedBlType}
                  onValueChange={(value) => setValue('blType', value)}
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
                {errors.blType && (
                  <p className="text-sm text-destructive">{errors.blType.message}</p>
                )}
              </div>

              {watchedBlType === 'original' && (
                <div className="space-y-2">
                  <Label htmlFor="originalCount">Number of Originals</Label>
                  <Input
                    id="originalCount"
                    type="number"
                    min="1"
                    max="10"
                    {...register('originalCount')}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">Default: 3 originals</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vessel & Voyage</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="vesselName">Vessel Name *</Label>
                <Input
                  id="vesselName"
                  {...register('vesselName')}
                  placeholder="e.g., MSC OSCAR"
                  disabled={isLoading}
                />
                {errors.vesselName && (
                  <p className="text-sm text-destructive">{errors.vesselName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="voyageNumber">Voyage Number</Label>
                <Input
                  id="voyageNumber"
                  {...register('voyageNumber')}
                  placeholder="e.g., 123E"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flag">Flag</Label>
                <Input
                  id="flag"
                  {...register('flag')}
                  placeholder="e.g., Panama"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ports & Places</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="portOfLoading">Port of Loading *</Label>
                <Input
                  id="portOfLoading"
                  {...register('portOfLoading')}
                  placeholder="e.g., Jakarta, Indonesia"
                  disabled={isLoading}
                />
                {errors.portOfLoading && (
                  <p className="text-sm text-destructive">{errors.portOfLoading.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="portOfDischarge">Port of Discharge *</Label>
                <Input
                  id="portOfDischarge"
                  {...register('portOfDischarge')}
                  placeholder="e.g., Singapore"
                  disabled={isLoading}
                />
                {errors.portOfDischarge && (
                  <p className="text-sm text-destructive">{errors.portOfDischarge.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="placeOfReceipt">Place of Receipt</Label>
                <Input
                  id="placeOfReceipt"
                  {...register('placeOfReceipt')}
                  placeholder="Origin location"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="placeOfDelivery">Place of Delivery</Label>
                <Input
                  id="placeOfDelivery"
                  {...register('placeOfDelivery')}
                  placeholder="Final destination"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shippedOnBoardDate">Shipped on Board Date</Label>
                <Input
                  id="shippedOnBoardDate"
                  type="date"
                  {...register('shippedOnBoardDate')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blDate">B/L Date</Label>
                <Input
                  id="blDate"
                  type="date"
                  {...register('blDate')}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipper</CardTitle>
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
                <Label htmlFor="shipperAddress">Shipper Address</Label>
                <Textarea
                  id="shipperAddress"
                  {...register('shipperAddress')}
                  placeholder="Full shipper address"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

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
                <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                  <p className="font-medium">TO ORDER</p>
                  <p className="text-sm">Consignee will be &quot;To Order&quot; - negotiable B/L</p>
                </div>
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

          {/* Container Details Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Container Details</CardTitle>
            </CardHeader>
            <CardContent>
              <ContainerDetailsEditor
                containers={containers}
                onChange={setContainers}
                readOnly={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Terms Tab */}
        <TabsContent value="terms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Freight Terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="freightTerms">Freight Terms</Label>
                <Select
                  value={watch('freightTerms') || 'prepaid'}
                  onValueChange={(value) => setValue('freightTerms', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select terms" />
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

              <div className="space-y-2">
                <Label htmlFor="freightAmount">Freight Amount</Label>
                <Input
                  id="freightAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('freightAmount')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="freightCurrency">Currency</Label>
                <Select
                  value={watch('freightCurrency') || 'USD'}
                  onValueChange={(value) => setValue('freightCurrency', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="IDR">IDR</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Remarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="remarks">Additional Remarks</Label>
                <Textarea
                  id="remarks"
                  {...register('remarks')}
                  placeholder="Any additional remarks or special instructions..."
                  rows={4}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        {onSaveDraft && mode === 'create' && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save as Draft'
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
            mode === 'create' ? 'Create B/L' : 'Update B/L'
          )}
        </Button>
      </div>
    </form>
  );
}
