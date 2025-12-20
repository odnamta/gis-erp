'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Play, Eye, Calculator } from 'lucide-react';
import { PayrollPeriod } from '@/types/payroll';
import { PayrollStatusBadge } from './payroll-status-badge';
import { PayrollPeriodForm } from './payroll-period-form';
import { formatPayrollCurrencyCompact } from '@/lib/payroll-utils';

interface PayrollPeriodListProps {
  periods: PayrollPeriod[];
}

export function PayrollPeriodList({ periods }: PayrollPeriodListProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  const handleRowClick = (periodId: string) => {
    router.push(`/hr/payroll/${periodId}`);
  };

  const getActionButton = (period: PayrollPeriod) => {
    switch (period.status) {
      case 'draft':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/hr/payroll/${period.id}`);
            }}
          >
            <Calculator className="h-4 w-4 mr-1" />
            Process
          </Button>
        );
      case 'processing':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/hr/payroll/${period.id}`);
            }}
          >
            <Play className="h-4 w-4 mr-1" />
            Continue
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/hr/payroll/${period.id}`);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payroll Periods</CardTitle>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Period
        </Button>
      </CardHeader>
      <CardContent>
        {periods.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No payroll periods found. Create your first period to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-center">Employees</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period) => (
                <TableRow
                  key={period.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(period.id)}
                >
                  <TableCell className="font-medium">
                    {period.period_name}
                  </TableCell>
                  <TableCell className="text-center">
                    {period.employee_count || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPayrollCurrencyCompact(period.total_gross)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPayrollCurrencyCompact(period.total_net)}
                  </TableCell>
                  <TableCell className="text-center">
                    <PayrollStatusBadge status={period.status} type="period" />
                  </TableCell>
                  <TableCell className="text-right">
                    {getActionButton(period)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <PayrollPeriodForm
        open={showForm}
        onOpenChange={setShowForm}
      />
    </Card>
  );
}
