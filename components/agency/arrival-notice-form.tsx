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
import { Loader2, Ship, Package, MapPin, Clock, DollarSign, AlertCircle, Plus, Trash2 } from 'lucide-react';
import {
  ArrivalNoticeFormData,
  BillOfLading,
  EstimatedCharge,
} from '@/types/agency';
import { validateArrivalNoticeData, calculateFreeTimeExpiry } from '@/lib/bl-documentation-utils';

// Common charge types for arrival notices
const COMMON_CHARGE_TYPES = [
  'Terminal Handling',
  'Storage',
  'Demurrage',
  'Documentation',
  'Customs Clearance',
  'Delivery Order',
  'Port Charges',
  'Agency Fee',
  'Other',
];

// Common currencies
const CURRENCIES = ['USD', 'IDR', 'SGD', 'EUR'];

// Form validation schema
export const arrivalNoticeFormSchema = z.object({
  blId: z.string().min(1, 'A Bill of Lading must be selected'),
  bookingId: z.string().optional(),
  vesselName: z.string().min(1, 'Vessel name is required'),
  voyageNumber: z.string().optional(),
  eta: z.string().min(1, 'ETA is required'),
  ata: z.string().optional(),
  portOfDischarge: z.string().min(1, 'Port of discharge is required'),
  terminal: z.string().optional(),
  berth: z.string().optional(),
  cargoDescription: z.string().optional(),
  freeTimeDays: z.coerce.number().min(0).max(90).optional(),
  deliveryInstructions: z.string().optional(),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

export type ArrivalNoticeFormValues = z.infer<typeof arrivalNoticeFormSchema>;

interface ArrivalNoticeFormProps {
  bl?: BillOfLading | null;
  initialData?: ArrivalNoticeFormData | null;
  billsOfLading: BillOfLading[];
  onSubmit: (data: ArrivalNoticeFormData) => Promise<void>;
  onSaveDraft?: (data: ArrivalNoticeFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  mode: 'create' | 'edit';
}


/**
 * Arrival Notice Form Component
 * Form for creating/editing arrival notices with charges editor and delivery instructions.
 * Per Requirements 3.1, 3.2, 3.3
 */
export function ArrivalNoticeForm({
  bl,
  initialData,
  billsOfLading,
  onSubmit,
  onSaveDraft,
  onCancel,
  isLoading,
  mode,
}: ArrivalNoticeFormProps) {
  const [activeTab, setActiveTab] = useState('vessel');
  const [containerNumbers, setContainerNumbers] = useState<string[]>(initialData?.containerNumbers || []);
  const [estimatedCharges, setEstimatedCharges] = useState<EstimatedCharge[]>(initialData?.estimatedCharges || []);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [newContainerNumber, setNewContainerNumber] = useState('');
  const [calculatedFreeTimeExpiry, setCalculatedFreeTimeExpiry] = useState<string | null>(null);

  // Get initial B/L data
  const selectedBL = bl || billsOfLading.find(b => b.id === initialData?.blId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ArrivalNoticeFormValues>({
    resolver: zodResolver(arrivalNoticeFormSchema) as never,
    defaultValues: {
      blId: initialData?.blId || bl?.id || '',
      bookingId: initialData?.bookingId || bl?.bookingId || '',
      vesselName: initialData?.vesselName || bl?.vesselName || '',
      voyageNumber: initialData?.voyageNumber || bl?.voyageNumber || '',
      eta: initialData?.eta || '',
      ata: initialData?.ata || '',
      portOfDischarge: initialData?.portOfDischarge || bl?.portOfDischarge || '',
      terminal: initialData?.terminal || '',
      berth: initialData?.berth || '',
      cargoDescription: initialData?.cargoDescription || bl?.cargoDescription || '',
      freeTimeDays: initialData?.freeTimeDays || 7,
      deliveryInstructions: initialData?.deliveryInstructions || '',
      deliveryAddress: initialData?.deliveryAddress || '',
      notes: initialData?.notes || '',
    },
  });

  const watchedBlId = watch('blId');
  const watchedEta = watch('eta');
  const watchedFreeTimeDays = watch('freeTimeDays');

  // Update form when B/L selection changes
  useEffect(() => {
    if (watchedBlId && mode === 'create') {
      const selected = billsOfLading.find(b => b.id === watchedBlId);
      if (selected) {
        setValue('vesselName', selected.vesselName || '');
        setValue('voyageNumber', selected.voyageNumber || '');
        setValue('portOfDischarge', selected.portOfDischarge || '');
        setValue('cargoDescription', selected.cargoDescription || '');
        setValue('bookingId', selected.bookingId || '');
        // Set container numbers from B/L
        if (selected.containers && selected.containers.length > 0) {
          setContainerNumbers(selected.containers.map(c => c.containerNo));
        }
      }
    }
  }, [watchedBlId, billsOfLading, mode, setValue]);

  // Calculate free time expiry when ETA or free time days change
  useEffect(() => {
    if (watchedEta && watchedFreeTimeDays) {
      const expiry = calculateFreeTimeExpiry(watchedEta, watchedFreeTimeDays);
      setCalculatedFreeTimeExpiry(expiry);
    } else {
      setCalculatedFreeTimeExpiry(null);
    }
  }, [watchedEta, watchedFreeTimeDays]);

  // Container number management
  const handleAddContainer = () => {
    if (newContainerNumber.trim()) {
      setContainerNumbers(prev => [...prev, newContainerNumber.trim().toUpperCase()]);
      setNewContainerNumber('');
    }
  };

  const handleRemoveContainer = (index: number) => {
    setContainerNumbers(prev => prev.filter((_, i) => i !== index));
  };

  // Estimated charges management
  const handleAddCharge = () => {
    setEstimatedCharges(prev => [
      ...prev,
      { chargeType: '', amount: 0, currency: 'USD' },
    ]);
  };

  const handleUpdateCharge = (index: number, field: keyof EstimatedCharge, value: string | number) => {
    setEstimatedCharges(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveCharge = (index: number) => {
    setEstimatedCharges(prev => prev.filter((_, i) => i !== index));
  };

  const getTotalCharges = () => {
    return estimatedCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0);
  };

  const handleFormSubmit = async (data: ArrivalNoticeFormValues) => {
    setValidationErrors([]);

    const formData: ArrivalNoticeFormData = {
      blId: data.blId,
      bookingId: data.bookingId || undefined,
      vesselName: data.vesselName,
      voyageNumber: data.voyageNumber || undefined,
      eta: data.eta,
      ata: data.ata || undefined,
      portOfDischarge: data.portOfDischarge,
      terminal: data.terminal || undefined,
      berth: data.berth || undefined,
      containerNumbers: containerNumbers,
      cargoDescription: data.cargoDescription || undefined,
      freeTimeDays: data.freeTimeDays || 7,
      estimatedCharges: estimatedCharges.filter(c => c.chargeType && c.amount > 0),
      deliveryInstructions: data.deliveryInstructions || undefined,
      deliveryAddress: data.deliveryAddress || undefined,
      notes: data.notes || undefined,
    };

    // Validate using utility function
    const validation = validateArrivalNoticeData(formData);
    if (!validation.isValid) {
      setValidationErrors(validation.errors.map(e => e.message));
      return;
    }

    await onSubmit(formData);
  };

  const handleSaveDraft = async () => {
    const data = watch();
    const formData: ArrivalNoticeFormData = {
      blId: data.blId,
      bookingId: data.bookingId || undefined,
      vesselName: data.vesselName,
      voyageNumber: data.voyageNumber || undefined,
      eta: data.eta,
      ata: data.ata || undefined,
      portOfDischarge: data.portOfDischarge,
      terminal: data.terminal || undefined,
      berth: data.berth || undefined,
      containerNumbers: containerNumbers,
      cargoDescription: data.cargoDescription || undefined,
      freeTimeDays: data.freeTimeDays || 7,
      estimatedCharges: estimatedCharges.filter(c => c.chargeType && c.amount > 0),
      deliveryInstructions: data.deliveryInstructions || undefined,
      deliveryAddress: data.deliveryAddress || undefined,
      notes: data.notes || undefined,
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
          <TabsTrigger value="vessel" className="flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Vessel
          </TabsTrigger>
          <TabsTrigger value="cargo" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Cargo
          </TabsTrigger>
          <TabsTrigger value="charges" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Charges
          </TabsTrigger>
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Delivery
          </TabsTrigger>
        </TabsList>

        {/* Vessel Tab */}
        <TabsContent value="vessel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bill of Lading Reference</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="blId">Bill of Lading *</Label>
                <Select
                  value={watchedBlId}
                  onValueChange={(value) => setValue('blId', value)}
                  disabled={isLoading || mode === 'edit'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select B/L" />
                  </SelectTrigger>
                  <SelectContent>
                    {billsOfLading.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.blNumber} - {b.vesselName || 'TBN'} ({b.portOfLoading} → {b.portOfDischarge})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.blId && (
                  <p className="text-sm text-destructive">{errors.blId.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vessel & Voyage</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Port & Terminal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="portOfDischarge">Port of Discharge *</Label>
                <Input
                  id="portOfDischarge"
                  {...register('portOfDischarge')}
                  placeholder="e.g., Jakarta, Indonesia"
                  disabled={isLoading}
                />
                {errors.portOfDischarge && (
                  <p className="text-sm text-destructive">{errors.portOfDischarge.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="terminal">Terminal</Label>
                <Input
                  id="terminal"
                  {...register('terminal')}
                  placeholder="e.g., JICT"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="berth">Berth</Label>
                <Input
                  id="berth"
                  {...register('berth')}
                  placeholder="e.g., Berth 5"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Arrival Schedule & Free Time
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eta">ETA (Estimated Time of Arrival) *</Label>
                <Input
                  id="eta"
                  type="date"
                  {...register('eta')}
                  disabled={isLoading}
                />
                {errors.eta && (
                  <p className="text-sm text-destructive">{errors.eta.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ata">ATA (Actual Time of Arrival)</Label>
                <Input
                  id="ata"
                  type="date"
                  {...register('ata')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="freeTimeDays">Free Time (Days)</Label>
                <Input
                  id="freeTimeDays"
                  type="number"
                  min="0"
                  max="90"
                  {...register('freeTimeDays')}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">Default: 7 days</p>
              </div>

              <div className="space-y-2">
                <Label>Free Time Expires</Label>
                <div className="p-3 bg-muted rounded-md">
                  {calculatedFreeTimeExpiry ? (
                    <span className="font-medium">
                      {new Date(calculatedFreeTimeExpiry).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Enter ETA to calculate</span>
                  )}
                </div>
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
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="cargoDescription">Description of Goods</Label>
                <Textarea
                  id="cargoDescription"
                  {...register('cargoDescription')}
                  placeholder="Detailed description of cargo..."
                  rows={4}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Container Numbers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newContainerNumber}
                  onChange={(e) => setNewContainerNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., MSCU1234567"
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddContainer();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddContainer}
                  disabled={isLoading || !newContainerNumber.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {containerNumbers.length > 0 ? (
                <div className="space-y-2">
                  {containerNumbers.map((containerNo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <span className="font-mono">{containerNo}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveContainer(index)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No containers added. Add container numbers above.
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                {containerNumbers.length} container{containerNumbers.length !== 1 ? 's' : ''} added
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charges Tab */}
        <TabsContent value="charges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Estimated Charges</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCharge}
                  disabled={isLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Charge
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {estimatedCharges.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {estimatedCharges.map((charge, index) => (
                      <div
                        key={index}
                        className="grid gap-3 md:grid-cols-4 p-3 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <Label className="text-xs">Charge Type</Label>
                          <Select
                            value={charge.chargeType}
                            onValueChange={(value) => handleUpdateCharge(index, 'chargeType', value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMMON_CHARGE_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Amount</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={charge.amount || ''}
                            onChange={(e) => handleUpdateCharge(index, 'amount', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            disabled={isLoading}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Currency</Label>
                          <Select
                            value={charge.currency}
                            onValueChange={(value) => handleUpdateCharge(index, 'currency', value)}
                            disabled={isLoading}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                              {CURRENCIES.map((curr) => (
                                <SelectItem key={curr} value={curr}>
                                  {curr}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCharge(index)}
                            disabled={isLoading}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Estimated Charges:</span>
                      <span className="text-lg font-bold">
                        {getTotalCharges().toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: Amounts may be in different currencies
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No charges added yet.</p>
                  <p className="text-sm">Click &quot;Add Charge&quot; to add estimated charges.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Delivery Tab */}
        <TabsContent value="delivery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Instructions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryInstructions">Instructions</Label>
                <Textarea
                  id="deliveryInstructions"
                  {...register('deliveryInstructions')}
                  placeholder="Special delivery instructions, handling requirements, etc."
                  rows={4}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">Delivery Address</Label>
                <Textarea
                  id="deliveryAddress"
                  {...register('deliveryAddress')}
                  placeholder="Full delivery address"
                  rows={3}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Any additional notes or remarks..."
                  rows={3}
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
            mode === 'create' ? 'Create Arrival Notice' : 'Update Arrival Notice'
          )}
        </Button>
      </div>
    </form>
  );
}
