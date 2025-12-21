'use client';

// =====================================================
// v0.36: ONBOARDING CATEGORY SECTION COMPONENT
// =====================================================

import { OnboardingStepCard } from './onboarding-step-card';
import { OnboardingProgressWithStep, OnboardingCategory, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/onboarding';
import { CheckCircle2 } from 'lucide-react';

interface OnboardingCategorySectionProps {
  category: OnboardingCategory;
  steps: OnboardingProgressWithStep[];
}

export function OnboardingCategorySection({
  category,
  steps,
}: OnboardingCategorySectionProps) {
  if (steps.length === 0) return null;

  const completedCount = steps.filter(s => s.status === 'completed').length;
  const isComplete = completedCount === steps.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{CATEGORY_ICONS[category]}</span>
          <h3 className="text-lg font-semibold uppercase tracking-wide">
            {CATEGORY_LABELS[category]}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{completedCount}/{steps.length}</span>
          {isComplete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
        </div>
      </div>
      <div className="space-y-3">
        {steps.map((progress) => (
          <OnboardingStepCard
            key={progress.id}
            progress={progress}
            showPoints={true}
          />
        ))}
      </div>
    </div>
  );
}
