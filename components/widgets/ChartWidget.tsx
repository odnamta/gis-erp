'use client';

/**
 * ChartWidget Component
 * v0.34: Dashboard Widgets & Customization
 * 
 * Displays data visualization (bar, line, pie, or funnel charts).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ChartWidgetProps, ChartData } from '@/types/widgets';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function BarChartComponent({ data }: { data: ChartData }) {
  const chartData = data.labels.map((label, index) => ({
    name: label,
    ...data.datasets.reduce((acc, dataset) => ({
      ...acc,
      [dataset.label]: dataset.data[index] || 0,
    }), {}),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 11 }} 
          className="text-muted-foreground"
        />
        <YAxis 
          tick={{ fontSize: 11 }} 
          tickFormatter={formatCurrency}
          className="text-muted-foreground"
        />
        <Tooltip 
          formatter={(value) => [`Rp ${formatCurrency(Number(value ?? 0))}`, '']}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        {data.datasets.map((dataset, index) => (
          <Bar 
            key={dataset.label}
            dataKey={dataset.label}
            fill={dataset.color || COLORS[index % COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartComponent({ data }: { data: ChartData }) {
  const chartData = data.labels.map((label, index) => ({
    name: label,
    ...data.datasets.reduce((acc, dataset) => ({
      ...acc,
      [dataset.label]: dataset.data[index] || 0,
    }), {}),
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="name" 
          tick={{ fontSize: 11 }}
          className="text-muted-foreground"
        />
        <YAxis 
          tick={{ fontSize: 11 }}
          tickFormatter={formatCurrency}
          className="text-muted-foreground"
        />
        <Tooltip 
          formatter={(value) => [`Rp ${formatCurrency(Number(value ?? 0))}`, '']}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
        {data.datasets.map((dataset, index) => (
          <Line 
            key={dataset.label}
            type="monotone"
            dataKey={dataset.label}
            stroke={dataset.color || COLORS[index % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartComponent({ data }: { data: ChartData }) {
  const chartData = data.labels.map((label, index) => ({
    name: label,
    value: data.datasets[0]?.data[index] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => [`Rp ${formatCurrency(Number(value ?? 0))}`, '']}
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function FunnelChartComponent({ data }: { data: ChartData }) {
  // Simple funnel using horizontal bars
  const chartData = data.labels.map((label, index) => ({
    name: label,
    value: data.datasets[0]?.data[index] || 0,
  }));

  const maxValue = Math.max(...chartData.map(d => d.value));

  return (
    <div className="h-full flex flex-col justify-center space-y-2 px-4">
      {chartData.map((item, index) => {
        const width = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={item.name} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-24 truncate">{item.name}</span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div 
                className="h-full rounded transition-all duration-300"
                style={{ 
                  width: `${width}%`,
                  backgroundColor: COLORS[index % COLORS.length],
                }}
              />
            </div>
            <span className="text-xs font-medium w-16 text-right">
              {formatCurrency(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ChartWidget({ data, isLoading, error, config, onRefresh }: ChartWidgetProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[180px] w-full" />
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
            <p className="text-sm text-muted-foreground">Failed to load chart</p>
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

  if (!data) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  const renderChart = () => {
    switch (data.type) {
      case 'bar':
        return <BarChartComponent data={data} />;
      case 'line':
        return <LineChartComponent data={data} />;
      case 'pie':
        return <PieChartComponent data={data} />;
      case 'funnel':
        return <FunnelChartComponent data={data} />;
      default:
        return <p className="text-sm text-muted-foreground">Unknown chart type</p>;
    }
  };

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{config.widget.widget_name}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-[180px]">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}

export default ChartWidget;
