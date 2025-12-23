'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookingStatusHistory, BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS, BookingStatus } from '@/types/agency';
import { Clock, ArrowRight, User } from 'lucide-react';

interface BookingStatusHistoryProps {
  history: BookingStatusHistory[];
  className?: string;
}

export function BookingStatusHistoryTimeline({ history, className }: BookingStatusHistoryProps) {
  if (history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Status History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No status changes recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort by date descending (most recent first)
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Status History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {sortedHistory.map((item, index) => (
              <div key={item.id} className="relative pl-10">
                {/* Timeline dot */}
                <div
                  className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-background ${
                    index === 0 ? 'bg-primary' : 'bg-muted-foreground'
                  }`}
                />

                <div className="space-y-2">
                  {/* Status change */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.oldStatus && (
                      <>
                        <Badge
                          variant="outline"
                          className={BOOKING_STATUS_COLORS[item.oldStatus as BookingStatus]}
                        >
                          {BOOKING_STATUS_LABELS[item.oldStatus as BookingStatus]}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                    <Badge className={BOOKING_STATUS_COLORS[item.newStatus as BookingStatus]}>
                      {BOOKING_STATUS_LABELS[item.newStatus as BookingStatus]}
                    </Badge>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(item.changedAt), 'dd MMM yyyy HH:mm')}
                    </span>
                    {item.changedBy && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.changedBy}
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                      {item.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for inline display
interface CompactStatusHistoryProps {
  history: BookingStatusHistory[];
  limit?: number;
}

export function CompactStatusHistory({ history, limit = 3 }: CompactStatusHistoryProps) {
  const sortedHistory = [...history]
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
    .slice(0, limit);

  if (sortedHistory.length === 0) {
    return <p className="text-sm text-muted-foreground">No history</p>;
  }

  return (
    <div className="space-y-2">
      {sortedHistory.map((item) => (
        <div key={item.id} className="flex items-center gap-2 text-sm">
          <Badge
            variant="outline"
            className={`text-xs ${BOOKING_STATUS_COLORS[item.newStatus as BookingStatus]}`}
          >
            {BOOKING_STATUS_LABELS[item.newStatus as BookingStatus]}
          </Badge>
          <span className="text-muted-foreground">
            {format(new Date(item.changedAt), 'dd/MM/yy HH:mm')}
          </span>
        </div>
      ))}
      {history.length > limit && (
        <p className="text-xs text-muted-foreground">
          +{history.length - limit} more changes
        </p>
      )}
    </div>
  );
}
