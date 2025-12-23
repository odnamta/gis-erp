'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerProfitability } from '@/types/financial-analytics';
import { formatCurrencyIDR, formatPercentage } from '@/lib/financial-analytics-utils';
import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';

interface CustomerParetoChartProps {
  customers: CustomerProfitability[];
  limit?: number;
}

export function CustomerParetoChart({ customers, limit = 10 }: CustomerParetoChartProps) {
  // Sort by profit descending and take top N
  const sortedCustomers = [...customers]
    .sort((a, b) => b.total_profit - a.total_profit)
    .slice(0, limit);

  // Calculate cumulative percentage
  const totalProfit = sortedCustomers.reduce((sum, c) => sum + c.total_profit, 0);
  let cumulativeProfit = 0;
  const chartData = sortedCustomers.map((customer) => {
    cumulativeProfit += customer.total_profit;
    return {
      name: customer.customer_name.length > 15 
        ? customer.customer_name.substring(0, 15) + '...' 
        : customer.customer_name,
      fullName: customer.customer_name,
      profit: customer.total_profit,
      cumulative_pct: totalProfit > 0 ? (cumulativeProfit / totalProfit) * 100 : 0,
    };
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{item.fullName}</p>
          <p className="text-sm text-green-600">
            Profit: {formatCurrencyIDR(item.profit)}
          </p>
          <p className="text-sm text-blue-600">
            Cumulative: {formatPercentage(item.cumulative_pct)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Format Y axis
  const formatYAxis = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)}M`;
    }
    return value.toString();
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Customers (Pareto)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No customer data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Top {limit} Customers (Pareto)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
                className="text-muted-foreground"
              />
              <YAxis
                yAxisId="left"
                tickFormatter={formatYAxis}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                yAxisId="left"
                dataKey="profit"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulative_pct"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-500 rounded" />
            <span className="text-muted-foreground">Profit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500" />
            <span className="text-muted-foreground">Cumulative %</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
