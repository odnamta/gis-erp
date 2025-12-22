'use client';

// =====================================================
// v0.45: Add Equipment Dialog Component
// =====================================================

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { AddEquipmentInput, UsageRateType } from '@/types/job-equipment';
import { AssetAvailability } from '@/types/utilization';
import { addEquipmentToJob, getEquipmentRate } from '@/lib/job-equipment-actions';
import { getAvailableAssets } from '@/lib/utilization-actions';
import { useToast } from '@/hooks/use-toast';

interface AddEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobOrderId: string;
  onSuccess: () => void;
}

export function AddEquipmentDialog({
  open,
  onOpenChange,
  jobOrderId,
  onSuccess,
}: AddEquipmentDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<AssetAvailability[]>([]);

  const [formData, setFormData] = useState<AddEquipmentInput>({
    jobOrderId,
    assetId: '',
    usageStart: new Date().toISOString().split('T')[0],
    startKm: undefined,
    startHours: undefined,
    dailyRate: undefined,
    rateType: 'daily',
    isBillable: true,
    notes: '',
  });

  // Load available assets when dialog opens
  useEffect(() => {
    if (open) {
      loadAvailableAssets();
      setFormData((prev) => ({ ...prev, jobOrderId }));
    }
  }, [open, jobOrderId]);

  const loadAvailableAssets = async () => {
    setIsLoadingAssets(true);
    const result = await getAvailableAssets();
    setIsLoadingAssets(false);

    if (result.success && result.data) {
      // Filter to only show available assets
      const available = result.data.filter(
        (a) => a.availabilityStatus === 'available'
      );
      setAvailableAssets(available);
    }
  };

  const handleAssetChange = async (assetId: string) => {
    setFormData((prev) => ({ ...prev, assetId }));

    // Try to get the default rate for this asset
    const rateResult = await getEquipmentRate(assetId, 'daily');
    if (rateResult.success && rateResult.data) {
      setFormData((prev) => ({
        ...prev,
        dailyRate: rateResult.data?.rateAmount,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await addEquipmentToJob(formData);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Berhasil',
        description: 'Equipment berhasil ditambahkan ke job',
      });
      onOpenChange(false);
      onSuccess();
      // Reset form
      setFormData({
        jobOrderId,
        assetId: '',
        usageStart: new Date().toISOString().split('T')[0],
        startKm: undefined,
        startHours: undefined,
        dailyRate: undefined,
        rateType: 'daily',
        isBillable: true,
        notes: '',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Gagal menambahkan equipment',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tambah Equipment</DialogTitle>
          <DialogDescription>
            Pilih equipment yang akan digunakan untuk job ini.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset Selection */}
          <div className="space-y-2">
            <Label htmlFor="asset">Equipment *</Label>
            {isLoadingAssets ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat equipment...
              </div>
            ) : (
              <Select
                value={formData.assetId}
                onValueChange={handleAssetChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih equipment" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssets.length === 0 ? (
                    <SelectItem value="" disabled>
                      Tidak ada equipment tersedia
                    </SelectItem>
                  ) : (
                    availableAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.assetCode} - {asset.assetName}
                        {asset.registrationNumber && ` (${asset.registrationNumber})`}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Usage Start Date */}
          <div className="space-y-2">
            <Label htmlFor="usageStart">Tanggal Mulai *</Label>
            <Input
              id="usageStart"
              type="date"
              value={formData.usageStart}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, usageStart: e.target.value }))
              }
              required
            />
          </div>

          {/* Meter Readings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startKm">KM Awal</Label>
              <Input
                id="startKm"
                type="number"
                placeholder="Odometer"
                value={formData.startKm || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startKm: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startHours">Jam Awal</Label>
              <Input
                id="startHours"
                type="number"
                step="0.1"
                placeholder="Hour meter"
                value={formData.startHours || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startHours: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  }))
                }
              />
            </div>
          </div>

          {/* Rate Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rateType">Tipe Rate</Label>
              <Select
                value={formData.rateType}
                onValueChange={(value: UsageRateType) =>
                  setFormData((prev) => ({ ...prev, rateType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Per Hari</SelectItem>
                  <SelectItem value="hourly">Per Jam</SelectItem>
                  <SelectItem value="per_km">Per KM</SelectItem>
                  <SelectItem value="actual">Aktual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyRate">Rate (Rp)</Label>
              <Input
                id="dailyRate"
                type="number"
                placeholder="Rate billing"
                value={formData.dailyRate || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dailyRate: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  }))
                }
              />
            </div>
          </div>

          {/* Billable Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isBillable">Billable ke Customer</Label>
            <Switch
              id="isBillable"
              checked={formData.isBillable}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isBillable: checked }))
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              placeholder="Catatan tambahan..."
              value={formData.notes || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading || !formData.assetId}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tambah Equipment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
