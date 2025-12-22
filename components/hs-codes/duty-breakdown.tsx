'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage } from '@/lib/hs-utils';
import { FTA_NAMES } from '@/types/hs-codes';
import type { DutyCalculation } from '@/types/hs-codes';

interface DutyBreakdownProps {
  calculation: DutyCalculation;
  className?: string;
}

export function DutyBreakdown({ calculation, className }: DutyBreakdownProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Duty Calculation Breakdown</CardTitle>
          {calculation.usedPreferentialRate && calculation.ftaCode && (
            <Badge variant="secondary">
              {FTA_NAMES[calculation.ftaCode]} Rate Applied
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CIF Value */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">CIF Value</span>
          <span className="font-medium">{formatCurrency(calculation.cifValue)}</span>
        </div>
        
        <Separator />
        
        {/* Import Duty (BM) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">Import Duty (BM)</span>
              <span className="text-sm text-muted-foreground ml-2">
                @ {formatPercentage(calculation.bmRate)}
              </span>
            </div>
            <span className="font-medium">{formatCurrency(calculation.bmAmount)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(calculation.cifValue)} × {formatPercentage(calculation.bmRate)}
          </p>
        </div>
        
        <Separator />
        
        {/* PPN (VAT) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">PPN (VAT)</span>
              <span className="text-sm text-muted-foreground ml-2">
                @ {formatPercentage(calculation.ppnRate)}
              </span>
            </div>
            <span className="font-medium">{formatCurrency(calculation.ppnAmount)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Base: {formatCurrency(calculation.ppnBase)} (CIF + BM)
          </p>
        </div>
        
        {/* PPnBM (Luxury Tax) - only show if applicable */}
        {calculation.ppnbmRate > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">PPnBM (Luxury Tax)</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    @ {formatPercentage(calculation.ppnbmRate)}
                  </span>
                </div>
                <span className="font-medium">{formatCurrency(calculation.ppnbmAmount)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Base: {formatCurrency(calculation.ppnBase)} (CIF + BM)
              </p>
            </div>
          </>
        )}
        
        <Separator />
        
        {/* PPh Import */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-medium">PPh Import</span>
              <span className="text-sm text-muted-foreground ml-2">
                @ {formatPercentage(calculation.pphRate)}
              </span>
            </div>
            <span className="font-medium">{formatCurrency(calculation.pphAmount)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Base: {formatCurrency(calculation.pphBase)} (CIF + BM + PPN + PPnBM)
          </p>
        </div>
        
        <Separator />
        
        {/* Total */}
        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-semibold">Total Duties</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(calculation.totalDuties)}
          </span>
        </div>
        
        {/* Grand Total (CIF + Duties) */}
        <div className="flex justify-between items-center bg-muted/50 rounded-md p-3 -mx-2">
          <span className="font-medium">Total Landed Cost</span>
          <span className="font-bold">
            {formatCurrency(calculation.cifValue + calculation.totalDuties)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
