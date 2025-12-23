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
import { CustomerProfitability } from '@/types/financial-analytics';
import {
  formatCurrencyIDR,
  formatPercentage,
  getProfitMarginStatus,
} from '@/lib/financial-analytics-utils';
import { Users, TrendingUp, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerProfitabilityTableProps {
  customers: CustomerProfitability[];
  sortBy?: 'revenue' | 'profit' | 'margin';
  limit?: number;
  showYTD?: boolean;
}

export function CustomerProfitabilityTable({
  customers,
  sortBy = 'profit',
  limit,
  showYTD = true,
}: CustomerProfitabilityTableProps) {
  // Sort customers based on sortBy prop
  const sortedCustomers = [...customers].sort((a, b) => {
    switch (sortBy) {
      case 'revenue':
        return b.total_revenue - a.total_revenue;
      case 'margin':
        return b.profit_margin_pct - a.profit_margin_pct;
      case 'profit':
      default:
        return b.total_profit - a.total_profit;
    }
  });

  // Apply limit if specified
  const displayCustomers = limit ? sortedCustomers.slice(0, limit) : sortedCustomers;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {limit ? `Top ${limit} Customers by Profit` : 'Customer Profitability'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-center">Jobs</TableHead>
              {showYTD ? (
                <>
                  <TableHead className="text-right">Revenue (YTD)</TableHead>
                  <TableHead className="text-right">Profit (YTD)</TableHead>
                </>
              ) : (
                <>
                  <TableHead className="text-right">Total Revenue</TableHead>
                  <TableHead className="text-right">Total Profit</TableHead>
                </>
              )}
              <TableHead className="text-right">Avg/Job</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No customer data available
                </TableCell>
              </TableRow>
            ) : (
              displayCustomers.map((customer, index) => {
                const marginStatus = getProfitMarginStatus(customer.profit_margin_pct);
                const isPositiveMargin = marginStatus === 'positive';

                return (
                  <TableRow key={customer.customer_id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{customer.customer_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{customer.total_jobs}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrencyIDR(showYTD ? customer.ytd_revenue : customer.total_revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          (showYTD ? customer.ytd_profit : customer.total_profit) >= 0
                            ? 'text-green-600'
                            : 'text-red-500'
                        )}
                      >
                        {formatCurrencyIDR(
                          showYTD ? customer.ytd_profit : customer.total_profit
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrencyIDR(customer.avg_job_revenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isPositiveMargin && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        <span
                          className={cn(
                            'font-medium',
                            isPositiveMargin ? 'text-green-600' : 'text-muted-foreground'
                          )}
                        >
                          {formatPercentage(customer.profit_margin_pct)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
