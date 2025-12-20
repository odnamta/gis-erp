'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { ManpowerCostTrendPoint } from '@/types/manpower-cost';
import { formatChartAxisValue } from '@/lib/manpower-cost-utils';

interface CostTrendChartProps {
  trendData: ManpowerCostTrendPoint[];
  isLoading?: boolean;
}

export function CostTrendChart({
  trendData,
  isLoading,
}: CostTrendChartProps) {
  if (isLoading) {
    return (
      <div className="h-48">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No trend data available
      </div>
    );
  }

  // Calculate chart dimensions
  const maxCost = Math.max(...trendData.map(d => d.total_company_cost), 1);
  const minCost = Math.min(...trendData.map(d => d.total_company_cost));
  const range = maxCost - minCost || maxCost;
  const padding = range * 0.1;
  const chartMin = Math.max(0, minCost - padding);
  const chartMax = maxCost + padding;
  const chartRange = chartMax - chartMin;

  // Generate Y-axis labels
  const yAxisLabels = [
    chartMax,
    chartMin + chartRange * 0.75,
    chartMin + chartRange * 0.5,
    chartMin + chartRange * 0.25,
    chartMin,
  ];

  // Calculate points for the line
  const points = trendData.map((d, i) => {
    const x = (i / (trendData.length - 1 || 1)) * 100;
    const y = chartRange > 0 
      ? ((chartMax - d.total_company_cost) / chartRange) * 100 
      : 50;
    return { x, y, ...d };
  });

  // Create SVG path
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <div className="h-48 relative">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between text-xs text-muted-foreground">
        {yAxisLabels.map((value, i) => (
          <span key={i} className="text-right pr-2">
            {formatChartAxisValue(value)}
          </span>
        ))}
      </div>

      {/* Chart area */}
      <div className="ml-16 h-full pb-6 relative">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {yAxisLabels.map((_, i) => (
            <div key={i} className="border-t border-muted" />
          ))}
        </div>

        {/* SVG Line Chart */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Area fill */}
          <path
            d={`${pathD} L 100 100 L 0 100 Z`}
            fill="url(#gradient)"
            opacity="0.3"
          />
          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* Points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="rgb(59, 130, 246)"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
          {trendData.map((d, i) => (
            <span key={i} className="text-center">
              {d.month_label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
