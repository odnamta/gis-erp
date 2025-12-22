'use client';

import { Badge } from '@/components/ui/badge';
import { TrainingRecordStatus, TRAINING_RECORD_STATUS_LABELS } from '@/types/training';

interface TrainingStatusBadgeProps {
  status: TrainingRecordStatus;
}

const STATUS_VARIANTS: Record<TrainingRecordStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  scheduled: 'outline',
  in_progress: 'secondary',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'outline',
};

const STATUS_COLORS: Record<TrainingRecordStatus, string> = {
  scheduled: 'border-blue-500 text-blue-700 bg-blue-50',
  in_progress: 'border-yellow-500 text-yellow-700 bg-yellow-50',
  completed: 'border-green-500 text-green-700 bg-green-50',
  failed: 'border-red-500 text-red-700 bg-red-50',
  cancelled: 'border-gray-500 text-gray-700 bg-gray-50',
};

export function TrainingStatusBadge({ status }: TrainingStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} className={STATUS_COLORS[status]}>
      {TRAINING_RECORD_STATUS_LABELS[status]}
    </Badge>
  );
}
