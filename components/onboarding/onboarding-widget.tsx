'use client';

// =====================================================
// v0.36: ONBOARDING WIDGET COMPONENT
// =====================================================

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OnboardingProgressBar } from './onboarding-progress-bar';
import { OnboardingStepCard } from './onboarding-step-card';
import { getUserOnboardingProgress, hideOnboardingWidget } from '@/lib/onboarding-actions';
import { UserOnboardingData, OnboardingWidgetProps } from '@/types/onboarding';
import { Target, X, ChevronRight, Loader2 } from 'lucide-react';

export function OnboardingWidget({
  userId,
  onHide,
  maxSteps = 3,
}: OnboardingWidgetProps) {
  const [data, setData] = useState<UserOnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getUserOnboardingProgress(userId);
        setData(result);
      } catch (error) {
        console.error('Error fetching onboarding progress:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  const handleHide = () => {
    startTransition(async () => {
      await hideOnboardingWidget(userId);
      if (onHide) {
        onHide();
      }
    });
  };

  // Don't render if loading, no data, or widget should be hidden
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.status || !data.status.show_onboarding_widget) {
    return null;
  }

  // Don't show if onboarding is complete
  if (data.status.is_onboarding_complete) {
    return null;
  }

  const nextSteps = data.nextSteps.slice(0, maxSteps);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Getting Started</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleHide}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Hide</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <OnboardingProgressBar
          completed={data.status.completed_steps}
          total={data.status.total_steps}
          points={data.status.total_points}
          showPoints={false}
        />

        {nextSteps.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Next up:</p>
            <div className="space-y-2">
              {nextSteps.map((progress) => (
                <OnboardingStepCard
                  key={progress.id}
                  progress={progress}
                  showPoints={false}
                />
              ))}
            </div>
          </div>
        )}

        <Link href="/onboarding" className="block">
          <Button variant="outline" className="w-full" size="sm">
            View All Steps
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
