'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Incident } from '@/types/incident';
import { SeverityBadge } from './severity-badge';
import { StatusBadge } from './status-badge';
import { formatIncidentDate, formatIncidentTime, getLocationTypeLabel } from '@/lib/incident-utils';

interface IncidentDetailHeaderProps {
  incident: Incident;
  onStartInvestigation?: () => void;
  onClose?: () => void;
  onReject?: () => void;
  canStartInvestigation?: boolean;
  canClose?: boolean;
  canReject?: boolean;
}

export function IncidentDetailHeader({
  incident,
  onStartInvestigation,
  onClose,
  onReject,
  canStartInvestigation,
  canClose,
  canReject,
}: IncidentDetailHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hse/incidents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="text-muted-foreground">{incident.incidentNumber}</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            {incident.categoryName && (
              <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                {incident.categoryName}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{incident.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              {formatIncidentDate(incident.incidentDate)}
              {incident.incidentTime && ` ${formatIncidentTime(incident.incidentTime)}`}
            </span>
            <span>
              {incident.locationName || getLocationTypeLabel(incident.locationType)}
            </span>
            {incident.reportedByName && (
              <span>Dilaporkan oleh: {incident.reportedByName}</span>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {canStartInvestigation && incident.status === 'reported' && (
            <Button onClick={onStartInvestigation}>
              <Search className="h-4 w-4 mr-2" />
              Mulai Investigasi
            </Button>
          )}
          {canClose && (
            <Button variant="default" onClick={onClose}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Tutup Insiden
            </Button>
          )}
          {canReject && incident.status === 'reported' && (
            <Button variant="outline" onClick={onReject}>
              <XCircle className="h-4 w-4 mr-2" />
              Tolak
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
