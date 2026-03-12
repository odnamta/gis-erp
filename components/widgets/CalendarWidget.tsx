'use client';

/**
 * CalendarWidget Component
 * v0.34: Dashboard Widgets & Customization
 * 
 * Displays date-based events in a mini calendar view.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import type { CalendarWidgetProps, CalendarEvent } from '@/types/widgets';

const eventColors: Record<string, string> = {
  delivery: 'bg-blue-500',
  deadline: 'bg-red-500',
  meeting: 'bg-green-500',
  milestone: 'bg-purple-500',
  default: 'bg-gray-500',
};

function MiniCalendar({ 
  events, 
  currentDate, 
  onDateChange 
}: { 
  events: CalendarEvent[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get day of week for first day (0 = Sunday)
  const startDay = monthStart.getDay();
  
  // Create padding for days before month starts
  const paddingDays = Array(startDay).fill(null);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.date), day));
  };

  return (
    <div className="space-y-2">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => onDateChange(subMonths(currentDate, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(currentDate, 'MMMM yyyy')}
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7"
          onClick={() => onDateChange(addMonths(currentDate, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-xs text-muted-foreground font-medium py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, index) => (
          <div key={`pad-${index}`} className="h-7" />
        ))}
        {days.map(day => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'h-7 flex flex-col items-center justify-center rounded text-xs relative',
                isToday && 'bg-primary text-primary-foreground font-bold',
                !isToday && 'hover:bg-muted'
              )}
            >
              {format(day, 'd')}
              {dayEvents.length > 0 && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1 h-1 rounded-full',
                        eventColors[event.type || 'default'] || eventColors.default
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventList({ events }: { events: CalendarEvent[] }) {
  // Get upcoming events (next 7 days)
  const now = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  if (upcomingEvents.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        No upcoming events
      </p>
    );
  }

  return (
    <div className="space-y-1.5 mt-2 pt-2 border-t">
      <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
      {upcomingEvents.map(event => (
        <div key={event.id} className="flex items-center gap-2 text-xs">
          <div
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              eventColors[event.type || 'default'] || eventColors.default
            )}
          />
          <span className="truncate flex-1">{event.title}</span>
          <span className="text-muted-foreground flex-shrink-0">
            {format(new Date(event.date), 'MMM d')}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CalendarWidget({ data, isLoading, error, config, onRefresh }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(() => {
    if (data?.year && data?.month) {
      return new Date(data.year, data.month - 1);
    }
    return new Date();
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-destructive/50">
        <CardContent className="p-4 h-full">
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load calendar</p>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const events = data?.events || [];

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{config.widget.widget_name}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <MiniCalendar 
          events={events} 
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
        <EventList events={events} />
      </CardContent>
    </Card>
  );
}

export default CalendarWidget;
