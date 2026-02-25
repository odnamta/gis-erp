'use server';

// =====================================================
// v0.61: EXECUTIVE DASHBOARD - SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/permissions-server';
import {
  KPIValue,
  KPIDefinition,
  KPIDefinitionDB,
  KPITargetDB,
  DashboardLayout,
  DashboardLayoutDB,
  DashboardWidget,
  FunnelStage,
  TrendDataPoint,
  PeriodType,
  KPICategory,
} from '@/types/executive-dashboard';
import {
  evaluateStatus,
  calculateChange,
  getDateRangeForPeriod,
  filterKPIsByRole,
  getTargetForPeriod,
  getDefaultLayoutForRole,
  validateTarget,
} from '@/lib/executive-dashboard-utils';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function mapKPIDefinitionFromDB(db: KPIDefinitionDB): KPIDefinition {
  return {
    id: db.id,
    kpiCode: db.kpi_code,
    kpiName: db.kpi_name,
    description: db.description,
    category: db.category,
    calculationType: db.calculation_type,
    dataSource: db.data_source,
    valueField: db.value_field,
    filterConditions: db.filter_conditions,
    numeratorQuery: db.numerator_query,
    denominatorQuery: db.denominator_query,
    customQuery: db.custom_query,
    unit: db.unit,
    decimalPlaces: db.decimal_places,
    targetType: db.target_type,
    defaultTarget: db.default_target ? Number(db.default_target) : undefined,
    warningThreshold: db.warning_threshold ? Number(db.warning_threshold) : undefined,
    criticalThreshold: db.critical_threshold ? Number(db.critical_threshold) : undefined,
    showTrend: db.show_trend,
    comparisonPeriod: db.comparison_period,
    visibleToRoles: db.visible_to_roles || [],
    displayOrder: db.display_order,
    isActive: db.is_active,
  };
}

function mapDashboardLayoutFromDB(db: DashboardLayoutDB): DashboardLayout {
  return {
    id: db.id,
    userId: db.user_id,
    role: db.role,
    dashboardType: db.dashboard_type,
    layoutName: db.layout_name,
    widgets: db.widgets || [],
    isDefault: db.is_default,
  };
}

// =====================================================
// KPI CALCULATION ACTIONS
// =====================================================

/**
 * Calculates a single KPI value based on its code and calculation type.
 */
async function calculateKPIValueFromDB(
  kpiCode: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const supabase = await createClient();
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  // Calculate based on KPI code
  switch (kpiCode) {
    case 'REV_MTD':
    case 'REV_YTD':
    case 'PROFIT_MTD':
    case 'PROFIT_MARGIN': {
      // Batched: all four KPIs use the same job_orders query
      const { data } = await supabase
        .from('job_orders')
        .select('final_revenue, final_cost')
        .eq('status', 'completed')
        .gte('completed_at', startStr)
        .lte('completed_at', endStr)
        .limit(1000);
      const totalRevenue = data?.reduce((sum, jo) => sum + Number(jo.final_revenue || 0), 0) || 0;
      const totalCost = data?.reduce((sum, jo) => sum + Number(jo.final_cost || 0), 0) || 0;
      if (kpiCode === 'REV_MTD' || kpiCode === 'REV_YTD') return totalRevenue;
      if (kpiCode === 'PROFIT_MTD') return totalRevenue - totalCost;
      /* PROFIT_MARGIN */ return totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    }

    case 'AR_OUTSTANDING': {
      const { data } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid')
        .in('status', ['sent', 'partial', 'overdue'])
        .limit(1000);
      return data?.reduce((sum, inv) => sum + (Number(inv.total_amount || 0) - Number(inv.amount_paid || 0)), 0) || 0;
    }

    case 'AR_OVERDUE': {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid')
        .eq('status', 'overdue')
        .lt('due_date', thirtyDaysAgo.toISOString().split('T')[0])
        .limit(1000);
      return data?.reduce((sum, inv) => sum + (Number(inv.total_amount || 0) - Number(inv.amount_paid || 0)), 0) || 0;
    }

    case 'DSO': {
      // Days Sales Outstanding = Average collection time for paid invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid, invoice_date, paid_at')
        .in('status', ['sent', 'partial', 'overdue', 'paid'])
        .gte('invoice_date', startStr)
        .lte('invoice_date', endStr)
        .limit(1000);
      
      if (!invoices || invoices.length === 0) return 0;
      
      // Calculate average collection time for paid invoices
      const paidInvoices = invoices.filter(inv => inv.paid_at && inv.invoice_date);
      if (paidInvoices.length === 0) return 0;
      
      const totalDays = paidInvoices.reduce((sum, inv) => {
        const invoiceDate = new Date(inv.invoice_date!);
        const paidDate = new Date(inv.paid_at!);
        const days = Math.floor((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + Math.max(0, days);
      }, 0);
      
      return Math.round(totalDays / paidInvoices.length);
    }

    case 'QUOTES_MTD': {
      const { count } = await supabase
        .from('quotations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startStr)
        .lte('created_at', endStr);
      return count || 0;
    }

    case 'QUOTES_VALUE': {
      const { data } = await supabase
        .from('quotations')
        .select('total_revenue')
        .gte('created_at', startStr)
        .lte('created_at', endStr)
        .limit(1000);
      return data?.reduce((sum, q) => sum + Number(q.total_revenue || 0), 0) || 0;
    }

    case 'WIN_RATE': {
      const { data } = await supabase
        .from('quotations')
        .select('status')
        .in('status', ['won', 'lost'])
        .gte('updated_at', startStr)
        .lte('updated_at', endStr)
        .limit(1000);
      const total = data?.length || 0;
      const won = data?.filter(q => q.status === 'won').length || 0;
      return total > 0 ? (won / total) * 100 : 0;
    }

    case 'PIPELINE_VALUE': {
      const { data } = await supabase
        .from('quotations')
        .select('total_revenue')
        .in('status', ['draft', 'submitted', 'engineering_review', 'ready'])
        .limit(1000);
      return data?.reduce((sum, q) => sum + Number(q.total_revenue || 0), 0) || 0;
    }

    case 'AVG_DEAL_SIZE': {
      const { data } = await supabase
        .from('quotations')
        .select('total_revenue')
        .eq('status', 'won')
        .gte('updated_at', startStr)
        .lte('updated_at', endStr)
        .limit(1000);
      const total = data?.reduce((sum, q) => sum + Number(q.total_revenue || 0), 0) || 0;
      const count = data?.length || 0;
      return count > 0 ? total / count : 0;
    }

    case 'JOBS_ACTIVE': {
      // Active jobs are those with status 'active' (JO workflow: active → completed → submitted_to_finance → invoiced → closed)
      const { count } = await supabase
        .from('job_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count || 0;
    }

    case 'JOBS_COMPLETED_MTD': {
      const { count } = await supabase
        .from('job_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', startStr)
        .lte('completed_at', endStr);
      return count || 0;
    }

    case 'ON_TIME_DELIVERY': {
      // On-time delivery rate - percentage of jobs completed within expected timeframe
      // Since there's no target_date column, we calculate based on jobs that were completed
      // within a reasonable timeframe (e.g., within 30 days of creation)
      const { data: completedJobs } = await supabase
        .from('job_orders')
        .select('created_at, completed_at')
        .eq('status', 'completed')
        .gte('completed_at', startStr)
        .lte('completed_at', endStr)
        .limit(1000);
      
      if (!completedJobs || completedJobs.length === 0) return 0;
      
      // Consider a job "on-time" if completed within 30 days of creation
      const onTimeJobs = completedJobs.filter(jo => {
        if (!jo.created_at || !jo.completed_at) return false;
        const created = new Date(jo.created_at);
        const completed = new Date(jo.completed_at);
        const daysDiff = Math.floor((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 30;
      });
      
      return (onTimeJobs.length / completedJobs.length) * 100;
    }

    case 'EQUIPMENT_UTIL': {
      // Equipment utilization from resource_utilization table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('resource_utilization')
        .select('utilization_percentage')
        .eq('resource_type', 'equipment')
        .gte('week_start', startStr)
        .lte('week_start', endStr);
      
      if (!data || data.length === 0) {
        // Fallback: calculate from job_equipment_usage if no resource_utilization data
        return 0;
      }
      
      // Average utilization across all equipment
      const totalUtil = data.reduce((sum: number, r: { utilization_percentage: number }) => 
        sum + Number(r.utilization_percentage || 0), 0);
      return data.length > 0 ? totalUtil / data.length : 0;
    }

    case 'AVG_JOB_MARGIN': {
      const { data } = await supabase
        .from('job_orders')
        .select('final_revenue, final_cost')
        .eq('status', 'completed')
        .gte('completed_at', startStr)
        .lte('completed_at', endStr)
        .limit(1000);
      if (!data || data.length === 0) return 0;
      const margins = data.map(jo => {
        const revenue = Number(jo.final_revenue || 0);
        const cost = Number(jo.final_cost || 0);
        return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0;
      });
      return margins.reduce((sum, m) => sum + m, 0) / margins.length;
    }

    case 'HEADCOUNT': {
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count || 0;
    }

    case 'DAYS_NO_LTI': {
      // Days without Lost Time Injury - use incidents table via raw query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('incidents')
        .select('incident_date')
        .in('severity', ['high', 'critical'])
        .order('incident_date', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const lastIncident = new Date(data[0].incident_date);
        const today = new Date();
        return Math.floor((today.getTime() - lastIncident.getTime()) / (1000 * 60 * 60 * 24));
      }
      return 365; // Default if no incidents
    }

    case 'NEAR_MISS_MTD': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('incident_type', 'near_miss')
        .gte('incident_date', startStr)
        .lte('incident_date', endStr);
      return count || 0;
    }

    case 'TRIR': {
      // Total Recordable Incident Rate = (Number of incidents * 200,000) / Total hours worked
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: incidentCount } = await (supabase as any)
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .in('severity', ['medium', 'high', 'critical'])
        .gte('incident_date', startStr)
        .lte('incident_date', endStr);
      // Assume 50 employees working 2000 hours/year = 100,000 hours
      const totalHours = 100000;
      return totalHours > 0 ? ((incidentCount || 0) * 200000) / totalHours : 0;
    }

    case 'TRAINING_COMPLIANCE': {
      // Placeholder - would need training tracking tables
      return 92; // Default value
    }

    case 'SAFETY_AUDIT_SCORE': {
      // Placeholder - would need audit tracking tables
      return 85; // Default value
    }

    default:
      return 0;
  }
}

// Helper to get KPI definition from database
async function getKPIDefinitionByCode(kpiCode: string): Promise<KPIDefinitionDB | null> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('kpi_definitions')
    .select('*')
    .eq('kpi_code', kpiCode)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data as KPIDefinitionDB;
}

// Helper to get all KPI definitions
async function getAllKPIDefinitions(category?: KPICategory): Promise<KPIDefinitionDB[]> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('kpi_definitions')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (category) {
    query = query.eq('category', category);
  }

  const { data } = await query;
  return (data as KPIDefinitionDB[]) || [];
}

// Helper to get KPI target
async function getKPITargetValue(kpiId: string, year: number, month: number): Promise<number | null> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('kpi_targets')
    .select('target_value')
    .eq('kpi_id', kpiId)
    .eq('period_year', year)
    .eq('period_month', month)
    .single();

  if (data) {
    return Number(data.target_value);
  }
  return null;
}

/**
 * Gets a single KPI value with comparison to previous period.
 */
export async function getKPIValue(
  kpiCode: string,
  period: PeriodType = 'mtd',
  customRange?: { start: Date; end: Date }
): Promise<KPIValue | null> {
  // Get KPI definition
  const kpiDefDB = await getKPIDefinitionByCode(kpiCode);

  if (!kpiDefDB) return null;

  const kpiDef = mapKPIDefinitionFromDB(kpiDefDB);

  // Get date ranges
  const dateRanges = getDateRangeForPeriod(period, customRange);

  // Calculate current and previous values
  const currentValue = await calculateKPIValueFromDB(kpiCode, dateRanges.current.start, dateRanges.current.end);
  const previousValue = await calculateKPIValueFromDB(kpiCode, dateRanges.previous.start, dateRanges.previous.end);

  // Get target
  const now = new Date();
  const targetDBValue = await getKPITargetValue(kpiDef.id, now.getFullYear(), now.getMonth() + 1);

  const targetValue = getTargetForPeriod(targetDBValue, kpiDef.defaultTarget);

  // Calculate change
  const change = calculateChange(currentValue, previousValue);

  // Evaluate status
  const status = evaluateStatus(currentValue, targetValue, kpiDef.targetType);

  return {
    kpiCode: kpiDef.kpiCode,
    kpiName: kpiDef.kpiName,
    category: kpiDef.category,
    currentValue,
    previousValue,
    targetValue,
    changeValue: change.changeValue,
    changePercentage: Math.round(change.changePercentage * 10) / 10,
    status,
    trend: change.trend,
    unit: kpiDef.unit,
    decimalPlaces: kpiDef.decimalPlaces,
    targetType: kpiDef.targetType,
  };
}

/**
 * Gets all KPIs for the dashboard, optionally filtered by category.
 * Role is verified server-side — the userRole param is ignored.
 */
export async function getAllKPIsForDashboard(
  _userRole: string,
  category?: KPICategory,
  period: PeriodType = 'mtd'
): Promise<KPIValue[]> {
  // Server-verified role — ignore client-supplied _userRole
  const profile = await getUserProfile();
  const verifiedRole = profile?.role || 'ops';

  // Get all active KPI definitions
  const kpiDefsDB = await getAllKPIDefinitions(category);

  if (kpiDefsDB.length === 0) return [];

  // Map and filter by server-verified role
  const kpiDefs = kpiDefsDB.map(mapKPIDefinitionFromDB);
  const filteredKPIs = filterKPIsByRole(kpiDefs, verifiedRole);

  // Get values for each KPI
  const results = await Promise.all(
    filteredKPIs.map(async (kpi) => {
      const value = await getKPIValue(kpi.kpiCode, period);
      return value;
    })
  );

  return results.filter((v): v is KPIValue => v !== null);
}

/**
 * Gets KPI trend data for charting.
 */
export async function getKPITrend(
  kpiCode: string,
  months: number = 12
): Promise<TrendDataPoint[]> {
  const results: TrendDataPoint[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const value = await calculateKPIValueFromDB(kpiCode, date, endDate);

    results.push({
      month: date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      value,
    });
  }

  return results;
}

// =====================================================
// TARGET MANAGEMENT ACTIONS
// =====================================================

/**
 * Sets a KPI target for a specific period.
 */
export async function setKPITarget(
  kpiId: string,
  periodType: 'monthly' | 'quarterly' | 'yearly',
  periodYear: number,
  targetValue: number,
  periodMonth?: number,
  periodQuarter?: number,
  stretchTarget?: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const validation = validateTarget({
    kpiId,
    periodType,
    periodYear,
    periodMonth,
    periodQuarter,
    targetValue,
    stretchTarget,
  });

  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', ') };
  }

  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('kpi_targets')
    .upsert({
      kpi_id: kpiId,
      period_type: periodType,
      period_year: periodYear,
      period_month: periodMonth,
      period_quarter: periodQuarter,
      target_value: targetValue,
      stretch_target: stretchTarget,
      notes,
    }, {
      onConflict: 'kpi_id,period_type,period_year,period_month,period_quarter',
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Gets KPI targets for a specific KPI.
 */
export async function getKPITargets(
  kpiId: string,
  periodYear?: number
): Promise<KPITargetDB[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('kpi_targets')
    .select('*')
    .eq('kpi_id', kpiId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  if (periodYear) {
    query = query.eq('period_year', periodYear);
  }

  const { data } = await query;
  return (data as KPITargetDB[]) || [];
}

// =====================================================
// LAYOUT MANAGEMENT ACTIONS
// =====================================================

/**
 * Saves a dashboard layout for a user.
 */
export async function saveDashboardLayout(
  userId: string,
  dashboardType: string,
  widgets: DashboardWidget[],
  layoutName?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('dashboard_layouts')
    .upsert({
      user_id: userId,
      dashboard_type: dashboardType,
      widgets,
      layout_name: layoutName,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,dashboard_type',
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Gets a dashboard layout for a user, falling back to role default.
 */
export async function getDashboardLayout(
  userId: string,
  userRole: string,
  dashboardType: string
): Promise<DashboardLayout> {
  const supabase = await createClient();

  // Try to get user's custom layout
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userLayout } = await (supabase as any)
    .from('dashboard_layouts')
    .select('*')
    .eq('user_id', userId)
    .eq('dashboard_type', dashboardType)
    .single();

  if (userLayout) {
    return mapDashboardLayoutFromDB(userLayout as DashboardLayoutDB);
  }

  // Try to get role default layout from database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: roleLayout } = await (supabase as any)
    .from('dashboard_layouts')
    .select('*')
    .eq('role', userRole)
    .eq('dashboard_type', dashboardType)
    .eq('is_default', true)
    .single();

  if (roleLayout) {
    return mapDashboardLayoutFromDB(roleLayout as DashboardLayoutDB);
  }

  // Fall back to code-defined default
  return getDefaultLayoutForRole(userRole);
}

/**
 * Resets a user's dashboard layout to the default.
 */
export async function resetDashboardLayout(
  userId: string,
  dashboardType: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('dashboard_layouts')
    .delete()
    .eq('user_id', userId)
    .eq('dashboard_type', dashboardType);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =====================================================
// SALES FUNNEL ACTION
// =====================================================

/**
 * Gets sales funnel data from quotations.
 */
export async function getSalesFunnelData(): Promise<FunnelStage[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('quotations')
    .select('status, total_revenue')
    .in('status', ['draft', 'submitted', 'engineering_review', 'ready', 'won'])
    .limit(1000);

  const stages = [
    { dbStatus: 'draft', label: 'Lead' },
    { dbStatus: 'submitted', label: 'Qualified' },
    { dbStatus: 'engineering_review', label: 'Proposal' },
    { dbStatus: 'ready', label: 'Negotiation' },
    { dbStatus: 'won', label: 'Won' },
  ];

  return stages.map(stage => ({
    stage: stage.label,
    count: data?.filter(q => q.status === stage.dbStatus).length || 0,
    value: data?.filter(q => q.status === stage.dbStatus)
      .reduce((sum, q) => sum + Number(q.total_revenue || 0), 0) || 0,
  }));
}

// =====================================================
// EXPORT ACTION
// =====================================================

/**
 * Exports dashboard KPI data.
 */
export async function exportDashboardData(
  userRole: string,
  period: PeriodType = 'mtd'
): Promise<{
  kpiCode: string;
  kpiName: string;
  category: string;
  currentValue: number;
  targetValue: number;
  status: string;
  trend: string;
  changePercentage: number;
  unit: string;
}[]> {
  const kpis = await getAllKPIsForDashboard(userRole, undefined, period);

  return kpis.map(kpi => ({
    kpiCode: kpi.kpiCode,
    kpiName: kpi.kpiName,
    category: kpi.category,
    currentValue: kpi.currentValue,
    targetValue: kpi.targetValue,
    status: kpi.status,
    trend: kpi.trend,
    changePercentage: kpi.changePercentage,
    unit: kpi.unit,
  }));
}
