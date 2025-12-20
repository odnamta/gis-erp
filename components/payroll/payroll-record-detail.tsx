'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PayrollRecord, PayrollComponentItem } from '@/types/payroll';
import { formatPayrollCurrency } from '@/lib/payroll-utils';

interface PayrollRecordDetailProps {
  record: PayrollRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ComponentList({ 
  items, 
  title, 
  color 
}: { 
  items: PayrollComponentItem[]; 
  title: string; 
  color: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-muted-foreground">{title}</h4>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span>{item.component_name}</span>
            <span className={color}>{formatPayrollCurrency(item.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PayrollRecordDetail({ record, open, onOpenChange }: PayrollRecordDetailProps) {
  if (!record) return null;

  const employee = record.employee as {
    employee_code?: string;
    full_name?: string;
    department?: { department_name?: string };
    position?: { position_name?: string };
  } | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payroll Detail</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Employee:</span>
                <p className="font-medium">{employee?.full_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Code:</span>
                <p className="font-mono">{employee?.employee_code || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Department:</span>
                <p>{employee?.department?.department_name || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Position:</span>
                <p>{employee?.position?.position_name || '-'}</p>
              </div>
            </div>
          </div>

          {/* Work Data */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">Work Data</h4>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="text-center p-2 bg-muted/30 rounded">
                <p className="text-muted-foreground">Work Days</p>
                <p className="font-medium">{record.work_days}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <p className="text-muted-foreground">Present</p>
                <p className="font-medium text-green-600">{record.present_days}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <p className="text-muted-foreground">Absent</p>
                <p className="font-medium text-red-600">{record.absent_days}</p>
              </div>
              <div className="text-center p-2 bg-muted/30 rounded">
                <p className="text-muted-foreground">Leave</p>
                <p className="font-medium text-blue-600">{record.leave_days}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Earnings */}
          <ComponentList 
            items={record.earnings} 
            title="Earnings" 
            color="text-green-600" 
          />

          <div className="flex justify-between font-medium bg-green-50 p-2 rounded">
            <span>Gross Salary</span>
            <span className="text-green-600">{formatPayrollCurrency(record.gross_salary)}</span>
          </div>

          <Separator />

          {/* Deductions */}
          <ComponentList 
            items={record.deductions} 
            title="Deductions" 
            color="text-red-600" 
          />

          <div className="flex justify-between font-medium bg-red-50 p-2 rounded">
            <span>Total Deductions</span>
            <span className="text-red-600">-{formatPayrollCurrency(record.total_deductions)}</span>
          </div>

          <Separator />

          {/* Net Salary */}
          <div className="flex justify-between text-lg font-bold bg-blue-50 p-3 rounded">
            <span>Net Salary (Take Home)</span>
            <span className="text-blue-600">{formatPayrollCurrency(record.net_salary)}</span>
          </div>

          <Separator />

          {/* Company Contributions */}
          <ComponentList 
            items={record.company_contributions} 
            title="Company Contributions" 
            color="text-purple-600" 
          />

          <div className="flex justify-between font-medium bg-purple-50 p-2 rounded">
            <span>Total Company Cost</span>
            <span className="text-purple-600">{formatPayrollCurrency(record.total_company_cost)}</span>
          </div>

          {/* Bank Info */}
          {record.bank_name && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Bank Details</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Bank:</span> {record.bank_name}</p>
                  <p><span className="text-muted-foreground">Account:</span> {record.bank_account}</p>
                  <p><span className="text-muted-foreground">Name:</span> {record.bank_account_name}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
