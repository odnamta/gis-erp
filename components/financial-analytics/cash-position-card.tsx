'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CashPosition } from '@/types/financial-analytics';
import { formatCurrencyIDR } from '@/lib/financial-analytics-utils';
import { ArrowDownIcon, ArrowUpIcon, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashPositionCardProps {
  cashPosition: CashPosition;
}

export function CashPositionCard({ cashPosition }: CashPositionCardProps) {
  const {
    current_balance,
    net_cash_flow_mtd,
    total_inflows_mtd,
    total_outflows_mtd,
    forecast_30_days,
    forecast_60_days,
    forecast_90_days,
  } = cashPosition;

  const isPositiveFlow = net_cash_flow_mtd >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5" />
          Cash Position
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Balance */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Cash Balance</p>
            <p className="text-2xl font-bold">{formatCurrencyIDR(current_balance)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Net Cash Flow MTD</p>
            <p
              className={cn(
                'text-xl font-semibold flex items-center justify-end gap-1',
                isPositiveFlow ? 'text-green-600' : 'text-red-600'
              )}
            >
              {isPositiveFlow ? (
                <ArrowUpIcon className="h-4 w-4" />
              ) : (
                <ArrowDownIcon className="h-4 w-4" />
              )}
              {formatCurrencyIDR(Math.abs(net_cash_flow_mtd))}
            </p>
          </div>
        </div>

        {/* Inflows and Outflows */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ArrowUpIcon className="h-3 w-3 text-green-600" />
              Total Inflows MTD
            </p>
            <p className="text-lg font-medium text-green-600">
              {formatCurrencyIDR(total_inflows_mtd)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ArrowDownIcon className="h-3 w-3 text-red-600" />
              Total Outflows MTD
            </p>
            <p className="text-lg font-medium text-red-600">
              {formatCurrencyIDR(total_outflows_mtd)}
            </p>
          </div>
        </div>

        {/* Forecasts */}
        <div className="pt-2 border-t">
          <p className="text-sm font-medium mb-2 flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Cash Forecast
          </p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">30 Days</p>
              <p className="font-medium">{formatCurrencyIDR(forecast_30_days)}</p>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">60 Days</p>
              <p className="font-medium">{formatCurrencyIDR(forecast_60_days)}</p>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">90 Days</p>
              <p className="font-medium">{formatCurrencyIDR(forecast_90_days)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
