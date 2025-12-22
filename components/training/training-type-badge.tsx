'use client';

import { Badge } from '@/components/ui/badge';
import { TrainingType } from '@/types/training';
import { getTrainingTypeLabel, getTrainingTypeColor } from '@/lib/training-utils';

interface TrainingTypeBadgeProps {
  type: TrainingType;
}

export function TrainingTypeBadge({ type }: TrainingTypeBadgeProps) {
  return (
    <Badge className={getTrainingTypeColor(type)} variant="secondary">
      {getTrainingTypeLabel(type)}
    </Badge>
  );
}
