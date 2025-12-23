'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BudgetVsActualItem, BudgetCategory } from '@/types/financial-analytics';
import {
  formatCurrencyIDR,
  formatPercentage,
  getCategoryDisplayName,
  calculateGrossProfit,
} from '@/lib/financial-analytics-utils';
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetVsActualTableProps {
  items: BudgetVsActualItem[];
  period: { year: number; month: number };
}

export function BudgetVsActualTable({ items, period }: BudgetVsActualTableProps) {
  // Group items by category type
  const revenueItems = items.filter((item) => item.category === 'revenue');
  const costItems = items.filter((item) => item.category !== 'revenue');

  // Calculate totals
  const totalRevenueBudget = revenueItems.reduce((sum, item) => sum + item.budget_amount, 0);
  const totalRevenueActual = revenueItems.reduce((sum, item) => sum + item.actual_amount, 0);
  const totalCostBudget = costItems.reduce((sum, item) => sum + item.budget_amount, 0);
  const totalCostActual = costItems.reduce((sum, item) => sum + item.actual_amount, 0);

  const { grossProfit: grossProfitBudget, grossMarginPct: grossMarginBudget } =
    calculateGrossProfit(totalRevenueBudget, totalCostBudget);
  const { grossProfit: grossProfitActual, grossMarginPct: grossMarginActual } =
    calculateGrossProfit(totalRevenueActual, totalCostActual);

  const monthName = new Date(period.year, period.month - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const getStatusIcon = (status: BudgetVsActualItem['status']) => {
    switch (status) {
      case 'favorable':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'unfavorable':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getVarianceColor = (status: BudgetVsActualItem['status']) => {
    switch (status) {
      case 'favorable':
        return 'text-green-600';
      case 'warning':
        return 'text-amber-500';
      case 'unfavorable':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const renderRow = (item: BudgetVsActualItem, isSubItem = false) => (
    <TableRow key={`${item.category}-${item.subcategory || 'main'}`}>
      <TableCell className={cn(isSubItem && 'pl-8')}>
        {item.description || getCategoryDisplayName(item.category)}
      </TableCell>
      <TableCell className="text-right">{formatCurrencyIDR(item.budget_amount)}</TableCell>
      <TableCell className="text-right">{formatCurrencyIDR(item.actual_amount)}</TableCell>
      <TableCell className={cn('text-right', getVarianceColor(item.status))}>
        {item.variance >= 0 ? '' : '('}
        {formatCurrencyIDR(Math.abs(item.variance))}
        {item.variance >= 0 ? '' : ')'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {getStatusIcon(item.status)}
          <span className={getVarianceColor(item.status)}>
            {formatPercentage(item.variance_pct)}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Budget vs Actual - {monthName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Category</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Revenue Section */}
            <TableRow className="bg-muted/50 font-medium">
              <TableCell colSpan={5}>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  REVENUE
                </div>
              </TableCell>
            </TableRow>
            {revenueItems.map((item) => renderRow(item, true))}
            <TableRow className="font-medium border-t">
              <TableCell className="pl-8">Total Revenue</TableCell>
              <TableCell className="text-right">{formatCurrencyIDR(totalRevenueBudget)}</TableCell>
              <TableCell className="text-right">{formatCurrencyIDR(totalRevenueActual)}</TableCell>
              <TableCell
                className={cn(
                  'text-right',
                  totalRevenueActual >= totalRevenueBudget ? 'text-green-600' : 'text-red-500'
                )}
              >
                {totalRevenueActual - totalRevenueBudget >= 0 ? '' : '('}
                {formatCurrencyIDR(Math.abs(totalRevenueActual - totalRevenueBudget))}
                {totalRevenueActual - totalRevenueBudget >= 0 ? '' : ')'}
              </TableCell>
              <TableCell className="text-right">
                {totalRevenueBudget > 0
                  ? formatPercentage(
                      ((totalRevenueActual - totalRevenueBudget) / totalRevenueBudget) * 100
                    )
                  : '-'}
              </TableCell>
            </TableRow>

            {/* Costs Section */}
            <TableRow className="bg-muted/50 font-medium">
              <TableCell colSpan={5}>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  DIRECT COSTS
                </div>
              </TableCell>
            </TableRow>
            {costItems.map((item) => renderRow(item, true))}
            <TableRow className="font-medium border-t">
              <TableCell className="pl-8">Total Direct Costs</TableCell>
              <TableCell className="text-right">{formatCurrencyIDR(totalCostBudget)}</TableCell>
              <TableCell className="text-right">{formatCurrencyIDR(totalCostActual)}</TableCell>
              <TableCell
                className={cn(
                  'text-right',
                  totalCostActual <= totalCostBudget ? 'text-green-600' : 'text-red-500'
                )}
              >
                {totalCostBudget - totalCostActual >= 0 ? '' : '('}
                {formatCurrencyIDR(Math.abs(totalCostBudget - totalCostActual))}
                {totalCostBudget - totalCostActual >= 0 ? '' : ')'}
              </TableCell>
              <TableCell className="text-right">
                {totalCostBudget > 0
                  ? formatPercentage(
                      ((totalCostBudget - totalCostActual) / totalCostBudget) * 100
                    )
                  : '-'}
              </TableCell>
            </TableRow>

            {/* Gross Profit Section */}
            <TableRow className="bg-green-50 dark:bg-green-950/20 font-bold">
              <TableCell>GROSS PROFIT</TableCell>
              <TableCell className="text-right">{formatCurrencyIDR(grossProfitBudget)}</TableCell>
              <TableCell className="text-right">{formatCurrencyIDR(grossProfitActual)}</TableCell>
              <TableCell
                className={cn(
                  'text-right',
                  grossProfitActual >= grossProfitBudget ? 'text-green-600' : 'text-red-500'
                )}
              >
                {grossProfitActual - grossProfitBudget >= 0 ? '' : '('}
                {formatCurrencyIDR(Math.abs(grossProfitActual - grossProfitBudget))}
                {grossProfitActual - grossProfitBudget >= 0 ? '' : ')'}
              </TableCell>
              <TableCell className="text-right">
                {grossProfitBudget !== 0
                  ? formatPercentage(
                      ((grossProfitActual - grossProfitBudget) / Math.abs(grossProfitBudget)) * 100
                    )
                  : '-'}
              </TableCell>
            </TableRow>
            <TableRow className="font-medium">
              <TableCell className="pl-8">Margin</TableCell>
              <TableCell className="text-right">{formatPercentage(grossMarginBudget)}</TableCell>
              <TableCell className="text-right">{formatPercentage(grossMarginActual)}</TableCell>
              <TableCell
                className={cn(
                  'text-right',
                  grossMarginActual >= grossMarginBudget ? 'text-green-600' : 'text-red-500'
                )}
              >
                {formatPercentage(grossMarginActual - grossMarginBudget)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
