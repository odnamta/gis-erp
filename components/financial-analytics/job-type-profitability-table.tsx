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
import { JobTypeProfitability } from '@/types/financial-analytics';
import {
  formatCurrencyIDR,
  formatPercentage,
  getProfitMarginStatus,
} from '@/lib/financial-analytics-utils';
import { Package, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobTypeProfitabilityTableProps {
  jobTypes: JobTypeProfitability[];
}

export function JobTypeProfitabilityTable({ jobTypes }: JobTypeProfitabilityTableProps) {
  // Sort by total profit descending
  const sortedJobTypes = [...jobTypes].sort((a, b) => b.total_profit - a.total_profit);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Profitability by Cargo Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cargo Type</TableHead>
              <TableHead className="text-center">Jobs</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Avg/Job</TableHead>
              <TableHead className="text-right">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedJobTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No job type data available
                </TableCell>
              </TableRow>
            ) : (
              sortedJobTypes.map((jobType) => {
                const marginStatus = getProfitMarginStatus(jobType.profit_margin_pct);
                const isPositiveMargin = marginStatus === 'positive';

                return (
                  <TableRow key={jobType.cargo_type}>
                    <TableCell className="font-medium">{jobType.cargo_type}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{jobType.total_jobs}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrencyIDR(jobType.total_revenue)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrencyIDR(jobType.total_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          jobType.total_profit >= 0 ? 'text-green-600' : 'text-red-500'
                        )}
                      >
                        {formatCurrencyIDR(jobType.total_profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrencyIDR(jobType.avg_job_revenue)}
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
                          {formatPercentage(jobType.profit_margin_pct)}
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
