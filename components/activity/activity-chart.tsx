'use client';

import { format } from 'date-fns';
import type { DailyActivityCount } from '@/types/activity';

interface ActivityChartProps {
  data: DailyActivityCount[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2 h-40">
        {data.map((item) => {
          const height = (item.count / maxCount) * 100;
          const dateLabel = format(new Date(item.date), 'EEE');

          return (
            <div
              key={item.date}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-xs text-muted-foreground">{item.count}</span>
              <div
                className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                style={{ height: `${Math.max(height, 4)}%` }}
                title={`${item.count} activities on ${format(new Date(item.date), 'MMM d')}`}
              />
              <span className="text-xs text-muted-foreground">{dateLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
