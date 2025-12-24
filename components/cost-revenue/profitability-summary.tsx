'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BookingFinancialSummary } from '@/types/agency';
import { getMarginIndicator, DEFAULT_MARGIN_TARGET } from '@/lib/cost-revenue-utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Target,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfitabilitySummaryProps {
  summary: BookingFinancialSummary;
  targetMargin?: number;
}

export function ProfitabilitySummary({
  summary,
  targetMargin = DEFAULT_MARGIN_TARGET,
}: ProfitabilitySummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const marginIndicator = getMarginIndicator(summary.profitMarginPct, targetMargin);
  
  const marginColorClasses = {
    green: 'text-green-600 bg-green-50 border-green-200',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    red: 'text-red-600 bg-red-50 border-red-200',
  };

  const marginIconColorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  const isProfit = summary.grossProfit >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Revenue */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span>Total Revenue</span>
          </div>
          <div className="text-xl font-semibold text-green-600">
            {formatCurrency(summary.totalRevenue)}
          </div>
          {summary.totalRevenueTax > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              + Tax: {formatCurrency(summary.totalRevenueTax)}
            </div>
          )}
          {summary.unbilledRevenue > 0 && (
            <div className="flex items-center gap-1 text-xs text-yellow-600 mt-1">
              <AlertCircle className="h-3 w-3" />
              <span>Unbilled: {formatCurrency(summary.unbilledRevenue)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Cost */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Receipt className="h-4 w-4 text-red-600" />
            <span>Total Cost</span>
          </div>
          <div className="text-xl font-semibold text-red-600">
            {formatCurrency(summary.totalCost)}
          </div>
          {summary.totalCostTax > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              + Tax: {formatCurrency(summary.totalCostTax)}
            </div>
          )}
          {summary.unpaidCosts > 0 && (
            <div className="flex items-center gap-1 text-xs text-yellow-600 mt-1">
              <AlertCircle className="h-3 w-3" />
              <span>Unpaid: {formatCurrency(summary.unpaidCosts)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gross Profit */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className={cn('h-4 w-4', isProfit ? 'text-green-600' : 'text-red-600')} />
            <span>Gross Profit</span>
          </div>
          <div className={cn(
            'text-xl font-semibold',
            isProfit ? 'text-green-600' : 'text-red-600'
          )}>
            {formatCurrency(summary.grossProfit)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Revenue - Cost
          </div>
        </CardContent>
      </Card>

      {/* Profit Margin */}
      <Card className={cn('border', marginColorClasses[marginIndicator])}>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Target className={cn('h-4 w-4', marginIconColorClasses[marginIndicator])} />
            <span>Profit Margin</span>
          </div>
          <div className={cn(
            'text-xl font-semibold',
            marginIconColorClasses[marginIndicator]
          )}>
            {formatPercent(summary.profitMarginPct)}
          </div>
          <div className="flex items-center gap-1 text-xs mt-1">
            {summary.isTargetMet ? (
              <span className="text-green-600">
                ✓ Target met ({formatPercent(targetMargin)})
              </span>
            ) : (
              <span className="text-red-600">
                ✗ Below target ({formatPercent(targetMargin)})
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Compact version for embedding in other views
interface ProfitabilitySummaryCompactProps {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMarginPct: number;
  targetMargin?: number;
}

export function ProfitabilitySummaryCompact({
  totalRevenue,
  totalCost,
  grossProfit,
  profitMarginPct,
  targetMargin = DEFAULT_MARGIN_TARGET,
}: ProfitabilitySummaryCompactProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      notation: 'compact',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const marginIndicator = getMarginIndicator(profitMarginPct, targetMargin);
  const isProfit = grossProfit >= 0;

  const marginBgClasses = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  };

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <TrendingUp className="h-3.5 w-3.5 text-green-600" />
        <span className="text-muted-foreground">Rev:</span>
        <span className="font-medium text-green-600">{formatCurrency(totalRevenue)}</span>
      </div>
      <div className="flex items-center gap-1">
        <TrendingDown className="h-3.5 w-3.5 text-red-600" />
        <span className="text-muted-foreground">Cost:</span>
        <span className="font-medium text-red-600">{formatCurrency(totalCost)}</span>
      </div>
      <div className="flex items-center gap-1">
        <DollarSign className={cn('h-3.5 w-3.5', isProfit ? 'text-green-600' : 'text-red-600')} />
        <span className="text-muted-foreground">Profit:</span>
        <span className={cn('font-medium', isProfit ? 'text-green-600' : 'text-red-600')}>
          {formatCurrency(grossProfit)}
        </span>
      </div>
      <div className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        marginBgClasses[marginIndicator]
      )}>
        {formatPercent(profitMarginPct)}
      </div>
    </div>
  );
}
