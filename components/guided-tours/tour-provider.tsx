'use client';

/**
 * Tour Provider
 * v0.37: Training Mode / Guided Tours
 * 
 * Context provider for managing guided tour state across the application
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useTour, UseTourReturn } from '@/hooks/use-tour';
import { TourTooltip } from './tour-tooltip';
import { TourHighlight } from './tour-highlight';

// Create context with undefined default
const TourContext = createContext<UseTourReturn | undefined>(undefined);

interface TourProviderProps {
  children: ReactNode;
}

/**
 * Tour Provider Component
 * Wraps the application to provide tour context and render tour UI
 */
export function TourProvider({ children }: TourProviderProps) {
  const tour = useTour();

  return (
    <TourContext.Provider value={tour}>
      {children}
      
      {/* Render tour UI when active */}
      {tour.isActive && tour.currentStep && (
        <>
          <TourHighlight target={tour.currentStep.target} />
          <TourTooltip
            step={tour.currentStep}
            stepIndex={tour.stepIndex}
            totalSteps={tour.totalSteps}
            tourName={tour.tourName}
            showBack={tour.showBack}
            showNext={tour.showNext}
            showFinish={tour.showFinish}
            showSkip={tour.showSkip}
            isLoading={tour.isLoading}
            onNext={tour.next}
            onBack={tour.back}
            onSkip={tour.skip}
          />
        </>
      )}
    </TourContext.Provider>
  );
}

/**
 * Hook to access tour context
 */
export function useTourContext(): UseTourReturn {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTourContext must be used within a TourProvider');
  }
  return context;
}

export default TourProvider;
