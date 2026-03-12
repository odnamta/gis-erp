// =====================================================
// v0.70: KPI SNAPSHOT UTILITY FUNCTIONS
// =====================================================

import {
  KPISnapshot,
  RevenueMetrics,
  OperationalMetrics,
  FinancialMetrics,
  KPITrend,
  TrendDirection,
  CreateKPISnapshotInput,
  KPISnapshotFilters,
  DateRange,
} from '@/types/kpi-snapshot';

// =====================================================
// DATE UTILITIES
// =====================================================

/**
 * Gets the ISO week number for a given date.
 * @param date - The date to get the week number for
 * @returns The ISO week number (1-53)
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Gets the date range for a specific week.
 * @param weekNumber - The week number (1-53)
 * @param year - The year
 * @returns Start and end dates for the week
 */
export function getWeekDateRange(weekNumber: number, year: number): DateRange {
  // Find the first Thursday of the year (ISO week 1 contains the first Thursday)
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  // Calculate the start of the requested week
  const startDate = new Date(firstMonday);
  startDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  startDate.setHours(0, 0, 0, 0);

  // End date is 6 days after start (Sunday)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * Gets the previous week's number and year.
 * @param weekNumber - Current week number
 * @param year - Current year
 * @returns Previous week number and year
 */
export function getPreviousWeek(weekNumber: number, year: number): { weekNumber: number; year: number } {
  if (weekNumber > 1) {
    return { weekNumber: weekNumber - 1, year };
  }
  // Week 1 of current year -> last week of previous year
  return { weekNumber: 52, year: year - 1 };
}

// =====================================================
// REVENUE METRICS CALCULATION
// =====================================================

/**
 * Calculates revenue metrics for a date range.
 * @param jobOrders - Array of job orders with revenue data
 * @param startDate - Start of the period
 * @param endDate - End of the period
 * @returns Revenue metrics for the period
 */
export function calculateRevenueMetrics(
  jobOrders: Array<{
    id: string;
    final_revenue?: number | null;
    completed_at?: string | null;
    status: string;
    customer_name?: string;
    service_type?: string;
  }>,
  startDate: Date,
  endDate: Date
): RevenueMetrics {
  const completedStatuses = ['completed', 'submitted_to_finance', 'invoiced', 'closed'];
  
  // Filter JOs completed within the date range
  const periodJOs = jobOrders.filter((jo) => {
    if (!completedStatuses.includes(jo.status) || !jo.completed_at) {
      return false;
    }
    const completedDate = new Date(jo.completed_at);
    return completedDate >= startDate && completedDate <= endDate;
  });

  // Calculate total revenue
  const total_revenue = periodJOs.reduce(
    (sum, jo) => sum + (jo.final_revenue ?? 0),
    0
  );

  // Group by customer
  const revenue_by_customer: Record<string, number> = {};
  for (const jo of periodJOs) {
    const customerKey = jo.customer_name || 'Unknown';
    revenue_by_customer[customerKey] = (revenue_by_customer[customerKey] || 0) + (jo.final_revenue ?? 0);
  }

  // Group by service type
  const revenue_by_service: Record<string, number> = {};
  for (const jo of periodJOs) {
    const serviceKey = jo.service_type || 'General';
    revenue_by_service[serviceKey] = (revenue_by_service[serviceKey] || 0) + (jo.final_revenue ?? 0);
  }

  return {
    total_revenue,
    revenue_by_customer,
    revenue_by_service,
  };
}

// =====================================================
// OPERATIONAL METRICS CALCULATION
// =====================================================

/**
 * Calculates operational metrics for a date range.
 * @param jobOrders - Array of job orders with operational data
 * @param startDate - Start of the period
 * @param endDate - End of the period
 * @returns Operational metrics for the period
 */
export function calculateOperationalMetrics(
  jobOrders: Array<{
    id: string;
    status: string;
    created_at: string;
    completed_at?: string | null;
    target_completion_date?: string | null;
  }>,
  startDate: Date,
  endDate: Date
): OperationalMetrics {
  const completedStatuses = ['completed', 'submitted_to_finance', 'invoiced', 'closed'];
  
  // Filter JOs completed within the date range
  const completedJOs = jobOrders.filter((jo) => {
    if (!completedStatuses.includes(jo.status) || !jo.completed_at) {
      return false;
    }
    const completedDate = new Date(jo.completed_at);
    return completedDate >= startDate && completedDate <= endDate;
  });

  const jobs_completed = completedJOs.length;

  // Calculate on-time delivery rate
  let onTimeCount = 0;
  let totalWithTarget = 0;
  
  for (const jo of completedJOs) {
    if (jo.target_completion_date && jo.completed_at) {
      totalWithTarget++;
      const targetDate = new Date(jo.target_completion_date);
      const completedDate = new Date(jo.completed_at);
      if (completedDate <= targetDate) {
        onTimeCount++;
      }
    }
  }
  
  const on_time_delivery_rate = totalWithTarget > 0 
    ? (onTimeCount / totalWithTarget) * 100 
    : 0;

  // Calculate average job duration
  let totalDuration = 0;
  let durationCount = 0;
  
  for (const jo of completedJOs) {
    if (jo.completed_at && jo.created_at) {
      const createdDate = new Date(jo.created_at);
      const completedDate = new Date(jo.completed_at);
      const durationMs = completedDate.getTime() - createdDate.getTime();
      const durationDays = durationMs / (1000 * 60 * 60 * 24);
      totalDuration += durationDays;
      durationCount++;
    }
  }
  
  const average_job_duration_days = durationCount > 0 
    ? totalDuration / durationCount 
    : 0;

  return {
    jobs_completed,
    on_time_delivery_rate: Math.round(on_time_delivery_rate * 100) / 100,
    average_job_duration_days: Math.round(average_job_duration_days * 100) / 100,
  };
}

// =====================================================
// FINANCIAL METRICS CALCULATION
// =====================================================

/**
 * Calculates financial metrics (AR aging and collection rate).
 * @param invoices - Array of invoices with financial data
 * @param currentDate - Reference date for calculations
 * @returns Financial metrics
 */
export function calculateFinancialMetrics(
  invoices: Array<{
    id: string;
    status: string;
    total_amount: number;
    due_date: string;
    paid_at?: string | null;
    created_at: string;
  }>,
  currentDate: Date = new Date()
): FinancialMetrics {
  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0);

  // Filter outstanding invoices (sent, overdue, partial)
  const outstandingStatuses = ['sent', 'overdue', 'partial'];
  const outstandingInvoices = invoices.filter(
    (inv) => outstandingStatuses.includes(inv.status)
  );

  // Calculate AR aging buckets
  let ar_aging_current = 0;
  let ar_aging_30_days = 0;
  let ar_aging_60_days = 0;
  let ar_aging_90_plus = 0;

  for (const inv of outstandingInvoices) {
    const dueDate = new Date(inv.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = current.getTime() - dueDate.getTime();
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (daysOverdue <= 0) {
      ar_aging_current += inv.total_amount;
    } else if (daysOverdue <= 30) {
      ar_aging_30_days += inv.total_amount;
    } else if (daysOverdue <= 60) {
      ar_aging_60_days += inv.total_amount;
    } else {
      ar_aging_90_plus += inv.total_amount;
    }
  }

  // Calculate collection rate (paid invoices / total invoices in last 90 days)
  const ninetyDaysAgo = new Date(current);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentInvoices = invoices.filter((inv) => {
    const createdDate = new Date(inv.created_at);
    return createdDate >= ninetyDaysAgo && createdDate <= current;
  });

  const paidInvoices = recentInvoices.filter((inv) => inv.status === 'paid');
  
  const collection_rate = recentInvoices.length > 0
    ? (paidInvoices.length / recentInvoices.length) * 100
    : 0;

  return {
    ar_aging_current: Math.round(ar_aging_current * 100) / 100,
    ar_aging_30_days: Math.round(ar_aging_30_days * 100) / 100,
    ar_aging_60_days: Math.round(ar_aging_60_days * 100) / 100,
    ar_aging_90_plus: Math.round(ar_aging_90_plus * 100) / 100,
    collection_rate: Math.round(collection_rate * 100) / 100,
  };
}

// =====================================================
// SNAPSHOT CAPTURE AND STORAGE
// =====================================================

/**
 * Creates a KPI snapshot input object for a specific week.
 * @param weekNumber - The week number
 * @param year - The year
 * @param revenueMetrics - Revenue metrics for the week
 * @param operationalMetrics - Operational metrics for the week
 * @param financialMetrics - Financial metrics snapshot
 * @returns KPI snapshot input ready for storage
 */
export function createKPISnapshotInput(
  weekNumber: number,
  year: number,
  revenueMetrics: RevenueMetrics,
  operationalMetrics: OperationalMetrics,
  financialMetrics: FinancialMetrics
): CreateKPISnapshotInput {
  const { endDate } = getWeekDateRange(weekNumber, year);
  
  return {
    week_number: weekNumber,
    year,
    snapshot_date: endDate.toISOString().split('T')[0],
    revenue_metrics: revenueMetrics,
    operational_metrics: operationalMetrics,
    financial_metrics: financialMetrics,
  };
}

/**
 * Validates that a KPI snapshot has all required fields.
 * @param snapshot - The snapshot to validate
 * @returns True if the snapshot is complete
 */
export function isKPISnapshotComplete(snapshot: KPISnapshot): boolean {
  // Check required top-level fields
  if (!snapshot.id || !snapshot.week_number || !snapshot.year || !snapshot.snapshot_date) {
    return false;
  }

  // Check revenue metrics
  if (!snapshot.revenue_metrics || typeof snapshot.revenue_metrics.total_revenue !== 'number') {
    return false;
  }

  // Check operational metrics
  if (!snapshot.operational_metrics ||
      typeof snapshot.operational_metrics.jobs_completed !== 'number' ||
      typeof snapshot.operational_metrics.on_time_delivery_rate !== 'number') {
    return false;
  }

  // Check financial metrics
  if (!snapshot.financial_metrics ||
      typeof snapshot.financial_metrics.ar_aging_current !== 'number' ||
      typeof snapshot.financial_metrics.ar_aging_30_days !== 'number' ||
      typeof snapshot.financial_metrics.ar_aging_60_days !== 'number' ||
      typeof snapshot.financial_metrics.ar_aging_90_plus !== 'number' ||
      typeof snapshot.financial_metrics.collection_rate !== 'number') {
    return false;
  }

  return true;
}

/**
 * Filters KPI snapshots based on criteria.
 * @param snapshots - Array of snapshots to filter
 * @param filters - Filter criteria
 * @returns Filtered array of snapshots
 */
export function filterKPISnapshots(
  snapshots: KPISnapshot[],
  filters: KPISnapshotFilters
): KPISnapshot[] {
  let result = [...snapshots];

  if (filters.year !== undefined) {
    result = result.filter((s) => s.year === filters.year);
  }

  if (filters.startWeek !== undefined) {
    result = result.filter((s) => s.week_number >= filters.startWeek!);
  }

  if (filters.endWeek !== undefined) {
    result = result.filter((s) => s.week_number <= filters.endWeek!);
  }

  // Sort by year and week descending (most recent first)
  result.sort((a, b) => {
    if (a.year !== b.year) {
      return b.year - a.year;
    }
    return b.week_number - a.week_number;
  });

  // Apply limit
  if (filters.limit !== undefined && filters.limit > 0) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

/**
 * Gets the most recent N weeks of snapshots.
 * @param snapshots - Array of all snapshots
 * @param weeks - Number of weeks to retrieve
 * @returns Array of snapshots for the most recent weeks
 */
export function getRecentSnapshots(
  snapshots: KPISnapshot[],
  weeks: number
): KPISnapshot[] {
  return filterKPISnapshots(snapshots, { limit: weeks });
}

// =====================================================
// TREND CALCULATION
// =====================================================

/**
 * Determines the trend direction based on change percentage.
 * @param changePercent - The percentage change
 * @returns Trend direction
 */
export function determineTrendDirection(changePercent: number): TrendDirection {
  if (changePercent > 0) return 'up';
  if (changePercent < 0) return 'down';
  return 'stable';
}

/**
 * Calculates the percentage change between two values.
 * @param currentValue - Current value
 * @param previousValue - Previous value
 * @returns Percentage change (0 if previous is 0)
 */
export function calculateChangePercent(currentValue: number, previousValue: number): number {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
}

/**
 * Creates a KPI trend object.
 * @param metricName - Name of the metric
 * @param currentValue - Current value
 * @param previousValue - Previous value
 * @returns KPI trend object
 */
export function createKPITrend(
  metricName: string,
  currentValue: number,
  previousValue: number
): KPITrend {
  const rawChangePercent = calculateChangePercent(currentValue, previousValue);
  const roundedChangePercent = Math.round(rawChangePercent * 100) / 100;
  return {
    metric_name: metricName,
    current_value: currentValue,
    previous_value: previousValue,
    change_percent: roundedChangePercent,
    trend: determineTrendDirection(roundedChangePercent),
  };
}

/**
 * Calculates week-over-week trends for all KPI metrics.
 * @param current - Current week's snapshot
 * @param previous - Previous week's snapshot
 * @returns Array of KPI trends
 */
export function calculateWeekOverWeekTrends(
  current: KPISnapshot,
  previous: KPISnapshot
): KPITrend[] {
  const trends: KPITrend[] = [];

  // Revenue metrics
  trends.push(createKPITrend(
    'total_revenue',
    current.revenue_metrics.total_revenue,
    previous.revenue_metrics.total_revenue
  ));

  // Operational metrics
  trends.push(createKPITrend(
    'jobs_completed',
    current.operational_metrics.jobs_completed,
    previous.operational_metrics.jobs_completed
  ));

  trends.push(createKPITrend(
    'on_time_delivery_rate',
    current.operational_metrics.on_time_delivery_rate,
    previous.operational_metrics.on_time_delivery_rate
  ));

  trends.push(createKPITrend(
    'average_job_duration_days',
    current.operational_metrics.average_job_duration_days,
    previous.operational_metrics.average_job_duration_days
  ));

  // Financial metrics
  trends.push(createKPITrend(
    'ar_aging_current',
    current.financial_metrics.ar_aging_current,
    previous.financial_metrics.ar_aging_current
  ));

  trends.push(createKPITrend(
    'ar_aging_30_days',
    current.financial_metrics.ar_aging_30_days,
    previous.financial_metrics.ar_aging_30_days
  ));

  trends.push(createKPITrend(
    'ar_aging_60_days',
    current.financial_metrics.ar_aging_60_days,
    previous.financial_metrics.ar_aging_60_days
  ));

  trends.push(createKPITrend(
    'ar_aging_90_plus',
    current.financial_metrics.ar_aging_90_plus,
    previous.financial_metrics.ar_aging_90_plus
  ));

  trends.push(createKPITrend(
    'collection_rate',
    current.financial_metrics.collection_rate,
    previous.financial_metrics.collection_rate
  ));

  return trends;
}

// =====================================================
// VALIDATION UTILITIES
// =====================================================

/**
 * Validates week number is within valid range.
 * @param weekNumber - Week number to validate
 * @returns True if valid (1-53)
 */
export function isValidWeekNumber(weekNumber: number): boolean {
  return Number.isInteger(weekNumber) && weekNumber >= 1 && weekNumber <= 53;
}

/**
 * Validates year is reasonable.
 * @param year - Year to validate
 * @returns True if valid (2000-2100)
 */
export function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= 2000 && year <= 2100;
}

/**
 * Validates revenue metrics structure.
 * @param metrics - Metrics to validate
 * @returns True if valid
 */
export function isValidRevenueMetrics(metrics: RevenueMetrics): boolean {
  return (
    typeof metrics.total_revenue === 'number' &&
    metrics.total_revenue >= 0 &&
    typeof metrics.revenue_by_customer === 'object' &&
    typeof metrics.revenue_by_service === 'object'
  );
}

/**
 * Validates operational metrics structure.
 * @param metrics - Metrics to validate
 * @returns True if valid
 */
export function isValidOperationalMetrics(metrics: OperationalMetrics): boolean {
  return (
    typeof metrics.jobs_completed === 'number' &&
    metrics.jobs_completed >= 0 &&
    typeof metrics.on_time_delivery_rate === 'number' &&
    metrics.on_time_delivery_rate >= 0 &&
    metrics.on_time_delivery_rate <= 100 &&
    typeof metrics.average_job_duration_days === 'number' &&
    metrics.average_job_duration_days >= 0
  );
}

/**
 * Validates financial metrics structure.
 * @param metrics - Metrics to validate
 * @returns True if valid
 */
export function isValidFinancialMetrics(metrics: FinancialMetrics): boolean {
  return (
    typeof metrics.ar_aging_current === 'number' &&
    metrics.ar_aging_current >= 0 &&
    typeof metrics.ar_aging_30_days === 'number' &&
    metrics.ar_aging_30_days >= 0 &&
    typeof metrics.ar_aging_60_days === 'number' &&
    metrics.ar_aging_60_days >= 0 &&
    typeof metrics.ar_aging_90_plus === 'number' &&
    metrics.ar_aging_90_plus >= 0 &&
    typeof metrics.collection_rate === 'number' &&
    metrics.collection_rate >= 0 &&
    metrics.collection_rate <= 100
  );
}
