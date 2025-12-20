'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { DepartmentCostPercentage } from '@/types/manpower-cost';

interface CostDistributionChartProps {
  percentages: DepartmentCostPercentage[];
  isLoading?: boolean;
}

// Color palette for departments
const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-red-500',
  'bg-cyan-500',
];

export function CostDistributionChart({
  percentages,
  isLoading,
}: CostDistributionChartProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (percentages.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {percentages.map((item, index) => (
        <div key={item.department_id} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium truncate max-w-[200px]">
              {item.department_name}
            </span>
            <span className="text-muted-foreground">
              {item.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-6 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${COLORS[index % COLORS.length]} rounded-full transition-all duration-500`}
              style={{ width: `${Math.max(item.percentage, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
