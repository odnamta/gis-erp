'use client';

// =====================================================
// v0.61: Executive Dashboard Client Component
// Handles interactive features: period selection, export, refresh, customization
// Requirements: 10.1, 10.2, 10.5, 11.1, 11.4, 13.1, 15.1
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  KPISection,
  PeriodSelector,
  SalesFunnel,
  TrendChart,
  LayoutCustomizer,
  ExportDialog,
} from '@/components/executive-dashboard';
import {
  getAllKPIsForDashboard,
  getSalesFunnelData,
  getKPITrend,
  getDashboardLayout,
  saveDashboardLayout,
  resetDashboardLayout,
} from '@/lib/executive-dashboard-actions';
import {
  KPIValue,
  PeriodType,
  DateRange,
  FunnelStage,
  TrendDataPoint,
  DashboardLayout,
  DashboardWidget,
} from '@/types/executive-dashboard';
import { PreviewDropdown } from '@/components/preview/preview-dropdown';
import { usePreview } from '@/hooks/use-preview';
import { Download, RefreshCw, Settings } from 'lucide-react';
import { format } from 'date-fns';

interface ExecutiveDashboardClientProps {
  userRole: string;
  userId: string;
}

export function ExecutiveDashboardClient({
  userRole,
  userId,
}: ExecutiveDashboardClientProps) {
  // Preview mode for owner role
  const { effectiveRole, setPreviewRole, canUsePreview, isPreviewActive } = usePreview();
  
  // Period state (Requirement 11.1)
  const [period, setPeriod] = useState<PeriodType>('mtd');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Layout customization state (Requirement 10.1, 10.2, 10.5)
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Export dialog state (Requirement 15.1)
  const [exportOpen, setExportOpen] = useState(false);

  // KPI data by category (Requirement 13.1 - role-based filtering)
  const [financialKPIs, setFinancialKPIs] = useState<KPIValue[]>([]);
  const [salesKPIs, setSalesKPIs] = useState<KPIValue[]>([]);
  const [operationalKPIs, setOperationalKPIs] = useState<KPIValue[]>([]);
  const [hseKPIs, setHseKPIs] = useState<KPIValue[]>([]);

  // Additional data
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<TrendDataPoint[]>([]);
  const [profitTrend, setProfitTrend] = useState<TrendDataPoint[]>([]);

  // Load dashboard data based on user role (Requirement 13.1)
  const loadDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);

      // Load KPIs by category in parallel - filtered by user role
      const [financial, sales, operational, hse, funnel, revenue, profit, userLayout] = await Promise.all([
        getAllKPIsForDashboard(userRole, 'financial', period),
        getAllKPIsForDashboard(userRole, 'sales', period),
        getAllKPIsForDashboard(userRole, 'operational', period),
        getAllKPIsForDashboard(userRole, 'hse', period),
        getSalesFunnelData(),
        getKPITrend('REV_MTD', 12),
        getKPITrend('PROFIT_MTD', 12),
        getDashboardLayout(userId, userRole, 'executive'),
      ]);

      setFinancialKPIs(financial);
      setSalesKPIs(sales);
      setOperationalKPIs(operational);
      setHseKPIs(hse);
      setFunnelData(funnel);
      setRevenueTrend(revenue);
      setProfitTrend(profit);
      setLayout(userLayout);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userRole, userId, period]);

  // Initial load and reload on period change
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle period change (Requirement 11.1)
  const handlePeriodChange = (newPeriod: PeriodType, range?: DateRange) => {
    setPeriod(newPeriod);
    if (range) {
      setCustomRange(range);
    }
  };

  // Handle layout save (Requirement 10.2)
  const handleSaveLayout = async (widgets: DashboardWidget[]) => {
    try {
      await saveDashboardLayout(userId, 'executive', widgets);
      // Reload to get updated layout
      await loadDashboardData();
    } catch (error) {
      console.error('Error saving layout:', error);
      throw error;
    }
  };

  // Handle layout reset (Requirement 10.3)
  const handleResetLayout = async () => {
    try {
      await resetDashboardLayout(userId, 'executive');
      // Reload to get default layout
      await loadDashboardData();
    } catch (error) {
      console.error('Error resetting layout:', error);
      throw error;
    }
  };

  // Format currency for chart
  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}M`;
    return `Rp ${value.toLocaleString()}`;
  };

  // Period label (Requirement 11.4 - display selected period prominently)
  const getPeriodLabel = () => {
    switch (period) {
      case 'mtd':
        return format(new Date(), 'MMMM yyyy');
      case 'qtd':
        const quarter = Math.floor(new Date().getMonth() / 3) + 1;
        return `Q${quarter} ${new Date().getFullYear()}`;
      case 'ytd':
        return `Year ${new Date().getFullYear()}`;
      case 'custom':
        if (customRange) {
          return `${format(customRange.start, 'MMM d')} - ${format(customRange.end, 'MMM d, yyyy')}`;
        }
        return 'Custom';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with period selector and export button (Requirements 11.1, 11.4, 15.1) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Executive Dashboard</h1>
          <p className="text-muted-foreground">{getPeriodLabel()}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Preview Dropdown for Owner */}
          <PreviewDropdown
            currentRole={effectiveRole}
            actualRole={userRole as any}
            onRoleSelect={setPreviewRole}
            canUsePreview={canUsePreview}
            isPreviewActive={isPreviewActive}
          />

          {/* Period Selector (Requirement 11.1) */}
          <PeriodSelector
            value={period}
            onChange={handlePeriodChange}
            allowCustom
          />

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={loadDashboardData}
            disabled={refreshing}
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export Button (Requirement 15.1) */}
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          {/* Settings Button (Requirement 10.1 - customization) */}
          <Button 
            variant="outline" 
            size="icon" 
            title="Customize dashboard"
            onClick={() => setCustomizeOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Financial KPIs Section */}
      {financialKPIs.length > 0 && (
        <KPISection
          title="Financial Overview"
          category="financial"
          kpis={financialKPIs}
        />
      )}

      {/* Sales KPIs Section */}
      {salesKPIs.length > 0 && (
        <KPISection
          title="Sales Pipeline"
          category="sales"
          kpis={salesKPIs}
        />
      )}

      {/* Sales Funnel */}
      {funnelData.length > 0 && (
        <SalesFunnel data={funnelData} showValues />
      )}

      {/* Operations KPIs Section */}
      {operationalKPIs.length > 0 && (
        <KPISection
          title="Operations"
          category="operational"
          kpis={operationalKPIs}
        />
      )}

      {/* HSE KPIs Section */}
      {hseKPIs.length > 0 && (
        <KPISection
          title="Health, Safety & Environment"
          category="hse"
          kpis={hseKPIs}
        />
      )}

      {/* Trend Chart */}
      {(revenueTrend.length > 0 || profitTrend.length > 0) && (
        <TrendChart
          title="Revenue & Profit Trend (12 Months)"
          data={revenueTrend}
          secondaryData={profitTrend}
          primaryLabel="Revenue"
          secondaryLabel="Profit"
          formatValue={formatCurrency}
        />
      )}

      {/* Empty state when no KPIs are visible for the user's role */}
      {financialKPIs.length === 0 && 
       salesKPIs.length === 0 && 
       operationalKPIs.length === 0 && 
       hseKPIs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No KPIs are available for your role. Contact your administrator for access.
          </p>
        </div>
      )}

      {/* Layout Customizer Dialog (Requirement 10.1, 10.2, 10.5) */}
      {layout && (
        <LayoutCustomizer
          open={customizeOpen}
          onOpenChange={setCustomizeOpen}
          layout={layout}
          onSave={handleSaveLayout}
          onReset={handleResetLayout}
        />
      )}

      {/* Export Dialog (Requirement 15.1, 15.2, 15.3) */}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        kpis={[...financialKPIs, ...salesKPIs, ...operationalKPIs, ...hseKPIs]}
        period={period}
      />
    </div>
  );
}
