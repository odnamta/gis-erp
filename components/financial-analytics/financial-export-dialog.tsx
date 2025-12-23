'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportFinancialReport } from '@/lib/financial-analytics-actions';
import { toast } from 'sonner';

interface FinancialExportDialogProps {
  year: number;
  month: number;
}

const REPORT_TYPES = [
  { value: 'budget-vs-actual', label: 'Budget vs Actual' },
  { value: 'cash-flow', label: 'Cash Flow Statement' },
  { value: 'customer-profitability', label: 'Customer Profitability' },
  { value: 'monthly-pl', label: 'Monthly P&L Summary' },
  { value: 'full-report', label: 'Full Financial Report' },
];

export function FinancialExportDialog({ year, month }: FinancialExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [reportType, setReportType] = useState('full-report');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportFinancialReport(format, reportType, { year, month });
      if (result.success) {
        toast.success('Export started', {
          description: `Your ${format.toUpperCase()} report is being generated.`,
        });
        setOpen(false);
      } else {
        toast.error('Export failed', {
          description: result.error || 'An error occurred while exporting.',
        });
      }
    } catch (error) {
      toast.error('Export failed', {
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Export Financial Report</DialogTitle>
          <DialogDescription>
            Export financial data for {monthName}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger id="report-type">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Format</Label>
            <div className="flex gap-2">
              <Button
                variant={format === 'pdf' ? 'default' : 'outline'}
                className="flex-1 flex items-center gap-2"
                onClick={() => setFormat('pdf')}
              >
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              <Button
                variant={format === 'excel' ? 'default' : 'outline'}
                className="flex-1 flex items-center gap-2"
                onClick={() => setFormat('excel')}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
