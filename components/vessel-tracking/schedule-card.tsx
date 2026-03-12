'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  VesselSchedule,
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_COLORS,
  SCHEDULE_TYPE_LABELS,
  getDelaySeverity,
  DELAY_SEVERITY_COLORS,
} from '@/types/agency';
import { format, parseISO } from 'date-fns';
import {
  Ship,
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Anchor,
  FileText,
  Package,
} from 'lucide-react';
import Link from 'next/link';

interface ScheduleCardProps {
  schedule: VesselSchedule;
  onView?: (schedule: VesselSchedule) => void;
  onEdit?: (schedule: VesselSchedule) => void;
  showVesselInfo?: boolean;
}

/**
 * Card component for displaying vessel schedule/port call information.
 * Shows port, times, status, and delay indicator if applicable.
 * 
 * **Requirements: 2.1-2.8, 8.1-8.5**
 */
export function ScheduleCard({ schedule, onView, onEdit, showVesselInfo = true }: ScheduleCardProps) {
  // Format date/time for display
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  // Format date only
  const _formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  // Format time only
  const _formatTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'HH:mm');
    } catch {
      return dateStr;
    }
  };

  // Get delay severity for styling
  const delaySeverity = getDelaySeverity(schedule.delayHours);
  const hasDelay = schedule.delayHours > 0;

  return (
    <Card className={`hover:shadow-md transition-shadow ${hasDelay ? 'border-l-4 border-l-orange-400' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {schedule.portName}
              </h3>
              <Badge className={SCHEDULE_STATUS_COLORS[schedule.status]}>
                {SCHEDULE_STATUS_LABELS[schedule.status]}
              </Badge>
              {schedule.scheduleType !== 'scheduled' && (
                <Badge variant="outline">
                  {SCHEDULE_TYPE_LABELS[schedule.scheduleType]}
                </Badge>
              )}
            </div>
            {schedule.terminal && (
              <p className="text-sm text-muted-foreground mt-1">
                Terminal: {schedule.terminal}
                {schedule.berth && ` • Berth: ${schedule.berth}`}
              </p>
            )}
          </div>
          <div className="flex gap-1 ml-2">
            {onView ? (
              <Button variant="ghost" size="icon" title="View details" onClick={() => onView(schedule)}>
                <Eye className="h-4 w-4" />
              </Button>
            ) : (
              <Link href={`/agency/schedules/${schedule.id}`}>
                <Button variant="ghost" size="icon" title="View details">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {onEdit ? (
              <Button variant="ghost" size="icon" title="Edit schedule" onClick={() => onEdit(schedule)}>
                <Edit className="h-4 w-4" />
              </Button>
            ) : (
              <Link href={`/agency/schedules/${schedule.id}/edit`}>
                <Button variant="ghost" size="icon" title="Edit schedule">
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Vessel & Voyage Info */}
        {showVesselInfo && (
          <div className="flex items-center gap-4 text-sm">
            {schedule.vessel && (
              <div className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{schedule.vessel.vesselName}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Anchor className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-xs">Voyage: {schedule.voyageNumber}</span>
            </div>
          </div>
        )}

        {/* Arrival Times */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Scheduled Arrival</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formatDateTime(schedule.scheduledArrival)}</span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Actual Arrival</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className={hasDelay ? 'text-orange-600 font-medium' : ''}>
                {formatDateTime(schedule.actualArrival)}
              </span>
            </div>
          </div>
        </div>

        {/* Departure Times */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Scheduled Departure</p>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatDateTime(schedule.scheduledDeparture)}</span>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Actual Departure</p>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{formatDateTime(schedule.actualDeparture)}</span>
            </div>
          </div>
        </div>

        {/* Delay Indicator */}
        {hasDelay && (
          <div className={`flex items-center gap-2 p-2 rounded-md ${DELAY_SEVERITY_COLORS[delaySeverity]}`}>
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">
              Delayed: {schedule.delayHours > 0 ? '+' : ''}{schedule.delayHours} hours
            </span>
            {schedule.delayReason && (
              <span className="text-sm">• {schedule.delayReason}</span>
            )}
          </div>
        )}

        {/* Cutoff Times */}
        {(schedule.cargoCutoff || schedule.docCutoff || schedule.vgmCutoff) && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Cutoff Times</p>
            <div className="flex flex-wrap gap-4 text-sm">
              {schedule.cargoCutoff && (
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">Cargo: {formatDateTime(schedule.cargoCutoff)}</span>
                </div>
              )}
              {schedule.docCutoff && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">Doc: {formatDateTime(schedule.docCutoff)}</span>
                </div>
              )}
              {schedule.vgmCutoff && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono text-muted-foreground">VGM:</span>
                  <span className="text-xs">{formatDateTime(schedule.vgmCutoff)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Info */}
        {(schedule.serviceName || schedule.serviceCode) && (
          <div className="text-xs text-muted-foreground">
            {schedule.serviceName}
            {schedule.serviceCode && ` (${schedule.serviceCode})`}
          </div>
        )}

        {/* Notes */}
        {schedule.notes && (
          <p className="text-xs text-muted-foreground italic truncate">
            {schedule.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
