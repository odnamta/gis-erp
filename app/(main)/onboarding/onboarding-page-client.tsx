'use client';

// =====================================================
// v0.36: ONBOARDING PAGE CLIENT COMPONENT
// =====================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OnboardingProgressBar } from '@/components/onboarding/onboarding-progress-bar';
import { OnboardingCategorySection } from '@/components/onboarding/onboarding-category-section';
import { skipOnboarding, getUserOnboardingProgress } from '@/lib/onboarding-actions';
import { UserOnboardingData, ONBOARDING_CATEGORIES } from '@/types/onboarding';
import { Target, ArrowLeft, SkipForward, Loader2 } from 'lucide-react';

interface OnboardingPageClientProps {
  userId: string;
  userName: string;
  initialData: UserOnboardingData;
}

export function OnboardingPageClient({
  userId,
  userName,
  initialData,
}: OnboardingPageClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const handleSkip = () => {
    startTransition(async () => {
      const result = await skipOnboarding(userId);
      if (result.success) {
        router.push('/dashboard');
      }
    });
  };

  const handleContinueLater = () => {
    router.push('/dashboard');
  };

  // If onboarding is complete, show completion message
  if (data.status?.is_onboarding_complete) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">Onboarding Complete!</h2>
            <p className="text-muted-foreground mb-6">
              You&apos;ve completed all onboarding steps. You&apos;re ready to use GAMA ERP!
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Getting Started with GAMA ERP</h1>
        </div>
      </div>

      {/* Welcome message */}
      <p className="text-muted-foreground">
        Welcome, {userName}! Complete these steps to get the most out of GAMA ERP.
      </p>

      {/* Overall Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <OnboardingProgressBar
            completed={data.status?.completed_steps || 0}
            total={data.status?.total_steps || 0}
            points={data.status?.total_points || 0}
            showPoints={true}
          />
        </CardContent>
      </Card>

      {/* Steps by Category */}
      <div className="space-y-8">
        {ONBOARDING_CATEGORIES.map((category) => (
          <OnboardingCategorySection
            key={category}
            category={category}
            steps={data.stepsByCategory[category] || []}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="ghost"
          onClick={handleSkip}
          disabled={isPending}
          className="text-muted-foreground"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <SkipForward className="h-4 w-4 mr-2" />
          )}
          Skip Onboarding
        </Button>
        <Button variant="outline" onClick={handleContinueLater}>
          I&apos;ll continue later
        </Button>
      </div>
    </div>
  );
}
