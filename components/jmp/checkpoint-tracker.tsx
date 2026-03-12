'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Clock, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { JmpCheckpoint } from '@/types/jmp';
import { markCheckpointArrival, markCheckpointDeparture } from '@/lib/jmp-actions';
import { formatLocationType, calculateJourneyProgress } from '@/lib/jmp-utils';

interface CheckpointTrackerProps {
  checkpoints: JmpCheckpoint[];
  jmpId: string;
  onUpdate: () => void;
}

export function CheckpointTracker({ checkpoints, jmpId: _jmpId, onUpdate }: CheckpointTrackerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const progressData = calculateJourneyProgress(checkpoints);
  const currentCheckpoint = checkpoints.find(
    (cp) => cp.status === 'pending' || cp.status === 'arrived'
  );

  const handleArrival = async (checkpointId: string) => {
    setLoading(checkpointId);
    const result = await markCheckpointArrival(checkpointId);
    setLoading(null);
    
    if (result.success) {
      toast({ title: 'Arrival recorded' });
      onUpdate();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleDeparture = async (checkpointId: string) => {
    setLoading(checkpointId);
    const result = await markCheckpointDeparture(checkpointId);
    setLoading(null);
    
    if (result.success) {
      toast({ title: 'Departure recorded' });
      onUpdate();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'departed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'arrived':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return <MapPin className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Journey Progress</span>
            <span className="text-2xl font-bold">{progressData.progressPercent}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={progressData.progressPercent} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {progressData.checkpointsCompleted} of {progressData.totalCheckpoints} checkpoints completed
          </p>
        </CardContent>
      </Card>

      {currentCheckpoint && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">Current Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{currentCheckpoint.locationName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatLocationType(currentCheckpoint.locationType)}
                  {currentCheckpoint.kmFromStart && ` • ${currentCheckpoint.kmFromStart} km`}
                </p>
              </div>
              <Badge className={currentCheckpoint.status === 'arrived' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}>
                {currentCheckpoint.status === 'arrived' ? 'At Location' : 'En Route'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {checkpoints.map((cp, _idx) => (
          <Card key={cp.id} className={cp.status === 'departed' ? 'opacity-60' : ''}>
            <CardContent className="py-3">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {getStatusIcon(cp.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cp.locationName}</span>
                    {cp.kmFromStart !== undefined && (
                      <span className="text-xs text-muted-foreground">({cp.kmFromStart} km)</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {cp.plannedArrival && (
                      <span>Plan: {format(new Date(cp.plannedArrival), 'HH:mm')}</span>
                    )}
                    {cp.actualArrival && (
                      <span className="ml-2">• Actual: {format(new Date(cp.actualArrival), 'HH:mm')}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {cp.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleArrival(cp.id)}
                      disabled={loading === cp.id}
                    >
                      {loading === cp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <MapPin className="h-4 w-4 mr-1" />
                          Arrive
                        </>
                      )}
                    </Button>
                  )}
                  {cp.status === 'arrived' && (
                    <Button
                      size="sm"
                      onClick={() => handleDeparture(cp.id)}
                      disabled={loading === cp.id}
                    >
                      {loading === cp.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Depart
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
