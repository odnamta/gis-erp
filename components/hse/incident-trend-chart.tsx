'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyTrendData } from '@/types/incident';

interface IncidentTrendChartProps {
  data: MonthlyTrendData[];
}

export function IncidentTrendChart({ data }: IncidentTrendChartProps) {
  const maxValue = Math.max(...data.map((d) => d.total), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tren Insiden (6 Bulan)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Total</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span>Near Miss</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Cedera</span>
            </div>
          </div>

          {/* Chart */}
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.month} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.month}</span>
                  <span className="font-medium">{item.total}</span>
                </div>
                <div className="flex gap-1 h-6">
                  {/* Total bar */}
                  <div
                    className="bg-blue-500 rounded-sm transition-all"
                    style={{ width: `${(item.total / maxValue) * 100}%`, minWidth: item.total > 0 ? '4px' : '0' }}
                  />
                </div>
                <div className="flex gap-1 h-3">
                  {/* Near miss bar */}
                  <div
                    className="bg-yellow-500 rounded-sm transition-all"
                    style={{ width: `${(item.nearMisses / maxValue) * 100}%`, minWidth: item.nearMisses > 0 ? '4px' : '0' }}
                  />
                  {/* Injuries bar */}
                  <div
                    className="bg-red-500 rounded-sm transition-all"
                    style={{ width: `${(item.injuries / maxValue) * 100}%`, minWidth: item.injuries > 0 ? '4px' : '0' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
