'use client';

/**
 * useTour Hook
 * v0.37: Training Mode / Guided Tours
 * 
 * React hook for managing guided tour state and navigation
 */

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GuidedTour,
  TourStep,
  TourProgress,
} from '@/types/guided-tours';
import {
  getTourByCode,
  getTourById,
  startTour as startTourAction,
  advanceTourStep,
  goBackTourStep,
  skipTour as skipTourAction,
  getTourProgress,
} from '@/lib/guided-tours-actions';
import { getNavigationState } from '@/lib/guided-tours-utils';

export interface UseTourReturn {
  // State
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  currentTour: GuidedTour | null;
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  tourName: string;
  
  // Navigation state
  showBack: boolean;
  showNext: boolean;
  showFinish: boolean;
  showSkip: boolean;
  
  // Actions
  start: (tourCodeOrId: string, byId?: boolean) => Promise<void>;
  next: () => Promise<void>;
  back: () => Promise<void>;
  skip: () => Promise<void>;
  end: () => void;
}

export function useTour(): UseTourReturn {
  const router = useRouter();
  
  // State
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTour, setCurrentTour] = useState<GuidedTour | null>(null);
  const [currentStep, setCurrentStep] = useState<TourStep | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  // Derived values
  const totalSteps = currentTour?.steps.length || 0;
  const tourName = currentTour?.tourName || '';
  const navState = getNavigationState(stepIndex, totalSteps);

  /**
   * Start a tour by code or ID
   */
  const start = useCallback(async (tourCodeOrId: string, byId = false) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch tour details
      const tourResult = byId 
        ? await getTourById(tourCodeOrId)
        : await getTourByCode(tourCodeOrId);

      if (tourResult.error || !tourResult.data) {
        setError(tourResult.error || 'Tour not found');
        setIsLoading(false);
        return;
      }

      const tour = tourResult.data;

      // Navigate to start route if not already there
      if (tour.startRoute && typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath !== tour.startRoute) {
          router.push(tour.startRoute);
        }
      }

      // Start the tour (creates/updates progress)
      const startResult = await startTourAction(tour.id);

      if (startResult.error || !startResult.data) {
        setError(startResult.error || 'Failed to start tour');
        setIsLoading(false);
        return;
      }

      const { steps, currentStep: resumeStep } = startResult.data;

      // Set state
      setCurrentTour(tour);
      setStepIndex(resumeStep);
      setCurrentStep(steps[resumeStep] || null);
      setIsActive(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error starting tour:', err);
      setError('Failed to start tour');
      setIsLoading(false);
    }
  }, [router]);

  /**
   * Advance to the next step
   */
  const next = useCallback(async () => {
    if (!currentTour || !isActive) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await advanceTourStep(currentTour.id);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.data?.isComplete) {
        // Tour completed
        setIsActive(false);
        setCurrentStep(null);
        setCurrentTour(null);
        setStepIndex(0);
      } else if (result.data?.step) {
        // Move to next step
        setStepIndex(result.data.stepIndex);
        setCurrentStep(result.data.step);

        // Navigate if step has nextRoute
        if (result.data.step.nextRoute) {
          router.push(result.data.step.nextRoute);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error advancing step:', err);
      setError('Failed to advance step');
      setIsLoading(false);
    }
  }, [currentTour, isActive, router]);

  /**
   * Go back to the previous step
   */
  const back = useCallback(async () => {
    if (!currentTour || !isActive || stepIndex === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await goBackTourStep(currentTour.id);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      if (result.data) {
        setStepIndex(result.data.stepIndex);
        setCurrentStep(result.data.step);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error going back:', err);
      setError('Failed to go back');
      setIsLoading(false);
    }
  }, [currentTour, isActive, stepIndex]);

  /**
   * Skip/abandon the tour
   */
  const skip = useCallback(async () => {
    if (!currentTour) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await skipTourAction(currentTour.id);

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Reset state
      setIsActive(false);
      setCurrentStep(null);
      setCurrentTour(null);
      setStepIndex(0);
      setIsLoading(false);
    } catch (err) {
      console.error('Error skipping tour:', err);
      setError('Failed to skip tour');
      setIsLoading(false);
    }
  }, [currentTour]);

  /**
   * End the tour without saving (local only)
   */
  const end = useCallback(() => {
    setIsActive(false);
    setCurrentStep(null);
    setCurrentTour(null);
    setStepIndex(0);
    setError(null);
  }, []);

  return {
    // State
    isActive,
    isLoading,
    error,
    currentTour,
    currentStep,
    stepIndex,
    totalSteps,
    tourName,
    
    // Navigation state
    showBack: navState.showBack,
    showNext: navState.showNext,
    showFinish: navState.showFinish,
    showSkip: navState.showSkip,
    
    // Actions
    start,
    next,
    back,
    skip,
    end,
  };
}

export default useTour;
