'use client';

import { cn } from '@/lib/utils';
import { getFreeTimeStatus } from '@/lib/fee-utils';
import { ContainerTracking, FreeTimeStatus } from '@/types/customs-fees';
import { differenceInDays, parseISO } from 'date-fns';
import { Clock, AlertTriangle, AlertCircle } from 'lucide-react';

interface FreeTimeIndicatorProps {
  container: ContainerTracking;
  showLabel?: boolean;
}

const statusConfig: Record<FreeTimeStatus, { 
  icon: typeof Clock; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  ok: {
    icon: Clock,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Within Free Time',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    label: 'Free Time Ending Soon',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Free Time Expired',
  },
};

export function FreeTimeIndicator({ container, showLabel = true }: FreeTimeIndicatorProps) {
  if (!container.free_time_end || container.status !== 'at_port') {
    return null;
  }

  const status = getFreeTimeStatus(container.free_time_end);
  const config = statusConfig[status];
  const Icon = config.icon;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const freeTimeEnd = parseISO(container.free_time_end);
  const daysRemaining = differenceInDays(freeTimeEnd, today);

  const getDaysText = () => {
    if (daysRemaining > 0) {
      return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`;
    } else if (daysRemaining === 0) {
      return 'Expires today';
    } else {
      return `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} overdue`;
    }
  };

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-md', config.bgColor)}>
      <Icon className={cn('h-4 w-4', config.color)} />
      <div className="flex flex-col">
        {showLabel && (
          <span className={cn('text-xs font-medium', config.color)}>
            {config.label}
          </span>
        )}
        <span className={cn('text-sm font-semibold', config.color)}>
          {getDaysText()}
        </span>
      </div>
    </div>
  );
}
