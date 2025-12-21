'use client';

// =====================================================
// v0.36: ONBOARDING PROGRESS BAR COMPONENT
// =====================================================

import { Progress } from '@/components/ui/progress';
import { OnboardingProgressBarProps } from '@/types/onboarding';

export function OnboardingProgressBar({
  completed,
  total,
  points,
  showPoints = true,
}: OnboardingProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {completed} of {total} steps completed
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <Progress value={percentage} className="h-2" />
      {showPoints && points !== undefined && points > 0 && (
        <div className="text-xs text-muted-foreground">
          {points} points earned
        </div>
      )}
    </div>
  );
}
