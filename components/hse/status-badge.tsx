'use client';

import { Badge } from '@/components/ui/badge';
import { IncidentStatus } from '@/types/incident';
import { getStatusLabel, getStatusBadgeVariant } from '@/lib/incident-utils';

interface StatusBadgeProps {
  status: IncidentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={getStatusBadgeVariant(status)} className={className}>
      {getStatusLabel(status)}
    </Badge>
  );
}
