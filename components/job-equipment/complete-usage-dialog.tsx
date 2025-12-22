'use client';

// =====================================================
// v0.45: Complete Equipment Usage Dialog Component
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
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import {
  JobEquipmentUsage,
  CompleteEquipmentUsageInput,
} from '@/types/job-equipment';
import { completeEquipmentUsage } from '@/lib/job-equipment-actions';
import {
  calculateUsageDays,
  calculateDepreciationCost,
  calculateBillingAmount,
  formatEquipmentCurrency,
} from '@/lib/job-equipment-utils';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/pjo-utils';

interface CompleteUsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usage: JobEquipmentUsage | null;
  onSuccess: () => void;
}

export function CompleteUsageDialog({
  open,
  onOpenChange,
  usage,
  onSuccess,
}: CompleteUsageDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<CompleteEquipmentUsageInput>({
    usageId: '',
    usageEnd: new Date().toISOString().split('T')[0],
    endKm: undefined,
    endHours: undefined,
    fuelCost: undefined,
    operatorCost: undefined,
    maintenanceCost: undefined,
    billingAmount: undefined,
  });

  // Preview calculations
  const [preview, setPreview] = useState({
    usageDays: 0,
    kmUsed: 0,
    hoursUsed: 0,
    depreciationCost: 0,
    totalCost: 0,
    billingAmount: 0,
  });

  // Initialize form when usage changes
  useEffect(() => {
    if (usage) {
      setFormData({
        usageId: usage.id,
        usageEnd: new Date().toISOString().split('T')[0],
        endKm: undefined,
        endHours: undefined,
        fuelCost: undefined,
        operatorCost: undefined,
        maintenanceCost: undefined,
        billingAmount: undefined,
      });
    }
  }, [usage]);

  // Calculate preview when form changes
  useEffect(() => {
    if (!usage) return;

    const usageDays = calculateUsageDays(usage.usageStart, formData.usageEnd);
    const kmUsed =
      formData.endKm && usage.startKm ? formData.endKm - usage.startKm : 0;
    const hoursUsed =
      formData.endHours && usage.startHours
        ? formData.endHours - usage.startHours
        : 0;

    const depreciationCost = calculateDepreciationCost(
      usage.asset?.bookValue || 0,
      usage.asset?.usefulLifeYears || 10,
      usageDays
    );

    const totalCost =
      depreciationCost +
      (formData.fuelCost || 0) +
      (formData.operatorCost || 0) +
      (formData.maintenanceCost || 0);

    const billingAmount =
      formData.billingAmount ||
      (usage.dailyRate
        ? calculateBillingAmount(
            usage.rateType,
            usage.dailyRate,
            usageDays,
            hoursUsed,
            kmUsed
          )
        : 0);

    setPreview({
      usageDays,
      kmUsed,
      hoursUsed,
      depreciationCost,
      totalCost,
      billingAmount,
    });
  }, [usage, formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usage) return;

    setIsLoading(true);
    const result = await completeEquipmentUsage(formData);
    setIsLoading(false);

    if (result.success) {
      toast({
        title: 'Berhasil',
        description: 'Equipment usage berhasil diselesaikan',
      });
      onOpenChange(false);
      onSuccess();
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Gagal menyelesaikan equipment usage',
        variant: 'destructive',
      });
    }
  };

  if (!usage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Selesaikan Penggunaan Equipment</DialogTitle>
          <DialogDescription>
            {usage.asset?.assetCode} - {usage.asset?.assetName}
            <br />
            Mulai: {formatDate(usage.usageStart)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="usageEnd">Tanggal Selesai *</Label>
            <Input
              id="usageEnd"
              type="date"
              value={formData.usageEnd}
              min={usage.usageStart}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, usageEnd: e.target.value }))
              }
              required
            />
            <p className="text-sm text-muted-foreground">
              Durasi: {preview.usageDays} hari
            </p>
          </div>

          {/* End Meter Readings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="endKm">KM Akhir</Label>
              <Input
                id="endKm"
                type="number"
                placeholder={`Min: ${usage.startKm || 0}`}
                value={formData.endKm || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endKm: e.target.value ? parseInt(e.target.value) : undefined,
                  }))
                }
              />
              {usage.startKm && (
                <p className="text-xs text-muted-foreground">
                  Awal: {usage.startKm.toLocaleString('id-ID')} km
                  {preview.kmUsed > 0 && ` → +${preview.kmUsed.toLocaleString('id-ID')} km`}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endHours">Jam Akhir</Label>
              <Input
                id="endHours"
                type="number"
                step="0.1"
                placeholder={`Min: ${usage.startHours || 0}`}
                value={formData.endHours || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    endHours: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  }))
                }
              />
              {usage.startHours && (
                <p className="text-xs text-muted-foreground">
                  Awal: {usage.startHours.toFixed(1)} jam
                  {preview.hoursUsed > 0 && ` → +${preview.hoursUsed.toFixed(1)} jam`}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Costs */}
          <div className="space-y-3">
            <Label className="text-base">Biaya Operasional</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fuelCost" className="text-sm font-normal">
                  BBM (Rp)
                </Label>
                <Input
                  id="fuelCost"
                  type="number"
                  placeholder="0"
                  value={formData.fuelCost || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fuelCost: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operatorCost" className="text-sm font-normal">
                  Operator (Rp)
                </Label>
                <Input
                  id="operatorCost"
                  type="number"
                  placeholder="0"
                  value={formData.operatorCost || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      operatorCost: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenanceCost" className="text-sm font-normal">
                  Maintenance (Rp)
                </Label>
                <Input
                  id="maintenanceCost"
                  type="number"
                  placeholder="0"
                  value={formData.maintenanceCost || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      maintenanceCost: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingAmount" className="text-sm font-normal">
                  Billing (Rp)
                </Label>
                <Input
                  id="billingAmount"
                  type="number"
                  placeholder="Auto-calculate"
                  value={formData.billingAmount || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      billingAmount: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Depresiasi ({preview.usageDays} hari)</span>
              <span>{formatEquipmentCurrency(preview.depreciationCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>BBM + Operator + Maintenance</span>
              <span>
                {formatEquipmentCurrency(
                  (formData.fuelCost || 0) +
                    (formData.operatorCost || 0) +
                    (formData.maintenanceCost || 0)
                )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Total Biaya</span>
              <span className="text-red-600">
                {formatEquipmentCurrency(preview.totalCost)}
              </span>
            </div>
            {usage.isBillable && (
              <div className="flex justify-between font-medium">
                <span>Billing</span>
                <span className="text-green-600">
                  {formatEquipmentCurrency(preview.billingAmount)}
                </span>
              </div>
            )}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Selesaikan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
