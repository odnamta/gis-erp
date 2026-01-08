'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CostBreakdownData } from '@/types/financial-analytics';
import { formatCurrencyIDR, formatPercentage } from '@/lib/financial-analytics-utils';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CostBreakdownChartProps {
  data: CostBreakdownData[];
}

const COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export function CostBreakdownChart({ data }: CostBreakdownChartProps) {
  // Sort by amount descending
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: CostBreakdownData }> }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{item.category}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrencyIDR(item.amount)}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatPercentage(item.percentage)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend - using any to match recharts Props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLegend = (props: any) => {
    const { payload } = props;
    if (!payload) return null;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: { color: string; value: string }, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Custom label renderer - using any to match recharts PieLabelRenderProps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (entry: any) => {
    return formatPercentage(entry.percentage ?? 0);
  };

  if (sortedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No cost data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Cost Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sortedData as unknown as Array<Record<string, unknown>>}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="amount"
                nameKey="category"
                label={renderLabel}
              >
                {sortedData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
