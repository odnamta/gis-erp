'use client';

import { Badge } from '@/components/ui/badge';
import { BookingStatus, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from '@/types/agency';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

export function BookingStatusBadge({ status, className }: BookingStatusBadgeProps) {
  const label = BOOKING_STATUS_LABELS[status] || status;
  const colorClass = BOOKING_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';

  return (
    <Badge variant="outline" className={`${colorClass} ${className || ''}`}>
      {label}
    </Badge>
  );
}
