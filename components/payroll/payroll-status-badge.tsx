'use client';

import { Badge } from '@/components/ui/badge';
import { PayrollPeriodStatus, PayrollRecordStatus } from '@/types/payroll';

interface PayrollStatusBadgeProps {
  status: PayrollPeriodStatus | PayrollRecordStatus;
  type?: 'period' | 'record';
}

const periodStatusConfig: Record<PayrollPeriodStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  paid: { label: 'Paid', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
  closed: { label: 'Closed', className: 'bg-slate-100 text-slate-800 hover:bg-slate-100' },
};

const recordStatusConfig: Record<PayrollRecordStatus, { label: string; className: string }> = {
  calculated: { label: 'Calculated', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  paid: { label: 'Paid', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100' },
};

export function PayrollStatusBadge({ status, type = 'period' }: PayrollStatusBadgeProps) {
  const config = type === 'period' 
    ? periodStatusConfig[status as PayrollPeriodStatus]
    : recordStatusConfig[status as PayrollRecordStatus];

  if (!config) {
    return <Badge variant="outline">{status}</Badge>;
  }

  return (
    <Badge className={config.className} variant="secondary">
      {config.label}
    </Badge>
  );
}
