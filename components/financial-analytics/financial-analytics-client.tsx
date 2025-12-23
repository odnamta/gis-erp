'use client';

import { useState, useTransition } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FinancialAnalyticsData } from '@/types/financial-analytics';
import { fetchFinancialAnalyticsData } from '@/lib/financial-analytics-actions';
import { aggregateCashFlowByDate, calculateCostBreakdown } from '@/lib/financial-analytics-utils';
import { DateRangeSelector } from './date-range-selector';
import { CashPositionCard } from './cash-position-card';
import { BudgetVsActualTable } from './budget-vs-actual-table';
import { CustomerProfitabilityTable } from './customer-profitability-table';
import { JobTypeProfitabilityTable } from './job-type-profitability-table';
import { MonthlyPLSummaryTable } from './monthly-pl-summary';
import { CashFlowChart } from './cash-flow-chart';
import { RevenueTrendChart } from './revenue-trend-chart';
import { CostBreakdownChart } from './cost-breakdown-chart';
import { CustomerParetoChart } from './customer-pareto-chart';
import { FinancialExportDialog } from './financial-export-dialog';
import {
  BarChart3,
  DollarSign,
  FileText,
  LayoutDashboard,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';

interface FinancialAnalyticsClientProps {
  initialData: FinancialAnalyticsData;
  initialYear: number;
  initialMonth: number;
}

export function FinancialAnalyticsClient({
  initialData,
  initialYear,
  initialMonth,
}: FinancialAnalyticsClientProps) {
  const [data, setData] = useState<FinancialAnalyticsData>(initialData);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [isPending, startTransition] = useTransition();

  const handleDateChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    startTransition(async () => {
      const newData = await fetchFinancialAnalyticsData(newYear, newMonth);
      setData(newData);
    });
  };

  const handleRefresh = () => {
    startTransition(async () => {
      const newData = await fetchFinancialAnalyticsData(year, month);
      setData(newData);
    });
  };

  // Prepare chart data
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month + 2, 0); // 90 days ahead
  const cashFlowChartData = aggregateCashFlowByDate(
    data.cashFlowTransactions,
    data.cashFlowForecast,
    startDate,
    endDate
  );
  const costBreakdownData = calculateCostBreakdown(data.budgetVsActual);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Analytics</h1>
          <p className="text-muted-foreground">
            Deep-dive financial analytics with cash flow tracking and profitability reports
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DateRangeSelector
            year={year}
            month={month}
            onYearChange={(y) => handleDateChange(y, month)}
            onMonthChange={(m) => handleDateChange(year, m)}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
          <FinancialExportDialog year={year} month={month} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Budget vs Actual
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customer P&L
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>


        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CashPositionCard cashPosition={data.cashPosition} />
            <CashFlowChart data={cashFlowChartData} />
          </div>
          <BudgetVsActualTable items={data.budgetVsActual} period={{ year, month }} />
          <CustomerProfitabilityTable customers={data.customerProfitability} limit={5} />
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-6">
          <CashPositionCard cashPosition={data.cashPosition} />
          <CashFlowChart data={cashFlowChartData} title="Cash Flow (90 Days)" />
        </TabsContent>

        {/* Budget vs Actual Tab */}
        <TabsContent value="budget" className="space-y-6">
          <BudgetVsActualTable items={data.budgetVsActual} period={{ year, month }} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CostBreakdownChart data={costBreakdownData} />
            <RevenueTrendChart data={data.monthlyPL} />
          </div>
        </TabsContent>

        {/* Customer P&L Tab */}
        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CustomerParetoChart customers={data.customerProfitability} />
            <JobTypeProfitabilityTable jobTypes={data.jobTypeProfitability} />
          </div>
          <CustomerProfitabilityTable customers={data.customerProfitability} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueTrendChart data={data.monthlyPL} />
            <CustomerParetoChart customers={data.customerProfitability} />
          </div>
          <MonthlyPLSummaryTable monthlyPL={data.monthlyPL} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
