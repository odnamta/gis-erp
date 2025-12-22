'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import { UtilizationSummaryCards } from '@/components/utilization/utilization-summary-cards';
import { UtilizationTable } from '@/components/utilization/utilization-table';
import { UtilizationChart } from '@/components/utilization/utilization-chart';
import {
  getUtilizationSummary,
  getUtilizationTrend,
  refreshUtilizationView,
} from '@/lib/utilization-actions';
import {
  calculateDashboardStats,
  getMonthString,
  getLastNMonths,
  formatMonthDisplay,
} from '@/lib/utilization-utils';
import { downloadExcelReport, ExportColumn } from '@/lib/reports/export-utils';
import { UtilizationSummary, UtilizationDashboardStats } from '@/types/utilization';
import { toast } from 'sonner';

export function UtilizationClient() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(getMonthString(new Date()));
  const [summaries, setSummaries] = useState<UtilizationSummary[]>([]);
  const [stats, setStats] = useState<UtilizationDashboardStats>({
    averageUtilizationRate: 0,
    operatingCount: 0,
    idleCount: 0,
    maintenanceCount: 0,
    totalAssets: 0,
  });
  const [trend, setTrend] = useState<{ month: string; averageRate: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const months = getLastNMonths(12);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryResult, trendResult] = await Promise.all([
        getUtilizationSummary(selectedMonth),
        getUtilizationTrend(6),
      ]);

      if (summaryResult.success && summaryResult.data) {
        setSummaries(summaryResult.data);
        setStats(calculateDashboardStats(summaryResult.data));
      }

      if (trendResult.success && trendResult.data) {
        setTrend(trendResult.data);
      }
    } catch (error) {
      console.error('Error loading utilization data:', error);
      toast.error('Failed to load utilization data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const result = await refreshUtilizationView();
      if (result.success) {
        toast.success('Utilization data refreshed');
        await loadData();
      } else {
        toast.error(result.error || 'Failed to refresh data');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }

  function handleAssetClick(assetId: string) {
    router.push(`/equipment/${assetId}`);
  }

  async function handleExport() {
    if (summaries.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExporting(true);
    try {
      const columns: ExportColumn[] = [
        { key: 'assetCode', header: 'Asset Code', format: 'text' },
        { key: 'assetName', header: 'Asset Name', format: 'text' },
        { key: 'operatingDays', header: 'Operating Days', format: 'number' },
        { key: 'idleDays', header: 'Idle Days', format: 'number' },
        { key: 'maintenanceDays', header: 'Maintenance Days', format: 'number' },
        { key: 'totalLoggedDays', header: 'Total Logged Days', format: 'number' },
        { key: 'utilizationRate', header: 'Utilization Rate (%)', format: 'percentage' },
        { key: 'totalKm', header: 'Total KM', format: 'number' },
        { key: 'totalHours', header: 'Total Hours', format: 'number' },
        { key: 'totalFuelLiters', header: 'Fuel (Liters)', format: 'number' },
        { key: 'totalFuelCost', header: 'Fuel Cost (IDR)', format: 'currency' },
        { key: 'kmPerLiter', header: 'KM/Liter', format: 'number' },
      ];

      const data = summaries.map((s) => ({
        assetCode: s.assetCode,
        assetName: s.assetName,
        operatingDays: s.operatingDays,
        idleDays: s.idleDays,
        maintenanceDays: s.maintenanceDays,
        totalLoggedDays: s.totalLoggedDays,
        utilizationRate: s.utilizationRate,
        totalKm: s.totalKm,
        totalHours: s.totalHours,
        totalFuelLiters: s.totalFuelLiters,
        totalFuelCost: s.totalFuelCost,
        kmPerLiter: s.kmPerLiter || 0,
      }));

      await downloadExcelReport({
        reportTitle: `Equipment Utilization - ${formatMonthDisplay(selectedMonth)}`,
        columns,
        data,
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'Gama ERP',
          reportTitle: 'Equipment Utilization Report',
        },
        summary: [
          { label: 'Period', value: formatMonthDisplay(selectedMonth) },
          { label: 'Total Assets', value: stats.totalAssets },
          { label: 'Average Utilization', value: `${stats.averageUtilizationRate}%` },
          { label: 'Operating Assets', value: stats.operatingCount },
          { label: 'Idle Assets', value: stats.idleCount },
        ],
      });

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipment Utilization</h1>
          <p className="text-muted-foreground">
            Track equipment usage and productivity metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonthDisplay(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting || loading}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <UtilizationSummaryCards stats={stats} />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <UtilizationTable data={summaries} onAssetClick={handleAssetClick} />
            </div>
          </div>

          <UtilizationChart data={trend} />
        </>
      )}
    </div>
  );
}
