'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { createPayrollPeriod } from '@/app/(main)/hr/payroll/actions';
import { MONTH_NAMES_ID } from '@/types/payroll';
import { toast } from 'sonner';

interface PayrollPeriodFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollPeriodForm({ open, onOpenChange }: PayrollPeriodFormProps) {
  const router = useRouter();
  const currentDate = new Date();
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
  const [payDate, setPayDate] = useState('');

  // Generate year options (current year - 1 to current year + 1)
  const yearOptions = [
    currentDate.getFullYear() - 1,
    currentDate.getFullYear(),
    currentDate.getFullYear() + 1,
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createPayrollPeriod({
        period_year: parseInt(year),
        period_month: parseInt(month),
        pay_date: payDate,
      });

      if (result.success && result.data) {
        toast.success('Payroll period created successfully');
        onOpenChange(false);
        router.push(`/hr/payroll/${result.data.id}`);
      } else {
        toast.error(result.error || 'Failed to create payroll period');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Calculate default pay date (5th of next month)
  const getDefaultPayDate = () => {
    const y = parseInt(year);
    const m = parseInt(month);
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    return `${nextYear}-${String(nextMonth).padStart(2, '0')}-05`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Payroll Period</DialogTitle>
          <DialogDescription>
            Create a new payroll period for salary processing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="year">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger id="month">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES_ID.map((name, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payDate">Pay Date</Label>
              <Input
                id="payDate"
                type="date"
                value={payDate || getDefaultPayDate()}
                onChange={(e) => setPayDate(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Date when salaries will be paid
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Period
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
