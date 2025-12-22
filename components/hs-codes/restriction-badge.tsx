'use client';

import { AlertTriangle, Ban, FileWarning } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RestrictionBadgeProps {
  type: 'import' | 'export' | 'both';
  restrictionType?: string;
  issuingAuthority?: string;
  exportRestrictionType?: string;
  className?: string;
  showTooltip?: boolean;
}

export function RestrictionBadge({
  type,
  restrictionType,
  issuingAuthority,
  exportRestrictionType,
  className,
  showTooltip = true,
}: RestrictionBadgeProps) {
  const getIcon = () => {
    switch (type) {
      case 'import':
        return <AlertTriangle className="h-3 w-3" />;
      case 'export':
        return <Ban className="h-3 w-3" />;
      case 'both':
        return <FileWarning className="h-3 w-3" />;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'import':
        return 'Import Lartas';
      case 'export':
        return 'Export Lartas';
      case 'both':
        return 'Import/Export Lartas';
    }
  };

  const getTooltipContent = () => {
    const lines: string[] = [];
    
    if (type === 'import' || type === 'both') {
      if (restrictionType) {
        lines.push(`Import: ${restrictionType}`);
      }
      if (issuingAuthority) {
        lines.push(`Authority: ${issuingAuthority}`);
      }
    }
    
    if (type === 'export' || type === 'both') {
      if (exportRestrictionType) {
        lines.push(`Export: ${exportRestrictionType}`);
      }
    }
    
    return lines.length > 0 ? lines.join('\n') : 'Restricted item - check regulations';
  };

  const badge = (
    <Badge
      variant="destructive"
      className={cn('gap-1', className)}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-pre-line">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper function to determine restriction type
export function getRestrictionType(
  hasRestrictions: boolean,
  hasExportRestrictions: boolean
): 'import' | 'export' | 'both' | null {
  if (hasRestrictions && hasExportRestrictions) return 'both';
  if (hasRestrictions) return 'import';
  if (hasExportRestrictions) return 'export';
  return null;
}
