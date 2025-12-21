'use client';

// =====================================================
// v0.36: ONBOARDING ROUTE TRACKER COMPONENT
// =====================================================

import { useOnboardingRouteTracker } from '@/hooks/use-onboarding-route-tracker';

interface OnboardingRouteTrackerProps {
  userId: string | null;
}

/**
 * Client component that tracks route visits for onboarding
 * Should be placed in the main layout
 */
export function OnboardingRouteTracker({ userId }: OnboardingRouteTrackerProps) {
  useOnboardingRouteTracker(userId);
  return null;
}
