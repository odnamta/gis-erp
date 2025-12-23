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
import { Loader2, Ship, Package, Users, FileText, AlertTriangle } from 'lucide-react';
import { ContainerManager } from './container-manager';
import { RateLookup } from './rate-lookup';
import {
  BookingFormData,
  BookingContainer,
  FreightCalculation,
  ShippingLine,
  Port,
  COMMODITY_TYPES,
  COMMODITY_TYPE_LABELS,
  INCOTERMS,
  FREIGHT_TERMS,
  FREIGHT_TERMS_LABELS,
  CommodityType,
  Incoterm,
  FreightTerms,
} from '@/types/agency';

// Dangerous goods schema
const dangerousGoodsSchema = z.object({
  unNumber: z.string().min(1, 'UN Number is required'),
  class: z.string().min(1, 'Class is required'),
  packingGroup: z.string().optional(),
  properShippingName: z.string().min(1, 'Proper shipping name is required'),
});

// Main form schema
export const bookingSchema = z.object({
  jobOrderId: z.string().optional(),
  quotationId: z.string().optional(),
  customerId: z.string().optional(),
  shippingLineId: z.string().min(1, 'Shipping line is required'),
  carrierBookingNumber: z.string().optional(),
  originPortId: z.string().min(1, 'Origin port is required'),
  destinationPortId: z.string().min(1, 'Destination port is required'),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  etd: z.string().optional(),
  eta: z.string().optional(),
  cutoffDate: z.string().optional(),
  cutoffTime: z.string().optional(),
  siCutoff: z.string().optional(),
  cargoDescription: z.string().min(1, 'Cargo description is required'),
  hsCode: z.string().optional(),
  commodityType: z.string().min(1, 'Commodity type is required'),
  packagesCount: z.coerce.number().min(0).optional(),
  grossWeightKg: z.coerce.number().min(0).optional(),
  volumeCbm: z.coerce.number().min(0).optional(),
  cargoLengthM: z.coerce.number().min(0).optional(),
  cargoWidthM: z.coerce.number().min(0).optional(),
  cargoHeightM: z.coerce.number().min(0).optional(),
  shipperName: z.string().optional(),
  shipperAddress: z.string().optional(),
  consigneeName: z.string().optional(),
  consigneeAddress: z.string().optional(),
  notifyParty: z.string().optional(),
  notifyAddress: z.string().optional(),
  incoterm: z.string().optional(),
  freightTerms: z.string().optional(),
  freightRate: z.coerce.number().min(0).optional(),
  freightCurrency: z.string().optional(),
  totalFreight: z.coerce.number().min(0).optional(),
  specialRequirements: z.string().optional(),
  hasDangerousGoods: z.boolean().optional(),
  dangerousGoods: dangerousGoodsSchema.optional().nullable(),
  notes: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  booking?: BookingFormData | null;
  containers?: BookingContainer[];
  shippingLines: ShippingLine[];
  ports: Port[];
  customers?: { id: string; name: string }[];
  jobOrders?: { id: string; joNumber: string }[];
  onSubmit: (data: BookingFormData, containers: BookingContainer[]) => Promise<void>;
  onSaveDraft?: (data: BookingFormData, containers: BookingContainer[]) => Promise<void>;
  isLoading: boolean;
  mode: 'create' | 'edit';
}

export function BookingForm({
  booking,
  containers: initialContainers,
  shippingLines,
  ports,
  customers,
  jobOrders,
  onSubmit,
  onSaveDraft,
  isLoading,
  mode,
}: BookingFormProps) {
  const [containers, setContainers] = useState<BookingContainer[]>(initialContainers || []);
  const [activeTab, setActiveTab] = useState('booking');
  const [hasDangerousGoods, setHasDangerousGoods] = useState(!!booking?.dangerousGoods);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema) as never,
    defaultValues: {
      jobOrderId: booking?.jobOrderId || '',
      quotationId: booking?.quotationId || '',
      customerId: booking?.customerId || '',
      shippingLineId: booking?.shippingLineId || '',
      carrierBookingNumber: booking?.carrierBookingNumber || '',
      originPortId: booking?.originPortId || '',
      destinationPortId: booking?.destinationPortId || '',
      vesselName: booking?.vesselName || '',
      voyageNumber: booking?.voyageNumber || '',
      etd: booking?.etd || '',
      eta: booking?.eta || '',
      cutoffDate: booking?.cutoffDate || '',
      cutoffTime: booking?.cutoffTime || '',
      siCutoff: booking?.siCutoff || '',
      cargoDescription: booking?.cargoDescription || '',
      hsCode: booking?.hsCode || '',
      commodityType: booking?.commodityType || 'general',
      packagesCount: booking?.packagesCount || undefined,
      grossWeightKg: booking?.grossWeightKg || undefined,
      volumeCbm: booking?.volumeCbm || undefined,
      cargoLengthM: booking?.cargoLengthM || undefined,
      cargoWidthM: booking?.cargoWidthM || undefined,
      cargoHeightM: booking?.cargoHeightM || undefined,
      shipperName: booking?.shipperName || '',
      shipperAddress: booking?.shipperAddress || '',
      consigneeName: booking?.consigneeName || '',
      consigneeAddress: booking?.consigneeAddress || '',
      notifyParty: booking?.notifyParty || '',
      notifyAddress: booking?.notifyAddress || '',
      incoterm: booking?.incoterm || '',
      freightTerms: booking?.freightTerms || 'prepaid',
      freightRate: booking?.freightRate || undefined,
      freightCurrency: booking?.freightCurrency || 'USD',
      totalFreight: booking?.totalFreight || undefined,
      specialRequirements: booking?.specialRequirements || '',
      hasDangerousGoods: !!booking?.dangerousGoods,
      dangerousGoods: booking?.dangerousGoods || null,
      notes: booking?.notes || '',
    },
  });

  const watchedShippingLineId = watch('shippingLineId');
  const watchedOriginPortId = watch('originPortId');
  const watchedDestinationPortId = watch('destinationPortId');
  const watchedCommodityType = watch('commodityType');

  useEffect(() => {
    if (watchedCommodityType === 'dangerous') {
      setHasDangerousGoods(true);
    }
  }, [watchedCommodityType]);

  const handleRateSelect = (calculation: FreightCalculation) => {
    setValue('totalFreight', calculation.totalFreight);
    setValue('freightCurrency', calculation.currency);
  };

  const handleFormSubmit = async (data: BookingFormValues) => {
    const formData: BookingFormData = {
      ...data,
      commodityType: data.commodityType as CommodityType,
      incoterm: data.incoterm as Incoterm | undefined,
      freightTerms: data.freightTerms as FreightTerms | undefined,
      dangerousGoods: hasDangerousGoods && data.dangerousGoods ? data.dangerousGoods : undefined,
    };
    await onSubmit(formData, containers);
  };

  const handleSaveDraft = async () => {
    const data = watch();
    const formData: BookingFormData = {
      ...data,
      commodityType: data.commodityType as CommodityType,
      incoterm: data.incoterm as Incoterm | undefined,
      freightTerms: data.freightTerms as FreightTerms | undefined,
      dangerousGoods: hasDangerousGoods && data.dangerousGoods ? data.dangerousGoods : undefined,
    };
    if (onSaveDraft) {
      await onSaveDraft(formData, containers);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Booking
          </TabsTrigger>
          <TabsTrigger value="cargo" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Cargo
          </TabsTrigger>
          <TabsTrigger value="parties" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Parties
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Terms
          </TabsTrigger>
        </TabsList>

        {/* Booking Details Tab */}
        <TabsContent value="booking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shippingLineId">Shipping Line *</Label>
                <Select
                  value={watchedShippingLineId}
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
                <Label htmlFor="carrierBookingNumber">Carrier Booking Number</Label>
                <Input
                  id="carrierBookingNumber"
                  {...register('carrierBookingNumber')}
                  placeholder="Carrier's booking reference"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="originPortId">Origin Port *</Label>
                <Select
                  value={watchedOriginPortId}
                  onValueChange={(value) => setValue('originPortId', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select origin port" />
                  </SelectTrigger>
                  <SelectContent>
                    {ports.map((port) => (
                      <SelectItem key={port.id} value={port.id}>
                        {port.portName} ({port.portCode})
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
                  value={watchedDestinationPortId}
                  onValueChange={(value) => setValue('destinationPortId', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination port" />
                  </SelectTrigger>
                  <SelectContent>
                    {ports.map((port) => (
                      <SelectItem key={port.id} value={port.id}>
                        {port.portName} ({port.portCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.destinationPortId && (
                  <p className="text-sm text-destructive">{errors.destinationPortId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vesselName">Vessel Name</Label>
                <Input
                  id="vesselName"
                  {...register('vesselName')}
                  placeholder="e.g., MSC OSCAR"
                  disabled={isLoading}
                />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="etd">ETD (Estimated Departure)</Label>
                <Input
                  id="etd"
                  type="date"
                  {...register('etd')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eta">ETA (Estimated Arrival)</Label>
                <Input
                  id="eta"
                  type="date"
                  {...register('eta')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cutoffDate">Cutoff Date</Label>
                <Input
                  id="cutoffDate"
                  type="date"
                  {...register('cutoffDate')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cutoffTime">Cutoff Time</Label>
                <Input
                  id="cutoffTime"
                  type="time"
                  {...register('cutoffTime')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siCutoff">SI Cutoff</Label>
                <Input
                  id="siCutoff"
                  type="datetime-local"
                  {...register('siCutoff')}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Link to Job Order / Customer */}
          <Card>
            <CardHeader>
              <CardTitle>Linked Records</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {customers && customers.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="customerId">Customer</Label>
                  <Select
                    value={watch('customerId') || ''}
                    onValueChange={(value) => setValue('customerId', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {jobOrders && jobOrders.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="jobOrderId">Job Order</Label>
                  <Select
                    value={watch('jobOrderId') || ''}
                    onValueChange={(value) => setValue('jobOrderId', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select job order" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobOrders.map((jo) => (
                        <SelectItem key={jo.id} value={jo.id}>
                          {jo.joNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cargo Tab */}
        <TabsContent value="cargo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cargo Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cargoDescription">Cargo Description *</Label>
                <Textarea
                  id="cargoDescription"
                  {...register('cargoDescription')}
                  placeholder="Describe the cargo..."
                  rows={3}
                  disabled={isLoading}
                />
                {errors.cargoDescription && (
                  <p className="text-sm text-destructive">{errors.cargoDescription.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="commodityType">Commodity Type *</Label>
                <Select
                  value={watchedCommodityType}
                  onValueChange={(value) => setValue('commodityType', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select commodity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMODITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {COMMODITY_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.commodityType && (
                  <p className="text-sm text-destructive">{errors.commodityType.message}</p>
                )}
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

              <div className="space-y-2">
                <Label htmlFor="packagesCount">Number of Packages</Label>
                <Input
                  id="packagesCount"
                  type="number"
                  min="0"
                  {...register('packagesCount')}
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
                <Label htmlFor="volumeCbm">Volume (CBM)</Label>
                <Input
                  id="volumeCbm"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('volumeCbm')}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cargo Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle>Cargo Dimensions (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cargoLengthM">Length (m)</Label>
                <Input
                  id="cargoLengthM"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('cargoLengthM')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargoWidthM">Width (m)</Label>
                <Input
                  id="cargoWidthM"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('cargoWidthM')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargoHeightM">Height (m)</Label>
                <Input
                  id="cargoHeightM"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('cargoHeightM')}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dangerous Goods */}
          {(watchedCommodityType === 'dangerous' || hasDangerousGoods) && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                  Dangerous Goods Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Contains Dangerous Goods</Label>
                    <p className="text-sm text-muted-foreground">
                      Toggle if cargo contains hazardous materials
                    </p>
                  </div>
                  <Switch
                    checked={hasDangerousGoods}
                    onCheckedChange={setHasDangerousGoods}
                    disabled={isLoading || watchedCommodityType === 'dangerous'}
                  />
                </div>

                {hasDangerousGoods && (
                  <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="dgUnNumber">UN Number *</Label>
                      <Input
                        id="dgUnNumber"
                        {...register('dangerousGoods.unNumber')}
                        placeholder="e.g., UN1234"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dgClass">Class *</Label>
                      <Input
                        id="dgClass"
                        {...register('dangerousGoods.class')}
                        placeholder="e.g., 3"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dgPackingGroup">Packing Group</Label>
                      <Input
                        id="dgPackingGroup"
                        {...register('dangerousGoods.packingGroup')}
                        placeholder="e.g., II"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="dgProperShippingName">Proper Shipping Name *</Label>
                      <Input
                        id="dgProperShippingName"
                        {...register('dangerousGoods.properShippingName')}
                        placeholder="e.g., FLAMMABLE LIQUID, N.O.S."
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Container Manager */}
          <Card>
            <CardHeader>
              <CardTitle>Containers</CardTitle>
            </CardHeader>
            <CardContent>
              <ContainerManager
                containers={containers}
                onChange={setContainers}
                disabled={isLoading}
              />
            </CardContent>
          </Card>

          {/* Rate Lookup */}
          {watchedOriginPortId && watchedDestinationPortId && (
            <Card>
              <CardHeader>
                <CardTitle>Freight Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <RateLookup
                  originPortId={watchedOriginPortId}
                  destinationPortId={watchedDestinationPortId}
                  shippingLineId={watchedShippingLineId}
                  containers={containers}
                  onRateSelect={handleRateSelect}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipper</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shipperName">Shipper Name</Label>
                <Input
                  id="shipperName"
                  {...register('shipperName')}
                  placeholder="Shipper company name"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="shipperAddress">Shipper Address</Label>
                <Textarea
                  id="shipperAddress"
                  {...register('shipperAddress')}
                  placeholder="Full shipper address"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consignee</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="consigneeName">Consignee Name</Label>
                <Input
                  id="consigneeName"
                  {...register('consigneeName')}
                  placeholder="Consignee company name"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="consigneeAddress">Consignee Address</Label>
                <Textarea
                  id="consigneeAddress"
                  {...register('consigneeAddress')}
                  placeholder="Full consignee address"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notify Party</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="notifyParty">Notify Party Name</Label>
                <Input
                  id="notifyParty"
                  {...register('notifyParty')}
                  placeholder="Notify party name"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notifyAddress">Notify Party Address</Label>
                <Textarea
                  id="notifyAddress"
                  {...register('notifyAddress')}
                  placeholder="Full notify party address"
                  rows={2}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Terms Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trade Terms</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="incoterm">Incoterm</Label>
                <Select
                  value={watch('incoterm') || ''}
                  onValueChange={(value) => setValue('incoterm', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select incoterm" />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOTERMS.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
              <CardTitle>Freight Charges</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="freightRate">Freight Rate</Label>
                <Input
                  id="freightRate"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('freightRate')}
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

              <div className="space-y-2">
                <Label htmlFor="totalFreight">Total Freight</Label>
                <Input
                  id="totalFreight"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('totalFreight')}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Special Requirements & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="specialRequirements">Special Requirements</Label>
                <Textarea
                  id="specialRequirements"
                  {...register('specialRequirements')}
                  placeholder="Any special handling requirements..."
                  rows={3}
                  disabled={isLoading}
                />
              </div>

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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit Buttons */}
      <div className="flex gap-4 justify-end">
        {onSaveDraft && (
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isLoading}
          >
            Save as Draft
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : mode === 'edit' ? (
            'Update Booking'
          ) : (
            'Submit Booking Request'
          )}
        </Button>
      </div>
    </form>
  );
}
