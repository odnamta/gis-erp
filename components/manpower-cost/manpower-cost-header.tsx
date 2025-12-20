'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Download, Loader2 } from 'lucide-react';
import { getManpowerCostExportData } from '@/app/(main)/hr/manpower-cost/actions';
import { toast } from 'sonner';
import { MONTH_NAMES_ID } from '@/types/manpower-cost';

interface ManpowerCostHeaderProps {
  year: number;
  month: number;
  availablePeriods: Array<{ year: number; month: number; name: string }>;
  onPeriodChange: (year: number, month: number) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function ManpowerCostHeader({
  year,
  month,
  availablePeriods,
  onPeriodChange,
  onRefresh,
  isLoading,
}: ManpowerCostHeaderProps) {
  const [isExporting, setIsExporting] = useState(false);

  // Get unique years from available periods
  const years = [...new Set(availablePeriods.map(p => p.year))].sort((a, b) => b - a);
  
  // Get months for selected year
  const monthsForYear = availablePeriods
    .filter(p => p.year === year)
    .map(p => p.month)
    .sort((a, b) => b - a);

  // If no periods available, use current year and all months
  const displayYears = years.length > 0 ? years : [new Date().getFullYear()];
  const displayMonths = monthsForYear.length > 0 ? monthsForYear : Array.from({ length: 12 }, (_, i) => i + 1);

  const handleYearChange = (newYear: string) => {
    const yearNum = parseInt(newYear);
    // Find first available month for this year
    const monthsForNewYear = availablePeriods
      .filter(p => p.year === yearNum)
      .map(p => p.month);
    const newMonth = monthsForNewYear.length > 0 ? Math.max(...monthsForNewYear) : month;
    onPeriodChange(yearNum, newMonth);
  };

  const handleMonthChange = (newMonth: string) => {
    onPeriodChange(year, parseInt(newMonth));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await getManpowerCostExportData(year, month);
      
      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to export data');
        return;
      }

      // Create CSV content (simpler than Excel for now)
      const headers = [
        'Department',
        'Employee Count',
        'Base Salary',
        'Allowances',
        'Overtime',
        'Gross Salary',
        'Deductions',
        'Net Salary',
        'Company Contributions',
        'Total Company Cost',
        'Avg Salary',
        'Cost Per Employee',
      ];

      const rows = result.data.rows.map(row => [
        row.department,
        row.employee_count,
        row.base_salary,
        row.allowances,
        row.overtime,
        row.gross_salary,
        row.deductions,
        row.net_salary,
        row.company_contributions,
        row.total_company_cost,
        row.avg_salary,
        row.cost_per_employee,
      ]);

      // Add totals row
      rows.push([
        'TOTAL',
        result.data.totals.employee_count,
        result.data.totals.base_salary,
        result.data.totals.allowances,
        result.data.totals.overtime,
        result.data.totals.gross_salary,
        result.data.totals.deductions,
        result.data.totals.net_salary,
        result.data.totals.company_contributions,
        result.data.totals.total_company_cost,
        result.data.totals.avg_salary,
        result.data.totals.cost_per_employee,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      // Download as CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.data.filename.replace('.xlsx', '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold">Manpower Cost Analysis</h1>
        <p className="text-muted-foreground">
          Track and analyze labor costs by department
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Period:</span>
          <Select value={month.toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {displayMonths.map(m => (
                <SelectItem key={m} value={m.toString()}>
                  {MONTH_NAMES_ID[m - 1]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {displayYears.map(y => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || isLoading}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
