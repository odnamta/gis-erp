'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  Ship, 
  FileText, 
  Package, 
  AlertCircle, 
  Plus,
  Trash2,
  Link as LinkIcon
} from 'lucide-react';
import {
  ManifestFormData,
  BillOfLading,
  ManifestType,
  MANIFEST_TYPES,
  MANIFEST_TYPE_LABELS,
} from '@/types/agency';
import { calculateManifestTotals } from '@/lib/bl-documentation-utils';

// Form validation schema
export const manifestFormSchema = z.object({
  manifestType: z.string().min(1, 'Manifest type is required'),
  vesselName: z.string().min(1, 'Vessel name is required'),
  voyageNumber: z.string().optional(),
  portOfLoading: z.string().optional(),
  portOfDischarge: z.string().optional(),
  departureDate: z.string().optional(),
  arrivalDate: z.string().optional(),
});

export type ManifestFormValues = z.infer<typeof manifestFormSchema>;

interface ManifestFormProps {
  availableBLs: BillOfLading[];
  initialData?: ManifestFormData | null;
  linkedBLs?: BillOfLading[];
  onSubmit: (data: ManifestFormData) => Promise<void>;
  onSaveDraft?: (data: ManifestFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
  mode: 'create' | 'edit';
}


/**
 * Cargo Manifest Form Component
 * Form for creating/editing cargo manifests with B/L selector for linking.
 * Per Requirements 4.1, 4.2
 */
export function ManifestForm({
  availableBLs,
  initialData,
  linkedBLs,
  onSubmit,
  onSaveDraft,
  onCancel,
  isLoading,
  mode,
}: ManifestFormProps) {
  const [activeTab, setActiveTab] = useState('vessel');
  const [selectedBlIds, setSelectedBlIds] = useState<string[]>(initialData?.blIds || []);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Get selected B/Ls for totals calculation
  const selectedBLs = availableBLs.filter(bl => selectedBlIds.includes(bl.id));
  const totals = calculateManifestTotals(selectedBLs);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ManifestFormValues>({
    resolver: zodResolver(manifestFormSchema) as never,
    defaultValues: {
      manifestType: initialData?.manifestType || 'outward',
      vesselName: initialData?.vesselName || '',
      voyageNumber: initialData?.voyageNumber || '',
      portOfLoading: initialData?.portOfLoading || '',
      portOfDischarge: initialData?.portOfDischarge || '',
      departureDate: initialData?.departureDate || '',
      arrivalDate: initialData?.arrivalDate || '',
    },
  });

  const watchedManifestType = watch('manifestType');

  // Initialize selected B/Ls from linkedBLs prop
  useEffect(() => {
    if (linkedBLs && linkedBLs.length > 0 && mode === 'edit') {
      setSelectedBlIds(linkedBLs.map(bl => bl.id));
    }
  }, [linkedBLs, mode]);

  // Auto-fill vessel info from first selected B/L
  useEffect(() => {
    if (selectedBlIds.length > 0 && mode === 'create') {
      const firstBL = availableBLs.find(bl => bl.id === selectedBlIds[0]);
      if (firstBL) {
        setValue('vesselName', firstBL.vesselName || '');
        setValue('voyageNumber', firstBL.voyageNumber || '');
        setValue('portOfLoading', firstBL.portOfLoading || '');
        setValue('portOfDischarge', firstBL.portOfDischarge || '');
      }
    }
  }, [selectedBlIds, availableBLs, mode, setValue]);

  // B/L selection handlers
  const handleToggleBL = (blId: string) => {
    setSelectedBlIds(prev => {
      if (prev.includes(blId)) {
        return prev.filter(id => id !== blId);
      } else {
        return [...prev, blId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedBlIds.length === availableBLs.length) {
      setSelectedBlIds([]);
    } else {
      setSelectedBlIds(availableBLs.map(bl => bl.id));
    }
  };

  const handleFormSubmit = async (data: ManifestFormValues) => {
    setValidationErrors([]);

    // Validate at least one B/L is selected
    if (selectedBlIds.length === 0) {
      setValidationErrors(['At least one Bill of Lading must be selected']);
      return;
    }

    const formData: ManifestFormData = {
      manifestType: data.manifestType as ManifestType,
      vesselName: data.vesselName,
      voyageNumber: data.voyageNumber || undefined,
      portOfLoading: data.portOfLoading || undefined,
      portOfDischarge: data.portOfDischarge || undefined,
      departureDate: data.departureDate || undefined,
      arrivalDate: data.arrivalDate || undefined,
      blIds: selectedBlIds,
    };

    await onSubmit(formData);
  };

  const handleSaveDraft = async () => {
    const data = watch();
    const formData: ManifestFormData = {
      manifestType: data.manifestType as ManifestType,
      vesselName: data.vesselName,
      voyageNumber: data.voyageNumber || undefined,
      portOfLoading: data.portOfLoading || undefined,
      portOfDischarge: data.portOfDischarge || undefined,
      departureDate: data.departureDate || undefined,
      arrivalDate: data.arrivalDate || undefined,
      blIds: selectedBlIds,
    };

    if (onSaveDraft) {
      await onSaveDraft(formData);
    }
  };

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vessel" className="flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Vessel
          </TabsTrigger>
          <TabsTrigger value="bls" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            B/Ls ({selectedBlIds.length})
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Summary
          </TabsTrigger>
        </TabsList>

        {/* Vessel Tab */}
        <TabsContent value="vessel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manifest Type</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manifestType">Type *</Label>
                <Select
                  value={watchedManifestType}
                  onValueChange={(value) => setValue('manifestType', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manifest type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MANIFEST_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {MANIFEST_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.manifestType && (
                  <p className="text-sm text-destructive">{errors.manifestType.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {watchedManifestType === 'inward' 
                    ? 'Inward manifest for incoming cargo' 
                    : 'Outward manifest for outgoing cargo'}
                </p>
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
              <CardTitle>Ports</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="portOfLoading">Port of Loading</Label>
                <Input
                  id="portOfLoading"
                  {...register('portOfLoading')}
                  placeholder="e.g., Jakarta, Indonesia"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="portOfDischarge">Port of Discharge</Label>
                <Input
                  id="portOfDischarge"
                  {...register('portOfDischarge')}
                  placeholder="e.g., Singapore"
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="departureDate">Departure Date</Label>
                <Input
                  id="departureDate"
                  type="date"
                  {...register('departureDate')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arrivalDate">Arrival Date</Label>
                <Input
                  id="arrivalDate"
                  type="date"
                  {...register('arrivalDate')}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* B/Ls Tab */}
        <TabsContent value="bls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Link Bills of Lading</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={isLoading || availableBLs.length === 0}
                >
                  {selectedBlIds.length === availableBLs.length ? 'Deselect All' : 'Select All'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {availableBLs.length > 0 ? (
                <div className="space-y-2">
                  {availableBLs.map((bl) => {
                    const isSelected = selectedBlIds.includes(bl.id);
                    return (
                      <div
                        key={bl.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleToggleBL(bl.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleBL(bl.id)}
                          disabled={isLoading}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{bl.blNumber}</span>
                            {bl.carrierBlNumber && (
                              <span className="text-xs text-muted-foreground">
                                ({bl.carrierBlNumber})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            <span>{bl.vesselName}</span>
                            {bl.voyageNumber && <span> / {bl.voyageNumber}</span>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {bl.portOfLoading} → {bl.portOfDischarge}
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            {bl.numberOfPackages && (
                              <span>{bl.numberOfPackages.toLocaleString()} pkgs</span>
                            )}
                            {bl.grossWeightKg && (
                              <span>{bl.grossWeightKg.toLocaleString()} kg</span>
                            )}
                            {bl.measurementCbm && (
                              <span>{bl.measurementCbm.toLocaleString()} CBM</span>
                            )}
                            {bl.containers && bl.containers.length > 0 && (
                              <span>{bl.containers.length} container{bl.containers.length !== 1 ? 's' : ''}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No Bills of Lading available.</p>
                  <p className="text-sm">Create B/Ls first to link them to this manifest.</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm">
                  <span className="font-medium">{selectedBlIds.length}</span> B/L{selectedBlIds.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manifest Totals</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedBlIds.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{totals.totalBls}</div>
                    <div className="text-sm text-muted-foreground">B/Ls</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{totals.totalContainers}</div>
                    <div className="text-sm text-muted-foreground">Containers</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{totals.totalPackages.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Packages</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{totals.totalWeightKg.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Weight (kg)</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{totals.totalCbm.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">CBM</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No B/Ls selected.</p>
                  <p className="text-sm">Select Bills of Lading to see totals.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {selectedBlIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Bills of Lading</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">B/L Number</th>
                        <th className="text-left py-2 px-2">Shipper</th>
                        <th className="text-right py-2 px-2">Containers</th>
                        <th className="text-right py-2 px-2">Packages</th>
                        <th className="text-right py-2 px-2">Weight (kg)</th>
                        <th className="text-right py-2 px-2">CBM</th>
                        <th className="text-center py-2 px-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBLs.map((bl) => (
                        <tr key={bl.id} className="border-b">
                          <td className="py-2 px-2 font-mono">{bl.blNumber}</td>
                          <td className="py-2 px-2 truncate max-w-[150px]">{bl.shipperName}</td>
                          <td className="py-2 px-2 text-right">{bl.containers?.length || 0}</td>
                          <td className="py-2 px-2 text-right">{bl.numberOfPackages?.toLocaleString() || '-'}</td>
                          <td className="py-2 px-2 text-right">{bl.grossWeightKg?.toLocaleString() || '-'}</td>
                          <td className="py-2 px-2 text-right">{bl.measurementCbm?.toLocaleString() || '-'}</td>
                          <td className="py-2 px-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleBL(bl.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-medium bg-muted/50">
                        <td className="py-2 px-2" colSpan={2}>Total</td>
                        <td className="py-2 px-2 text-right">{totals.totalContainers}</td>
                        <td className="py-2 px-2 text-right">{totals.totalPackages.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{totals.totalWeightKg.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right">{totals.totalCbm.toLocaleString()}</td>
                        <td className="py-2 px-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
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
            mode === 'create' ? 'Create Manifest' : 'Update Manifest'
          )}
        </Button>
      </div>
    </form>
  );
}
