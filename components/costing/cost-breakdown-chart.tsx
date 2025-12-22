'use client';

import { CostBreakdown, CostType } from '@/types/depreciation';
import { formatIDR } from '@/lib/pjo-utils';

interface CostBreakdownChartProps {
  data: CostBreakdown[];
}

const costTypeColors: Record<CostType, string> = {
  purchase: 'bg-blue-500',
  maintenance: 'bg-orange-500',
  fuel: 'bg-green-500',
  depreciation: 'bg-purple-500',
  insurance: 'bg-yellow-500',
  registration: 'bg-pink-500',
  other: 'bg-gray-500',
};

const costTypeLabels: Record<CostType, string> = {
  purchase: 'Purchase',
  maintenance: 'Maintenance',
  fuel: 'Fuel',
  depreciation: 'Depreciation',
  insurance: 'Insurance',
  registration: 'Registration',
  other: 'Other',
};

export function CostBreakdownChart({ data }: CostBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No cost data available.
      </div>
    );
  }

  const totalAmount = data.reduce((sum, item) => sum + item.totalAmount, 0);
  const sortedData = [...data].sort((a, b) => b.totalAmount - a.totalAmount);

  return (
    <div className="space-y-6">
      {/* Bar visualization */}
      <div className="space-y-3">
        {sortedData.map((item) => (
          <div key={item.costType} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{costTypeLabels[item.costType]}</span>
              <span className="text-muted-foreground">
                {formatIDR(item.totalAmount)} ({item.percentage}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${costTypeColors[item.costType]} transition-all`}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="pt-4 border-t">
        <div className="flex justify-between font-medium">
          <span>Total</span>
          <span>{formatIDR(totalAmount)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-2">
        {sortedData.map((item) => (
          <div key={item.costType} className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded ${costTypeColors[item.costType]}`} />
            <span>{costTypeLabels[item.costType]}</span>
            <span className="text-muted-foreground">({item.recordCount})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
