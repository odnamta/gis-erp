'use client';

/**
 * Tour Tooltip Component
 * v0.37: Training Mode / Guided Tours
 * 
 * Floating tooltip that displays tour step information and navigation
 */

import React, { useEffect, useState, useRef } from 'react';
import { TourStep, TourStepPlacement } from '@/types/guided-tours';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';

interface TourTooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  tourName: string;
  showBack: boolean;
  showNext: boolean;
  showFinish: boolean;
  showSkip: boolean;
  isLoading: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

interface Position {
  top: number;
  left: number;
}

/**
 * Calculate tooltip position based on target element and placement
 */
function calculatePosition(
  targetRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TourStepPlacement,
  gap: number = 12
): Position {
  let top = 0;
  let left = 0;

  switch (placement) {
    case 'top':
      top = targetRect.top - tooltipRect.height - gap;
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      break;
    case 'bottom':
      top = targetRect.bottom + gap;
      left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
      break;
    case 'left':
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      left = targetRect.left - tooltipRect.width - gap;
      break;
    case 'right':
      top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
      left = targetRect.right + gap;
      break;
  }

  // Keep tooltip within viewport
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const padding = 16;

  // Horizontal bounds
  if (left < padding) {
    left = padding;
  } else if (left + tooltipRect.width > viewportWidth - padding) {
    left = viewportWidth - tooltipRect.width - padding;
  }

  // Vertical bounds
  if (top < padding) {
    top = padding;
  } else if (top + tooltipRect.height > viewportHeight - padding) {
    top = viewportHeight - tooltipRect.height - padding;
  }

  return { top, left };
}

export function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  tourName,
  showBack,
  showNext,
  showFinish,
  showSkip,
  isLoading,
  onNext,
  onBack,
  onSkip,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const targetElement = document.querySelector(step.target);
      const tooltipElement = tooltipRef.current;

      if (!targetElement || !tooltipElement) {
        // If target not found, center the tooltip
        const tooltipRect = tooltipElement?.getBoundingClientRect() || { width: 320, height: 200 };
        setPosition({
          top: window.innerHeight / 2 - tooltipRect.height / 2,
          left: window.innerWidth / 2 - tooltipRect.width / 2,
        });
        setIsPositioned(true);
        return;
      }

      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipElement.getBoundingClientRect();

      const newPosition = calculatePosition(targetRect, tooltipRect, step.placement);
      setPosition(newPosition);
      setIsPositioned(true);
    };

    // Initial position
    updatePosition();

    // Update on scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [step.target, step.placement]);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[10001] w-80 transition-opacity duration-200"
      style={{
        top: position.top,
        left: position.left,
        opacity: isPositioned ? 1 : 0,
      }}
    >
      <Card className="shadow-lg border-2 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Step {stepIndex + 1} of {totalSteps}
            </span>
            {showSkip && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onSkip}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Skip tour</span>
              </Button>
            )}
          </div>
          <h4 className="font-semibold text-base flex items-center gap-2">
            <span className="text-lg">📍</span>
            {step.title}
          </h4>
        </CardHeader>
        
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground">{step.content}</p>
        </CardContent>
        
        <CardFooter className="pt-0 flex justify-between gap-2">
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
          
          <div className="flex gap-2">
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
        </CardFooter>
      </Card>
    </div>
  );
}

export default TourTooltip;
