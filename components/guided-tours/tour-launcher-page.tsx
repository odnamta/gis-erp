'use client';

/**
 * Tour Launcher Page Component
 * v0.37: Training Mode / Guided Tours
 * 
 * Page content for browsing and starting guided tours
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TourWithProgress } from '@/types/guided-tours';
import { getAvailableTours } from '@/lib/guided-tours-actions';
import { TourCard } from './tour-card';
import { useTourContext } from './tour-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TourLauncherPage() {
  const router = useRouter();
  const { start: startTour, isLoading: isTourLoading } = useTourContext();
  
  const [tours, setTours] = useState<TourWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTours() {
      setIsLoading(true);
      setError(null);
      
      const result = await getAvailableTours();
      
      if (result.error) {
        setError(result.error);
      } else {
        setTours(result.data || []);
      }
      
      setIsLoading(false);
    }

    fetchTours();
  }, []);

  const handleStartTour = async (tourId: string) => {
    await startTour(tourId, true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (tours.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Tours Available</h3>
          <p className="text-muted-foreground text-center">
            There are no guided tours available for your role at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Guided Tours</h1>
        <p className="text-muted-foreground mt-1">
          Learn the system step-by-step with interactive tutorials.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tours.map((tourWithProgress) => (
          <TourCard
            key={tourWithProgress.tour.id}
            tourWithProgress={tourWithProgress}
            onStart={handleStartTour}
            isLoading={isTourLoading}
          />
        ))}
      </div>
    </div>
  );
}

export default TourLauncherPage;
