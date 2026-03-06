'use client';

import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HSCode } from '@/types/hs-codes';

interface FrequentCodesListStaticProps {
  codes: HSCode[];
  onSelect?: (hsCode: HSCode) => void;
  className?: string;
}

export function FrequentCodesListStatic({
  codes,
  onSelect,
  className,
}: FrequentCodesListStaticProps) {
  if (codes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No recently used codes</p>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
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
  );
}
