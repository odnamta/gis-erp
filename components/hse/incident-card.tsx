'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MapPin, Calendar, User } from 'lucide-react';
import { Incident } from '@/types/incident';
import { SeverityBadge } from './severity-badge';
import { StatusBadge } from './status-badge';
import { formatIncidentDate, getLocationTypeLabel } from '@/lib/incident-utils';

interface IncidentCardProps {
  incident: Incident;
}

export function IncidentCard({ incident }: IncidentCardProps) {
  return (
    <Link href={`/hse/incidents/${incident.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {incident.incidentNumber}
              </p>
              <h3 className="font-semibold leading-tight line-clamp-2">
                {incident.title}
              </h3>
            </div>
            <SeverityBadge severity={incident.severity} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={incident.status} />
            {incident.categoryName && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {incident.categoryName}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatIncidentDate(incident.incidentDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">
                {incident.locationName || getLocationTypeLabel(incident.locationType)}
              </span>
            </div>
          </div>

          {incident.investigatorName && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>Investigator: {incident.investigatorName}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
