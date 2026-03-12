'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ShipmentTracking,
  TRACKING_EVENT_TYPE_LABELS,
  TRACKING_EVENT_TYPE_COLORS,
  TrackingEventType,
} from '@/types/agency';
import { sortTrackingEventsByTimestamp } from '@/lib/vessel-tracking-utils';
import { format, parseISO } from 'date-fns';
import {
  Package,
  ArrowRight,
  Ship,
  MapPin,
  CheckCircle2,
  Circle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingTimelineProps {
  events: ShipmentTracking[];
  title?: string;
  showHeader?: boolean;
  className?: string;
}

/**
 * Chronological event timeline for shipment tracking.
 * Displays events in order with visual connectors.
 * 
 * **Requirements: 4.6, 5.4**
 */
export function TrackingTimeline({
  events,
  title = 'Tracking Timeline',
  showHeader = true,
  className,
}: TrackingTimelineProps) {
  // Sort events chronologically
  const sortedEvents = sortTrackingEventsByTimestamp(events);

  // Format date/time for display
  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  // Format date only
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  // Format time only
  const formatTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'HH:mm');
    } catch {
      return dateStr;
    }
  };

  if (sortedEvents.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tracking events available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="secondary">{sortedEvents.length} events</Badge>
          </div>
        </CardHeader>
      )}
      <CardContent>
        <div className="relative">
          {sortedEvents.map((event, index) => (
            <TimelineEvent
              key={event.id}
              event={event}
              isFirst={index === 0}
              isLast={index === sortedEvents.length - 1}
              formatDateTime={formatDateTime}
              formatDate={formatDate}
              formatTime={formatTime}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual timeline event component
 */
interface TimelineEventProps {
  event: ShipmentTracking;
  isFirst: boolean;
  isLast: boolean;
  formatDateTime: (dateStr: string) => string;
  formatDate: (dateStr: string) => string;
  formatTime: (dateStr: string) => string;
}

function TimelineEvent({
  event,
  isFirst: _isFirst,
  isLast,
  formatDateTime: _formatDateTime,
  formatDate,
  formatTime,
}: TimelineEventProps) {
  // Get icon for event type
  const getEventIcon = (eventType: TrackingEventType) => {
    switch (eventType) {
      case 'booked':
        return <Package className="h-4 w-4" />;
      case 'gate_in':
      case 'gate_out':
        return <ArrowRight className="h-4 w-4" />;
      case 'loaded':
      case 'discharged':
        return <Ship className="h-4 w-4" />;
      case 'departed':
      case 'arrived':
        return <MapPin className="h-4 w-4" />;
      case 'transshipment':
        return <Ship className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Timeline connector line */}
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
      )}

      {/* Event indicator */}
      <div
        className={cn(
          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
          event.isActual
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-muted text-muted-foreground border-muted-foreground/30'
        )}
      >
        {getEventIcon(event.eventType)}
      </div>

      {/* Event content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="space-y-1">
            {/* Event type badge */}
            <div className="flex items-center gap-2">
              <Badge className={TRACKING_EVENT_TYPE_COLORS[event.eventType]}>
                {TRACKING_EVENT_TYPE_LABELS[event.eventType]}
              </Badge>
              {!event.isActual && (
                <Badge variant="outline" className="text-xs">
                  Estimated
                </Badge>
              )}
            </div>

            {/* Location */}
            {event.locationName && (
              <p className="text-sm font-medium">
                {event.locationName}
                {event.locationCode && (
                  <span className="text-muted-foreground ml-1">({event.locationCode})</span>
                )}
                {event.terminal && (
                  <span className="text-muted-foreground"> • {event.terminal}</span>
                )}
              </p>
            )}

            {/* Vessel info */}
            {event.vesselName && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Ship className="h-3 w-3" />
                {event.vesselName}
                {event.voyageNumber && ` / ${event.voyageNumber}`}
              </p>
            )}

            {/* Description */}
            {event.description && (
              <p className="text-sm text-muted-foreground">{event.description}</p>
            )}

            {/* Container number */}
            {event.containerNumber && (
              <p className="text-xs font-mono text-muted-foreground">
                Container: {event.containerNumber}
              </p>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-right shrink-0">
            <p className="text-sm font-medium">{formatDate(event.eventTimestamp)}</p>
            <p className="text-xs text-muted-foreground">{formatTime(event.eventTimestamp)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact timeline for smaller spaces
 */
interface CompactTimelineProps {
  events: ShipmentTracking[];
  maxEvents?: number;
  className?: string;
}

export function CompactTimeline({ events, maxEvents = 5, className }: CompactTimelineProps) {
  const sortedEvents = sortTrackingEventsByTimestamp(events);
  const displayEvents = sortedEvents.slice(-maxEvents);
  const hiddenCount = sortedEvents.length - displayEvents.length;

  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM HH:mm');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          +{hiddenCount} earlier events
        </p>
      )}
      {displayEvents.map((event, _index) => (
        <div
          key={event.id}
          className="flex items-center gap-2 text-sm"
        >
          <div
            className={cn(
              'h-2 w-2 rounded-full shrink-0',
              event.isActual ? 'bg-primary' : 'bg-muted-foreground/30'
            )}
          />
          <Badge
            variant="outline"
            className={cn('text-xs shrink-0', TRACKING_EVENT_TYPE_COLORS[event.eventType])}
          >
            {TRACKING_EVENT_TYPE_LABELS[event.eventType]}
          </Badge>
          <span className="truncate text-muted-foreground">
            {event.locationName || '-'}
          </span>
          <span className="text-xs text-muted-foreground shrink-0 ml-auto">
            {formatDateTime(event.eventTimestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Horizontal timeline for overview display
 */
interface HorizontalTimelineProps {
  events: ShipmentTracking[];
  className?: string;
}

export function HorizontalTimeline({ events, className }: HorizontalTimelineProps) {
  const sortedEvents = sortTrackingEventsByTimestamp(events);

  if (sortedEvents.length === 0) {
    return (
      <div className={cn('text-center py-4 text-muted-foreground', className)}>
        No tracking events
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div className="flex items-center min-w-max py-4">
        {sortedEvents.map((event, index) => (
          <div key={event.id} className="flex items-center">
            {/* Event node */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center border-2',
                  event.isActual
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-muted-foreground/30'
                )}
              >
                <span className="text-xs font-medium">{index + 1}</span>
              </div>
              <div className="mt-2 text-center max-w-[100px]">
                <p className="text-xs font-medium truncate">
                  {TRACKING_EVENT_TYPE_LABELS[event.eventType]}
                </p>
                {event.locationName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {event.locationName}
                  </p>
                )}
              </div>
            </div>

            {/* Connector line */}
            {index < sortedEvents.length - 1 && (
              <div className="h-0.5 w-12 bg-border mx-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
