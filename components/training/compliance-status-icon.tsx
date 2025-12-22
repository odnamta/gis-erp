'use client';

import { ComplianceStatus, COMPLIANCE_STATUS_LABELS } from '@/types/training';
import { CheckCircle, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ComplianceStatusIconProps {
  status: ComplianceStatus;
  showTooltip?: boolean;
}

const STATUS_CONFIG: Record<ComplianceStatus, {
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
}> = {
  valid: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  expiring_soon: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  expired: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  not_trained: {
    icon: MinusCircle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
  },
};

export function ComplianceStatusIcon({ status, showTooltip = true }: ComplianceStatusIconProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const iconElement = (
    <div className={`p-1 rounded ${config.bgColor}`}>
      <Icon className={`h-4 w-4 ${config.color}`} />
    </div>
  );

  if (!showTooltip) {
    return iconElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {iconElement}
        </TooltipTrigger>
        <TooltipContent>
          <p>{COMPLIANCE_STATUS_LABELS[status]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
