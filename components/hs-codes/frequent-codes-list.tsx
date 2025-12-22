'use client';

import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getFrequentHSCodesAction } from '@/lib/hs-actions';
import type { HSCode } from '@/types/hs-codes';

interface FrequentCodesListProps {
  onSelect?: (hsCode: HSCode) => void;
  limit?: number;
  className?: string;
  showTitle?: boolean;
}

export function FrequentCodesList({
  onSelect,
  limit = 10,
  className,
  showTitle = true,
}: FrequentCodesListProps) {
  const [codes, setCodes] = useState<HSCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFrequentCodes() {
      setIsLoading(true);
      try {
        const result = await getFrequentHSCodesAction(limit);
        if (result.success && result.data) {
          setCodes(result.data);
        }
      } catch (error) {
        console.error('Error loading frequent codes:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFrequentCodes();
  }, [limit]);

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {showTitle && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Recently Used</span>
          </div>
        )}
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (codes.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {showTitle && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Recently Used</span>
        </div>
      )}
      <div className="space-y-1">
        {codes.map((code) => (
          <button
            key={code.id}
            type="button"
            onClick={() => onSelect?.(code)}
            className="w-full rounded-md border bg-card p-2 text-left hover:bg-accent transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-sm">
                    {code.hsCode}
                  </span>
                  {code.hasRestrictions && (
                    <Badge variant="destructive" className="h-5 px-1.5">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Lartas
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {code.description}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <div>MFN: {code.mfnRate}%</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
