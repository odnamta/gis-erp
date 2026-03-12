'use client';

// =====================================================
// v0.61: KPI Card Component
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { KPIValue } from '@/types/executive-dashboard';
import {
  formatKPIValue,
  getStatusColor,
  getTrendColor,
} from '@/lib/executive-dashboard-utils';
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle } from 'lucide-react';

interface KPICardProps {
  kpiValue: KPIValue;
  showTarget?: boolean;
  showTrend?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function KPICard({
  kpiValue,
  showTarget = true,
  showTrend = true,
  size = 'md',
  className,
}: KPICardProps) {
  const {
    kpiName,
    currentValue,
    targetValue,
    changePercentage,
    status,
    trend,
    unit,
    decimalPlaces,
    targetType,
  } = kpiValue;

  // Calculate progress percentage
  const progressPercent = targetValue > 0
    ? Math.min((currentValue / targetValue) * 100, 100)
    : 0;

  // Get trend icon component
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  // Size-based classes
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const valueSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  // Status-based border color
  const statusBorderColor = {
    exceeded: 'border-l-green-500',
    on_track: 'border-l-blue-500',
    warning: 'border-l-yellow-500',
    critical: 'border-l-red-500',
  };

  return (
    <Card className={cn(
      'border-l-4 transition-shadow hover:shadow-md',
      statusBorderColor[status],
      className
    )}>
      <CardHeader className={cn('pb-2', sizeClasses[size])}>
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          <span>{kpiName}</span>
          {status === 'critical' && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('pt-0', sizeClasses[size])}>
        {/* Current Value */}
        <div className={cn('font-bold', valueSizeClasses[size])}>
          {formatKPIValue(currentValue, unit, decimalPlaces)}
        </div>

        {/* Trend Indicator */}
        {showTrend && (
          <div className={cn(
            'flex items-center gap-1 text-sm mt-1',
            getTrendColor(trend, targetType)
          )}>
            <TrendIcon className="h-4 w-4" />
            <span>
              {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}% vs LM
            </span>
          </div>
        )}

        {/* Target Progress */}
        {showTarget && targetValue > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Target: {formatKPIValue(targetValue, unit, decimalPlaces)}
              </span>
              <span className={cn(
                'px-1.5 py-0.5 rounded text-xs font-medium',
                getStatusColor(status)
              )}>
                {progressPercent.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default KPICard;
