'use client';

// =====================================================
// v0.36: ONBOARDING ROUTE TRACKER HOOK
// =====================================================

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackRouteVisit } from '@/lib/onboarding-actions';

/**
 * Hook to track route visits for onboarding auto-completion
 * Should be used in a layout component that wraps all pages
 */
export function useOnboardingRouteTracker(userId: string | null) {
  const pathname = usePathname();
  const trackedRoutes = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || !pathname) return;

    // Don't track the same route twice in the same session
    if (trackedRoutes.current.has(pathname)) return;

    // Track the route visit
    trackRouteVisit(userId, pathname)
      .then(() => {
        trackedRoutes.current.add(pathname);
      })
      .catch((error) => {
        console.error('Error tracking route visit:', error);
      });
  }, [userId, pathname]);
}
