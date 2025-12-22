'use client';

import { Badge } from '@/components/ui/badge';
import { IncidentSeverity } from '@/types/incident';
import { getSeverityLabel, getSeverityBadgeVariant } from '@/lib/incident-utils';

interface SeverityBadgeProps {
  severity: IncidentSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <Badge variant={getSeverityBadgeVariant(severity)} className={className}>
      {getSeverityLabel(severity)}
    </Badge>
  );
}
