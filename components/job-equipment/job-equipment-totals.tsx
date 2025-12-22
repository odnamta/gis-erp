'use client';

// =====================================================
// v0.45: Job Equipment Totals Component
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { JobEquipmentUsage } from '@/types/job-equipment';
import {
  formatEquipmentCurrency,
  formatEquipmentPercent,
  getMarginStatusBadge,
  getMarginStatusColor,
  calculateEquipmentCostSummary,
} from '@/lib/job-equipment-utils';

interface JobEquipmentTotalsProps {
  usages: JobEquipmentUsage[];
}

export function JobEquipmentTotals({ usages }: JobEquipmentTotalsProps) {
  const summary = calculateEquipmentCostSummary(usages);

  return (
    <div className="space-y-4">
        {/* Cost Breakdown */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Depresiasi</span>
            <span>{formatEquipmentCurrency(summary.depreciationTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">BBM</span>
            <span>{formatEquipmentCurrency(summary.fuelTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Maintenance</span>
            <span>{formatEquipmentCurrency(summary.maintenanceTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Operator</span>
            <span>{formatEquipmentCurrency(summary.operatorTotal)}</span>
          </div>
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between font-medium">
            <span>Total Biaya</span>
            <span className="text-red-600">
              {formatEquipmentCurrency(summary.totalEquipmentCost)}
            </span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total Billing</span>
            <span className="text-green-600">
              {formatEquipmentCurrency(summary.totalBilling)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Margin */}
        <div className="flex items-center justify-between">
          <span className="font-medium">Equipment Margin</span>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${getMarginStatusColor(summary.equipmentMarginPercent)}`}>
              {formatEquipmentCurrency(summary.equipmentMargin)}
            </span>
            <Badge variant={getMarginStatusBadge(summary.equipmentMarginPercent)}>
              {formatEquipmentPercent(summary.equipmentMarginPercent)}
            </Badge>
          </div>
        </div>
    </div>
  );
}
