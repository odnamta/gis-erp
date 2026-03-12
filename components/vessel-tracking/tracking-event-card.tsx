'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ShipmentTracking,
  TrackingEventType,
  TRACKING_EVENT_TYPE_LABELS,
  TRACKING_EVENT_TYPE_COLORS,
} from '@/types/agency';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  Package,
  ArrowRight,
  Ship,
  MapPin,
  Calendar,
  Clock,
  Circle,
  Eye,
  Trash2,
  FileText,
  Container,
  Truck,
  Warehouse,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackingEventCardProps {
  event: ShipmentTracking;
  onView?: (event: ShipmentTracking) => void;
  onDelete?: (event: ShipmentTracking) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Individual tracking event display card.
 * Shows location, vessel, timestamp, and event details.
 * 
 * **Requirements: 4.1, 4.2, 4.3, 4.4, 4.5**
 */
export function TrackingEventCard({
  event,
  onView,
  onDelete,
  showActions = true,
  compact = false,
  className,
}: TrackingEventCardProps) {
  // Format date/time for display
  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  // Get icon for event type
  const getEventIcon = (eventType: TrackingEventType) => {
    const iconClass = 'h-5 w-5';
    switch (eventType) {
      case 'booked':
        return <Package className={iconClass} />;
      case 'gate_in':
        return <ArrowRight className={iconClass} />;
      case 'loaded':
        return <Ship className={iconClass} />;
      case 'departed':
        return <Ship className={iconClass} />;
      case 'transshipment':
        return <Warehouse className={iconClass} />;
      case 'arrived':
        return <MapPin className={iconClass} />;
      case 'discharged':
        return <Ship className={iconClass} />;
      case 'gate_out':
        return <ArrowRight className={iconClass} />;
      case 'delivered':
        return <Truck className={iconClass} />;
      default:
        return <Circle className={iconClass} />;
    }
  };

  if (compact) {
    return (
      <CompactEventCard
        event={event}
        onView={onView}
        className={className}
      />
    );
  }

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Event type icon */}
            <div
              className={cn(
                'h-10 w-10 rounded-full flex items-center justify-center',
                event.isActual
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {getEventIcon(event.eventType)}
            </div>

            <div>
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

              {/* Timestamp */}
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDateTime(event.eventTimestamp)}</span>
                <span className="text-xs">({formatRelativeTime(event.eventTimestamp)})</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {showActions && (onView || onDelete) && (
            <div className="flex gap-1">
              {onView && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="View details"
                  onClick={() => onView(event)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  title="Delete event"
                  onClick={() => onDelete(event)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Location */}
        {event.locationName && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">
                {event.locationName}
                {event.locationCode && (
                  <span className="text-muted-foreground ml-1 font-normal">
                    ({event.locationCode})
                  </span>
                )}
              </p>
              {event.terminal && (
                <p className="text-sm text-muted-foreground">
                  Terminal: {event.terminal}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Vessel info */}
        {event.vesselName && (
          <div className="flex items-center gap-2 text-sm">
            <Ship className="h-4 w-4 text-muted-foreground" />
            <span>{event.vesselName}</span>
            {event.voyageNumber && (
              <span className="text-muted-foreground">/ Voyage: {event.voyageNumber}</span>
            )}
          </div>
        )}

        {/* Container number */}
        {event.containerNumber && (
          <div className="flex items-center gap-2 text-sm">
            <Container className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{event.containerNumber}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-sm text-muted-foreground">{event.description}</p>
        )}

        {/* Linked references */}
        {(event.booking || event.bl) && (
          <div className="pt-2 border-t flex items-center gap-4 text-xs text-muted-foreground">
            {event.booking && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>Booking: {event.booking.bookingNumber}</span>
              </div>
            )}
            {event.bl && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>B/L: {event.bl.blNumber}</span>
              </div>
            )}
          </div>
        )}

        {/* Source */}
        {event.source && (
          <p className="text-xs text-muted-foreground">
            Source: {event.source}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact event card for list views
 */
interface CompactEventCardProps {
  event: ShipmentTracking;
  onView?: (event: ShipmentTracking) => void;
  className?: string;
}

function CompactEventCard({ event, onView, className }: CompactEventCardProps) {
  const formatDateTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd MMM HH:mm');
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer',
        className
      )}
      onClick={() => onView?.(event)}
    >
      {/* Status indicator */}
      <div
        className={cn(
          'h-2 w-2 rounded-full shrink-0',
          event.isActual ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
      />

      {/* Event type */}
      <Badge
        variant="outline"
        className={cn('shrink-0', TRACKING_EVENT_TYPE_COLORS[event.eventType])}
      >
        {TRACKING_EVENT_TYPE_LABELS[event.eventType]}
      </Badge>

      {/* Location */}
      <span className="flex-1 truncate text-sm">
        {event.locationName || '-'}
      </span>

      {/* Timestamp */}
      <span className="text-xs text-muted-foreground shrink-0">
        {formatDateTime(event.eventTimestamp)}
      </span>
    </div>
  );
}

/**
 * Event list component
 */
interface TrackingEventListProps {
  events: ShipmentTracking[];
  onView?: (event: ShipmentTracking) => void;
  onDelete?: (event: ShipmentTracking) => void;
  compact?: boolean;
  className?: string;
}

export function TrackingEventList({
  events,
  onView,
  onDelete,
  compact = false,
  className,
}: TrackingEventListProps) {
  if (events.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No tracking events</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {events.map((event) => (
        <TrackingEventCard
          key={event.id}
          event={event}
          onView={onView}
          onDelete={onDelete}
          compact={compact}
        />
      ))}
    </div>
  );
}

/**
 * Latest event badge for summary views
 */
interface LatestEventBadgeProps {
  events: ShipmentTracking[];
  className?: string;
}

export function LatestEventBadge({ events, className }: LatestEventBadgeProps) {
  if (events.length === 0) return null;

  // Get the latest event (last in chronologically sorted array)
  const latestEvent = events[events.length - 1];

  return (
    <Badge
      className={cn(TRACKING_EVENT_TYPE_COLORS[latestEvent.eventType], className)}
    >
      {TRACKING_EVENT_TYPE_LABELS[latestEvent.eventType]}
    </Badge>
  );
}

/**
 * Event type icon component
 */
interface EventTypeIconProps {
  eventType: TrackingEventType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EventTypeIcon({ eventType, size = 'md', className }: EventTypeIconProps) {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const iconClass = cn(sizeClass[size], className);

  switch (eventType) {
    case 'booked':
      return <Package className={iconClass} />;
    case 'gate_in':
      return <ArrowRight className={iconClass} />;
    case 'loaded':
      return <Ship className={iconClass} />;
    case 'departed':
      return <Ship className={iconClass} />;
    case 'transshipment':
      return <Warehouse className={iconClass} />;
    case 'arrived':
      return <MapPin className={iconClass} />;
    case 'discharged':
      return <Ship className={iconClass} />;
    case 'gate_out':
      return <ArrowRight className={iconClass} />;
    case 'delivered':
      return <Truck className={iconClass} />;
    default:
      return <Circle className={iconClass} />;
  }
}
