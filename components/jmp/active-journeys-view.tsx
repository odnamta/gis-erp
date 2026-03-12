'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Phone, MapPin, AlertTriangle } from 'lucide-react';
import { JmpWithRelations } from '@/types/jmp';
import { getActiveJourneys } from '@/lib/jmp-actions';
import { calculateJourneyProgress } from '@/lib/jmp-utils';

export function ActiveJourneysView() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<JmpWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchJourneys = async () => {
    setLoading(true);
    const data = await getActiveJourneys();
    setJourneys(data);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => {
    fetchJourneys();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchJourneys, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Active Journeys</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {format(lastRefresh, 'HH:mm:ss')}
          </p>
        </div>
        <Button variant="outline" onClick={fetchJourneys} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {journeys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active journeys at the moment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {journeys.map((jmp) => {
            const progressData = calculateJourneyProgress(jmp.checkpoints || []);
            const completedCheckpoints = progressData.checkpointsCompleted;
            const totalCheckpoints = progressData.totalCheckpoints;
            const onSchedule = progressData.isOnSchedule;

            return (
              <Card
                key={jmp.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  !onSchedule ? 'border-yellow-300' : ''
                }`}
                onClick={() => router.push(`/engineering/jmp/${jmp.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{jmp.jmpNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">{jmp.journeyTitle}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!onSchedule && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Behind Schedule
                        </Badge>
                      )}
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Customer</span>
                      <p className="font-medium">{jmp.customer?.name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Route</span>
                      <p className="font-medium truncate">
                        {jmp.originLocation} → {jmp.destinationLocation}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Started</span>
                      <p className="font-medium">
                        {jmp.actualDeparture
                          ? format(new Date(jmp.actualDeparture), 'dd/MM HH:mm')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Commander</span>
                      <p className="font-medium flex items-center gap-1">
                        {jmp.convoyCommander?.full_name || '-'}
                        {jmp.convoyCommander?.phone && (
                          <a
                            href={`tel:${jmp.convoyCommander.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600"
                          >
                            <Phone className="h-3 w-3" />
                          </a>
                        )}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Progress</span>
                      <span className="text-sm font-medium">
                        {completedCheckpoints}/{totalCheckpoints} checkpoints ({progressData.progressPercent}%)
                      </span>
                    </div>
                    <Progress value={progressData.progressPercent} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
