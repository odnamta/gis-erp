'use client';

// =====================================================
// v0.36: DASHBOARD WITH ONBOARDING WRAPPER
// =====================================================

import { useState, useEffect } from 'react';
import { OnboardingWidget } from './onboarding-widget';
import { getUserOnboardingProgress } from '@/lib/onboarding-actions';

interface DashboardWithOnboardingProps {
  userId: string;
  children: React.ReactNode;
}

export function DashboardWithOnboarding({
  userId,
  children,
}: DashboardWithOnboardingProps) {
  const [showWidget, setShowWidget] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const data = await getUserOnboardingProgress(userId);
        setShowWidget(data.status?.show_onboarding_widget ?? true);
        setIsComplete(data.status?.is_onboarding_complete ?? false);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    }
    checkOnboardingStatus();
  }, [userId]);

  const handleHideWidget = () => {
    setShowWidget(false);
  };

  // Don't show widget if onboarding is complete or widget is hidden
  const shouldShowWidget = showWidget && !isComplete;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1">{children}</div>
      {shouldShowWidget && (
        <div className="lg:w-80 shrink-0">
          <OnboardingWidget userId={userId} onHide={handleHideWidget} />
        </div>
      )}
    </div>
  );
}
