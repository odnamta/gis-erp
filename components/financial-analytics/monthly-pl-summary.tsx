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
import { MonthlyPLSummary } from '@/types/financial-analytics';
import { formatCurrencyIDR, formatPercentage } from '@/lib/financial-analytics-utils';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthlyPLSummaryTableProps {
  monthlyPL: MonthlyPLSummary[];
}

export function MonthlyPLSummaryTable({ monthlyPL }: MonthlyPLSummaryTableProps) {
  // Sort by month descending (most recent first)
  const sortedData = [...monthlyPL].sort(
    (a, b) => new Date(b.month).getTime() - new Date(a.month).getTime()
  );

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  // Calculate totals
  const totals = sortedData.reduce(
    (acc, item) => ({
      revenue: acc.revenue + item.revenue,
      direct_cost: acc.direct_cost + item.direct_cost,
      gross_profit: acc.gross_profit + item.gross_profit,
    }),
    { revenue: 0, direct_cost: 0, gross_profit: 0 }
  );

  const totalMargin = totals.revenue > 0 ? (totals.gross_profit / totals.revenue) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Monthly P&L Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Direct Cost</TableHead>
              <TableHead className="text-right">Gross Profit</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No P&L data available
                </TableCell>
              </TableRow>
            ) : (
              <>
                {sortedData.map((item) => (
                  <TableRow key={item.month}>
                    <TableCell className="font-medium">{formatMonth(item.month)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrencyIDR(item.revenue)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrencyIDR(item.direct_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          item.gross_profit >= 0 ? 'text-green-600' : 'text-red-500'
                        )}
                      >
                        {formatCurrencyIDR(item.gross_profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          item.gross_margin_pct >= 20
                            ? 'text-green-600 font-medium'
                            : 'text-muted-foreground'
                        )}
                      >
                        {formatPercentage(item.gross_margin_pct)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right">{formatCurrencyIDR(totals.revenue)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrencyIDR(totals.direct_cost)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(totals.gross_profit >= 0 ? 'text-green-600' : 'text-red-500')}
                    >
                      {formatCurrencyIDR(totals.gross_profit)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        totalMargin >= 20 ? 'text-green-600' : 'text-muted-foreground'
                      )}
                    >
                      {formatPercentage(totalMargin)}
                    </span>
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
