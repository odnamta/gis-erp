'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, Eye, CheckCircle } from 'lucide-react';
import { PayrollRecord } from '@/types/payroll';
import { PayrollStatusBadge } from './payroll-status-badge';
import { PayrollRecordDetail } from './payroll-record-detail';
import { formatPayrollCurrency } from '@/lib/payroll-utils';
import { generateSalarySlip } from '@/app/(main)/hr/payroll/actions';
import { toast } from 'sonner';

interface PayrollRecordTableProps {
  records: PayrollRecord[];
  periodStatus: string;
}

export function PayrollRecordTable({ records, periodStatus }: PayrollRecordTableProps) {
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  const [generatingSlip, setGeneratingSlip] = useState<string | null>(null);

  const handleGenerateSlip = async (recordId: string) => {
    setGeneratingSlip(recordId);
    try {
      const result = await generateSalarySlip(recordId);
      if (result.success) {
        toast.success(`Salary slip generated: ${result.data?.slip_number}`);
      } else {
        toast.error(result.error || 'Failed to generate salary slip');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setGeneratingSlip(null);
    }
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No payroll records found. Click &quot;Calculate All&quot; to process payroll.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Gross</TableHead>
            <TableHead className="text-right">Deductions</TableHead>
            <TableHead className="text-right">Net</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => {
            const employee = record.employee as {
              employee_code?: string;
              full_name?: string;
              department?: { department_name?: string };
            } | undefined;
            
            return (
              <TableRow key={record.id}>
                <TableCell className="font-mono text-sm">
                  {employee?.employee_code || '-'}
                </TableCell>
                <TableCell className="font-medium">
                  {employee?.full_name || '-'}
                </TableCell>
                <TableCell>
                  {employee?.department?.department_name || '-'}
                </TableCell>
                <TableCell className="text-right">
                  {formatPayrollCurrency(record.gross_salary)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatPayrollCurrency(record.total_deductions)}
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  {formatPayrollCurrency(record.net_salary)}
                </TableCell>
                <TableCell className="text-center">
                  <PayrollStatusBadge status={record.status} type="record" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {(periodStatus === 'approved' || periodStatus === 'paid' || periodStatus === 'closed') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateSlip(record.id)}
                        disabled={generatingSlip === record.id}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <PayrollRecordDetail
        record={selectedRecord}
        open={!!selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
      />
    </>
  );
}
