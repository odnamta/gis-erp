'use client';

/**
 * StatCardWidget Component
 * v0.34: Dashboard Widgets & Customization
 * 
 * Displays a compact card with key metric and optional trend indicator.
 */

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Banknote,
  Receipt,
  CreditCard,
  TrendingUpIcon,
  Trophy,
  ClipboardList,
  Briefcase,
  Users,
  HeartPulse,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatCardWidgetProps } from '@/types/widgets';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  banknote: Banknote,
  receipt: Receipt,
  'credit-card': CreditCard,
  'trending-up': TrendingUpIcon,
  trophy: Trophy,
  'clipboard-list': ClipboardList,
  briefcase: Briefcase,
  users: Users,
  'heart-pulse': HeartPulse,
};

const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
  default: {
    bg: 'bg-muted/50',
    text: 'text-foreground',
    icon: 'text-muted-foreground',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-700 dark:text-green-400',
    icon: 'text-green-600 dark:text-green-500',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    text: 'text-yellow-700 dark:text-yellow-400',
    icon: 'text-yellow-600 dark:text-yellow-500',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-700 dark:text-red-400',
    icon: 'text-red-600 dark:text-red-500',
  },
};

function formatValue(value: number | string): string {
  if (typeof value === 'number') {
    if (value >= 1000000000) {
      return `Rp ${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `Rp ${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `Rp ${(value / 1000).toFixed(1)}K`;
    }
    return `Rp ${value.toLocaleString()}`;
  }
  return value;
}

export function StatCardWidget({ data, isLoading, error, config, onRefresh }: StatCardWidgetProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-destructive/50">
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load</p>
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

  const color = data.color || 'default';
  const colors = colorClasses[color] || colorClasses.default;
  const IconComponent = data.icon ? iconMap[data.icon] : null;

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {config.widget.widget_name}
            </p>
            <p className={cn('text-2xl font-bold', colors.text)}>
              {formatValue(data.value)}
            </p>
            <p className="text-xs text-muted-foreground">{data.label}</p>
            
            {data.trend && (
              <div className="flex items-center gap-1 mt-2">
                {data.trend.direction === 'up' && (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                )}
                {data.trend.direction === 'down' && (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                {data.trend.direction === 'neutral' && (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={cn(
                  'text-xs',
                  data.trend.direction === 'up' && 'text-green-500',
                  data.trend.direction === 'down' && 'text-red-500',
                  data.trend.direction === 'neutral' && 'text-muted-foreground'
                )}>
                  {data.trend.percentage}% {data.trend.period}
                </span>
              </div>
            )}
          </div>
          
          {IconComponent && (
            <div className={cn('p-2 rounded-full', colors.bg)}>
              <IconComponent className={cn('h-5 w-5', colors.icon)} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCardWidget;
