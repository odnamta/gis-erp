'use client';

/**
 * Tour Card Component
 * v0.37: Training Mode / Guided Tours
 * 
 * Card displaying a single tour with status and action button
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, PlayCircle, RotateCcw } from 'lucide-react';
import { TourWithProgress } from '@/types/guided-tours';
import { 
  formatEstimatedDuration, 
  getTourStatusDisplay,
  getProgressText,
} from '@/lib/guided-tours-utils';

interface TourCardProps {
  tourWithProgress: TourWithProgress;
  onStart: (tourId: string) => void;
  isLoading?: boolean;
}

const TOUR_ICONS: Record<string, string> = {
  dashboard_tour: '🎯',
  quotation_tour: '📝',
  invoice_tour: '💰',
  bkk_tour: '💵',
};

export function TourCard({ tourWithProgress, onStart, isLoading = false }: TourCardProps) {
  const { tour, progress } = tourWithProgress;
  const status = progress?.status || 'not_started';
  const statusDisplay = getTourStatusDisplay(status);
  const icon = TOUR_ICONS[tour.tourCode] || '📚';

  const handleClick = () => {
    onStart(tour.id);
  };

  const getButtonContent = () => {
    if (status === 'completed') {
      return (
        <>
          <RotateCcw className="h-4 w-4 mr-2" />
          Restart Tour
        </>
      );
    }
    if (status === 'in_progress') {
      return (
        <>
          <PlayCircle className="h-4 w-4 mr-2" />
          Continue
        </>
      );
    }
    return (
      <>
        <PlayCircle className="h-4 w-4 mr-2" />
        Start Tour
      </>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <CardTitle className="text-lg">{tour.tourName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatEstimatedDuration(tour.estimatedMinutes)}
                </Badge>
              </div>
            </div>
          </div>
          
          {status === 'completed' && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <CardDescription className="mb-4">
          {tour.description}
        </CardDescription>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${statusDisplay.className}`}>
              {statusDisplay.icon} {statusDisplay.label}
            </span>
            {status === 'in_progress' && progress && (
              <span className="text-xs text-muted-foreground">
                ({getProgressText(progress.currentStep, tour.steps.length)})
              </span>
            )}
          </div>
          
          <Button
            variant={status === 'completed' ? 'outline' : 'default'}
            size="sm"
            onClick={handleClick}
            disabled={isLoading}
          >
            {getButtonContent()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default TourCard;
