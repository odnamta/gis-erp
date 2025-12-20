'use client';

import { Badge } from '@/components/ui/badge';
import { LeaveRequestStatus } from '@/types/leave';
import { Clock, CheckCircle, XCircle, Ban } from 'lucide-react';

interface LeaveStatusBadgeProps {
  status: LeaveRequestStatus;
  showIcon?: boolean;
}

const statusConfig: Record<LeaveRequestStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pending: {
    label: 'Pending',
    variant: 'outline',
    className: 'border-yellow-500 text-yellow-600 bg-yellow-50',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    variant: 'outline',
    className: 'border-green-500 text-green-600 bg-green-50',
    icon: CheckCircle,
  },
  rejected: {
    label: 'Rejected',
    variant: 'outline',
    className: 'border-red-500 text-red-600 bg-red-50',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'outline',
    className: 'border-gray-400 text-gray-500 bg-gray-50',
    icon: Ban,
  },
};

export function LeaveStatusBadge({ status, showIcon = true }: LeaveStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
