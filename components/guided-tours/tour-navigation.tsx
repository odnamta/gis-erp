'use client';

/**
 * Tour Navigation Component
 * v0.37: Training Mode / Guided Tours
 * 
 * Standalone navigation buttons for tour control
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { TourNavigationState } from '@/types/guided-tours';

interface TourNavigationProps extends TourNavigationState {
  isLoading?: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  variant?: 'default' | 'compact';
}

export function TourNavigation({
  showBack,
  showNext,
  showFinish,
  showSkip,
  isLoading = false,
  onNext,
  onBack,
  onSkip,
  variant = 'default',
}: TourNavigationProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onBack}
            disabled={isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous step</span>
          </Button>
        )}
        
        {showSkip && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSkip}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Skip tour</span>
          </Button>
        )}
        
        {(showNext || showFinish) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="sr-only">{showFinish ? 'Finish tour' : 'Next step'}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        {showBack && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            disabled={isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {showSkip && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            disabled={isLoading}
          >
            Skip Tour
          </Button>
        )}
        
        {showNext && (
          <Button
            size="sm"
            onClick={onNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        )}
        
        {showFinish && (
          <Button
            size="sm"
            onClick={onNext}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Finish'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export default TourNavigation;
