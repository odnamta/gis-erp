'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calculator, CheckCircle, Loader2 } from 'lucide-react';
import { PayrollPeriod, PayrollRecord } from '@/types/payroll';
import { PayrollSummaryCards } from './payroll-summary-cards';
import { PayrollRecordTable } from './payroll-record-table';
import { PayrollStatusBadge } from './payroll-status-badge';
import { calculateAllPayroll, approvePayrollPeriod } from '@/app/(main)/hr/payroll/actions';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PayrollProcessingViewProps {
  period: PayrollPeriod;
  records: PayrollRecord[];
}

export function PayrollProcessingView({ period, records }: PayrollProcessingViewProps) {
  const router = useRouter();
  const [calculating, setCalculating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const canCalculate = period.status === 'draft' || period.status === 'processing';
  const canApprove = (period.status === 'draft' || period.status === 'processing') && records.length > 0;

  const handleCalculateAll = async () => {
    setCalculating(true);
    try {
      const result = await calculateAllPayroll(period.id);
      if (result.success) {
        toast.success(`Payroll calculated for ${result.count} employees`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to calculate payroll');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setCalculating(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const result = await approvePayrollPeriod(period.id);
      if (result.success) {
        toast.success('Payroll period approved');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to approve payroll');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setApproving(false);
      setShowApproveDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/hr/payroll')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Payroll: {period.period_name}</h1>
            <p className="text-muted-foreground">
              Pay Date: {new Date(period.pay_date).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <PayrollStatusBadge status={period.status} type="period" />
        </div>
        <div className="flex gap-2">
          {canCalculate && (
            <Button
              onClick={handleCalculateAll}
              disabled={calculating}
              variant="outline"
            >
              {calculating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              Calculate All
            </Button>
          )}
          {canApprove && (
            <Button
              onClick={() => setShowApproveDialog(true)}
              disabled={approving}
            >
              {approving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Approve Period
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <PayrollSummaryCards
        totalGross={period.total_gross}
        totalDeductions={period.total_deductions}
        totalNet={period.total_net}
        totalCompanyCost={period.total_company_cost}
        employeeCount={period.employee_count}
      />

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Payroll Records</CardTitle>
        </CardHeader>
        <CardContent>
          <PayrollRecordTable records={records} periodStatus={period.status} />
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Payroll Period?</AlertDialogTitle>
            <AlertDialogDescription>
              This will approve the payroll for {period.period_name} with {records.length} employees.
              Once approved, payroll records cannot be modified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={approving}>
              {approving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
