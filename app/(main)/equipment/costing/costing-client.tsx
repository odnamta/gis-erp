'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import {
  CostingSummaryCards,
  TCOAnalysisTable,
  CostBreakdownChart,
  BatchDepreciationDialog,
} from '@/components/costing';
import {
  getTCOSummary,
  getCostBreakdown,
  refreshTCOView,
} from '@/lib/depreciation-actions';
import { calculateCostingDashboardStats } from '@/lib/depreciation-utils';
import { downloadExcelReport, ExportColumn } from '@/lib/reports/export-utils';
import { AssetTCOSummary, CostBreakdown, CostingDashboardStats } from '@/types/depreciation';
import { toast } from 'sonner';

export function CostingClient() {
  const router = useRouter();
  const [tcoData, setTcoData] = useState<AssetTCOSummary[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [stats, setStats] = useState<CostingDashboardStats>({
    totalFleetValue: 0,
    totalAccumulatedDepreciation: 0,
    totalTCO: 0,
    averageCostPerKm: 0,
    assetCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tcoResult, breakdownResult] = await Promise.all([
        getTCOSummary(),
        getCostBreakdown(),
      ]);

      if (tcoResult.success && tcoResult.data) {
        setTcoData(tcoResult.data);
        setStats(calculateCostingDashboardStats(tcoResult.data));
      }

      if (breakdownResult.success && breakdownResult.data) {
        setCostBreakdown(breakdownResult.data);
      }
    } catch (error) {
      console.error('Error loading costing data:', error);
      toast.error('Failed to load costing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const result = await refreshTCOView();
      if (result.success) {
        toast.success('TCO data refreshed');
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
    router.push(`/equipment/${assetId}/costs`);
  }

  async function handleExport() {
    if (tcoData.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExporting(true);
    try {
      const columns: ExportColumn[] = [
        { key: 'assetCode', header: 'Asset Code', format: 'text' },
        { key: 'assetName', header: 'Asset Name', format: 'text' },
        { key: 'categoryName', header: 'Category', format: 'text' },
        { key: 'purchasePrice', header: 'Purchase Price (IDR)', format: 'currency' },
        { key: 'currentBookValue', header: 'Book Value (IDR)', format: 'currency' },
        { key: 'totalMaintenanceCost', header: 'Maintenance (IDR)', format: 'currency' },
        { key: 'totalFuelCost', header: 'Fuel (IDR)', format: 'currency' },
        { key: 'totalDepreciation', header: 'Depreciation (IDR)', format: 'currency' },
        { key: 'totalInsuranceCost', header: 'Insurance (IDR)', format: 'currency' },
        { key: 'totalRegistrationCost', header: 'Registration (IDR)', format: 'currency' },
        { key: 'totalOtherCost', header: 'Other (IDR)', format: 'currency' },
        { key: 'totalTCO', header: 'Total TCO (IDR)', format: 'currency' },
        { key: 'totalKm', header: 'Total KM', format: 'number' },
        { key: 'costPerKm', header: 'Cost/KM (IDR)', format: 'currency' },
      ];

      const data = tcoData.map((item) => ({
        assetCode: item.assetCode,
        assetName: item.assetName,
        categoryName: item.categoryName,
        purchasePrice: item.purchasePrice,
        currentBookValue: item.currentBookValue,
        totalMaintenanceCost: item.totalMaintenanceCost,
        totalFuelCost: item.totalFuelCost,
        totalDepreciation: item.totalDepreciation,
        totalInsuranceCost: item.totalInsuranceCost,
        totalRegistrationCost: item.totalRegistrationCost,
        totalOtherCost: item.totalOtherCost,
        totalTCO: item.totalTCO,
        totalKm: item.totalKm,
        costPerKm: item.costPerKm || 0,
      }));

      await downloadExcelReport({
        reportTitle: 'Equipment TCO Analysis',
        columns,
        data,
        metadata: {
          generatedAt: new Date(),
          generatedBy: 'Gama ERP',
          reportTitle: 'Total Cost of Ownership Report',
        },
        summary: [
          { label: 'Total Assets', value: stats.assetCount },
          { label: 'Total Fleet Value', value: stats.totalFleetValue },
          { label: 'Total TCO', value: stats.totalTCO },
          { label: 'Avg Cost/KM', value: stats.averageCostPerKm },
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
          <h1 className="text-2xl font-bold tracking-tight">Equipment Costing</h1>
          <p className="text-muted-foreground">
            Track depreciation and Total Cost of Ownership
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BatchDepreciationDialog onComplete={loadData} />
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
          <CostingSummaryCards stats={stats} />

          <Tabs defaultValue="tco" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tco">TCO Analysis</TabsTrigger>
              <TabsTrigger value="breakdown">Cost Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="tco" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Cost of Ownership by Asset</CardTitle>
                </CardHeader>
                <CardContent>
                  <TCOAnalysisTable data={tcoData} onAssetClick={handleAssetClick} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="breakdown" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <CostBreakdownChart data={costBreakdown} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
