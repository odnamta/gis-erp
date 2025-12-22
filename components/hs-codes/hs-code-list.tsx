'use client';

import { useEffect, useState } from 'react';
import { FileText, AlertTriangle, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getHSCodesForHeading } from '@/lib/hs-utils';
import { RestrictionBadge, getRestrictionType } from './restriction-badge';
import type { HSCode } from '@/types/hs-codes';

interface HSCodeListProps {
  headingId: string;
  onSelect?: (hsCode: HSCode) => void;
  selectedCodeId?: string;
  className?: string;
}

export function HSCodeList({
  headingId,
  onSelect,
  selectedCodeId,
  className,
}: HSCodeListProps) {
  const [codes, setCodes] = useState<HSCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCodes() {
      setIsLoading(true);
      try {
        const data = await getHSCodesForHeading(headingId);
        setCodes(data);
      } catch (error) {
        console.error('Error loading HS codes:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (headingId) {
      loadCodes();
    }
  }, [headingId]);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {codes.map((code) => {
        const restrictionType = getRestrictionType(
          code.hasRestrictions,
          code.hasExportRestrictions
        );
        
        return (
          <button
            key={code.id}
            type="button"
            onClick={() => onSelect?.(code)}
            className={cn(
              'w-full rounded-lg border p-4 text-left transition-colors',
              'hover:bg-accent hover:border-accent-foreground/20',
              selectedCodeId === code.id && 'bg-accent border-primary'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-base">
                      {code.hsCode}
                    </span>
                    {restrictionType && (
                      <RestrictionBadge
                        type={restrictionType}
                        restrictionType={code.restrictionType}
                        issuingAuthority={code.issuingAuthority}
                        exportRestrictionType={code.exportRestrictionType}
                      />
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-1">
                    {code.description}
                  </p>
                  {code.descriptionId && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {code.descriptionId}
                    </p>
                  )}
                  {code.statisticalUnit && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Unit: {code.statisticalUnit}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="text-right shrink-0">
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-muted-foreground">MFN:</span>{' '}
                    <span className="font-medium">{code.mfnRate}%</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">PPN:</span>{' '}
                    <span className="font-medium">{code.ppnRate}%</span>
                  </div>
                  {code.ppnbmRate > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">PPnBM:</span>{' '}
                      <span className="font-medium">{code.ppnbmRate}%</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-muted-foreground">PPh:</span>{' '}
                    <span className="font-medium">{code.pphImportRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        );
      })}
      
      {codes.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-8">
          No HS codes found in this heading
        </div>
      )}
    </div>
  );
}
