'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ManpowerCostHeader } from './manpower-cost-header';
import { ManpowerCostSummaryCard } from './manpower-cost-summary-card';
import { DepartmentBreakdownTable } from './department-breakdown-table';
import { CostDistributionChart } from './cost-distribution-chart';
import { CostTrendChart } from './cost-trend-chart';
import {
  ManpowerCostWithDepartment,
  ManpowerCostTrendPoint,
  DepartmentCostPercentage,
} from '@/types/manpower-cost';
import {
  getManpowerCostDashboardData,
  refreshManpowerCostSummary,
} from '@/app/(main)/hr/manpower-cost/actions';
import { calculateTotalRow } from '@/lib/manpower-cost-utils';
import { toast } from 'sonner';

interface ManpowerCostDashboardProps {
  initialData: {
    summaries: ManpowerCostWithDepartment[];
    totalCompanyCost: number;
    percentages: DepartmentCostPercentage[];
    trendData: ManpowerCostTrendPoint[];
  };
  availablePeriods: Array<{ year: number; month: number; name: string }>;
  initialYear: number;
  initialMonth: number;
}

export function ManpowerCostDashboard({
  initialData,
  availablePeriods,
  initialYear,
  initialMonth,
}: ManpowerCostDashboardProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();

  const totals = calculateTotalRow(data.summaries);

  const handlePeriodChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    
    startTransition(async () => {
      const newData = await getManpowerCostDashboardData(newYear, newMonth);
      setData(newData);
    });
  };

  const handleRefresh = async () => {
    startTransition(async () => {
      const result = await refreshManpowerCostSummary(year, month);
      if (result.success) {
        const newData = await getManpowerCostDashboardData(year, month);
        setData(newData);
        toast.success('Data refreshed successfully');
      } else {
        toast.error(result.error || 'Failed to refresh data');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with period selector and actions */}
      <ManpowerCostHeader
        year={year}
        month={month}
        availablePeriods={availablePeriods}
        onPeriodChange={handlePeriodChange}
        onRefresh={handleRefresh}
        isLoading={isPending}
      />

      {/* Total Company Cost Card */}
      <ManpowerCostSummaryCard
        totalCompanyCost={data.totalCompanyCost}
        employeeCount={totals.employee_count}
        isLoading={isPending}
      />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Distribution by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <CostDistributionChart
              percentages={data.percentages}
              isLoading={isPending}
            />
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <CostTrendChart
              trendData={data.trendData}
              isLoading={isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Department Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <DepartmentBreakdownTable
            summaries={data.summaries}
            totals={totals}
            isLoading={isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
