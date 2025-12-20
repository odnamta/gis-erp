'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ManpowerCostWithDepartment, ManpowerCostTotals } from '@/types/manpower-cost';
import { formatManpowerCurrency, sortByTotalCostDesc } from '@/lib/manpower-cost-utils';

interface DepartmentBreakdownTableProps {
  summaries: ManpowerCostWithDepartment[];
  totals: ManpowerCostTotals;
  isLoading?: boolean;
}

export function DepartmentBreakdownTable({
  summaries,
  totals,
  isLoading,
}: DepartmentBreakdownTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available for this period. Try refreshing the data or selecting a different period.
      </div>
    );
  }

  const sortedSummaries = sortByTotalCostDesc(summaries);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Staff</TableHead>
            <TableHead className="text-right">Base Salary</TableHead>
            <TableHead className="text-right">+ Benefits</TableHead>
            <TableHead className="text-right">Total Cost</TableHead>
            <TableHead className="text-right">Avg/Employee</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSummaries.map((summary) => (
            <TableRow key={summary.id}>
              <TableCell className="font-medium">
                {summary.department?.name || 'Unknown'}
              </TableCell>
              <TableCell className="text-right">
                {summary.employee_count}
              </TableCell>
              <TableCell className="text-right">
                {formatManpowerCurrency(summary.total_gross)}
              </TableCell>
              <TableCell className="text-right">
                {formatManpowerCurrency(summary.total_company_contributions)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatManpowerCurrency(summary.total_company_cost)}
              </TableCell>
              <TableCell className="text-right">
                {formatManpowerCurrency(summary.cost_per_employee)}
              </TableCell>
            </TableRow>
          ))}
          {/* Total Row */}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell>TOTAL</TableCell>
            <TableCell className="text-right">{totals.employee_count}</TableCell>
            <TableCell className="text-right">
              {formatManpowerCurrency(totals.total_gross)}
            </TableCell>
            <TableCell className="text-right">
              {formatManpowerCurrency(totals.total_company_contributions)}
            </TableCell>
            <TableCell className="text-right">
              {formatManpowerCurrency(totals.total_company_cost)}
            </TableCell>
            <TableCell className="text-right">
              {formatManpowerCurrency(totals.cost_per_employee)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
