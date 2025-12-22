// =====================================================
// v0.43: EQUIPMENT - UTILIZATION TRACKING UTILITIES
// =====================================================

import {
  AssignmentType,
  DailyLogStatus,
  UtilizationCategory,
  AvailabilityStatus,
  UtilizationSummary,
  UtilizationDashboardStats,
  ValidationResult,
} from '@/types/utilization';

// Valid status values for daily logs
export const DAILY_LOG_STATUSES: { value: DailyLogStatus; label: string }[] = [
  { value: 'operating', label: 'Operating' },
  { value: 'idle', label: 'Idle' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'standby', label: 'Standby' },
];

// Assignment type options
export const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: 'job_order', label: 'Job Order' },
  { value: 'project', label: 'Project' },
  { value: 'employee', label: 'Employee' },
  { value: 'location', label: 'Location' },
];

// Valid values arrays for validation
const VALID_DAILY_LOG_STATUSES: DailyLogStatus[] = ['operating', 'idle', 'maintenance', 'repair', 'standby'];
const VALID_ASSIGNMENT_TYPES: AssignmentType[] = ['job_order', 'project', 'employee', 'location'];

/**
 * Validate daily log status
 */
export function isValidDailyLogStatus(status: string): status is DailyLogStatus {
  return VALID_DAILY_LOG_STATUSES.includes(status as DailyLogStatus);
}

/**
 * Validate assignment type
 */
export function isValidAssignmentType(type: string): type is AssignmentType {
  return VALID_ASSIGNMENT_TYPES.includes(type as AssignmentType);
}

/**
 * Get daily log status label
 */
export function getDailyLogStatusLabel(status: DailyLogStatus): string {
  return DAILY_LOG_STATUSES.find((s) => s.value === status)?.label || status;
}

/**
 * Get assignment type label
 */
export function getAssignmentTypeLabel(type: AssignmentType): string {
  return ASSIGNMENT_TYPES.find((t) => t.value === type)?.label || type;
}


/**
 * Calculate utilization category based on rate
 * High: >= 75%, Normal: 50-74%, Low: 25-49%, Very Low: < 25%
 */
export function getUtilizationCategory(rate: number): UtilizationCategory {
  if (rate >= 75) return 'high';
  if (rate >= 50) return 'normal';
  if (rate >= 25) return 'low';
  return 'very_low';
}

/**
 * Get utilization category label with emoji
 */
export function getUtilizationCategoryLabel(category: UtilizationCategory): string {
  const labels: Record<UtilizationCategory, string> = {
    high: 'High ✅',
    normal: 'Normal',
    low: 'Low ⚠️',
    very_low: 'Very Low 🔴',
  };
  return labels[category];
}

/**
 * Get utilization category badge variant
 */
export function getUtilizationCategoryBadgeVariant(
  category: UtilizationCategory
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (category) {
    case 'high':
      return 'default';
    case 'normal':
      return 'secondary';
    case 'low':
      return 'outline';
    case 'very_low':
      return 'destructive';
  }
}

/**
 * Calculate km used from start and end readings
 * Returns undefined if readings are invalid or missing
 */
export function calculateKmUsed(startKm?: number, endKm?: number): number | undefined {
  if (startKm === undefined || endKm === undefined) return undefined;
  if (endKm < startKm) return undefined; // Invalid reading
  return endKm - startKm;
}

/**
 * Calculate hours used from start and end readings
 * Returns undefined if readings are invalid or missing
 */
export function calculateHoursUsed(startHours?: number, endHours?: number): number | undefined {
  if (startHours === undefined || endHours === undefined) return undefined;
  if (endHours < startHours) return undefined; // Invalid reading
  return Math.round((endHours - startHours) * 100) / 100;
}

/**
 * Calculate fuel efficiency (km per liter)
 * Returns undefined if values are invalid
 */
export function calculateFuelEfficiency(totalKm: number, totalFuelLiters: number): number | undefined {
  if (totalFuelLiters <= 0 || totalKm <= 0) return undefined;
  return Math.round((totalKm / totalFuelLiters) * 100) / 100;
}

/**
 * Calculate utilization rate as percentage
 * Returns 0 if no days logged
 */
export function calculateUtilizationRate(operatingDays: number, totalDays: number): number {
  if (totalDays <= 0) return 0;
  return Math.round((operatingDays / totalDays) * 1000) / 10; // One decimal place
}


/**
 * Derive availability status from asset state
 */
export function deriveAvailabilityStatus(
  assetStatus: string,
  hasOpenAssignment: boolean
): AvailabilityStatus {
  if (assetStatus !== 'active') return 'unavailable';
  if (hasOpenAssignment) return 'assigned';
  return 'available';
}

/**
 * Validate assignment can be created
 */
export function validateAssignment(
  assetStatus: string,
  hasOpenAssignment: boolean
): ValidationResult {
  if (assetStatus !== 'active') {
    return { valid: false, error: 'Asset is not active and cannot be assigned' };
  }
  if (hasOpenAssignment) {
    return { valid: false, error: 'Asset already has an open assignment' };
  }
  return { valid: true };
}

/**
 * Get availability badge variant
 */
export function getAvailabilityBadgeVariant(
  status: AvailabilityStatus
): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'available':
      return 'default';
    case 'assigned':
      return 'secondary';
    case 'unavailable':
      return 'destructive';
  }
}

/**
 * Get availability status label
 */
export function getAvailabilityStatusLabel(status: AvailabilityStatus): string {
  const labels: Record<AvailabilityStatus, string> = {
    available: 'Available',
    assigned: 'Assigned',
    unavailable: 'Unavailable',
  };
  return labels[status];
}

/**
 * Calculate dashboard stats from utilization summaries
 */
export function calculateDashboardStats(
  summaries: UtilizationSummary[]
): UtilizationDashboardStats {
  if (summaries.length === 0) {
    return {
      averageUtilizationRate: 0,
      operatingCount: 0,
      idleCount: 0,
      maintenanceCount: 0,
      totalAssets: 0,
    };
  }

  const totalRate = summaries.reduce((sum, s) => sum + s.utilizationRate, 0);

  return {
    averageUtilizationRate: Math.round((totalRate / summaries.length) * 10) / 10,
    operatingCount: summaries.filter((s) => s.utilizationRate >= 50).length,
    idleCount: summaries.filter((s) => s.utilizationRate < 25).length,
    maintenanceCount: summaries.filter((s) => s.maintenanceDays > 0).length,
    totalAssets: summaries.length,
  };
}


/**
 * Format utilization rate for display
 */
export function formatUtilizationRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

/**
 * Format km for display
 */
export function formatKm(km: number): string {
  return new Intl.NumberFormat('id-ID').format(km) + ' km';
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(hours) + ' hrs';
}

/**
 * Format fuel liters for display
 */
export function formatFuelLiters(liters: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(liters) + ' L';
}

/**
 * Format fuel efficiency for display
 */
export function formatFuelEfficiency(kmPerLiter: number | undefined): string {
  if (kmPerLiter === undefined) return '-';
  return `${kmPerLiter.toFixed(2)} km/L`;
}

/**
 * Get month string from date (YYYY-MM-01 format)
 */
export function getMonthString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Get display month from month string
 */
export function formatMonthDisplay(monthString: string): string {
  const date = new Date(monthString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Get last N months as month strings
 */
export function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < n; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(getMonthString(date));
  }
  
  return months.reverse();
}

/**
 * Validate meter readings (end should be >= start)
 */
export function validateMeterReadings(
  startKm?: number,
  endKm?: number,
  startHours?: number,
  endHours?: number
): ValidationResult {
  if (startKm !== undefined && endKm !== undefined && endKm < startKm) {
    return { valid: false, error: 'End odometer cannot be less than start odometer' };
  }
  if (startHours !== undefined && endHours !== undefined && endHours < startHours) {
    return { valid: false, error: 'End hour meter cannot be less than start hour meter' };
  }
  return { valid: true };
}

/**
 * Get status badge variant for daily log status
 */
export function getDailyLogStatusBadgeVariant(
  status: DailyLogStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'operating':
      return 'default';
    case 'idle':
      return 'outline';
    case 'maintenance':
      return 'secondary';
    case 'repair':
      return 'destructive';
    case 'standby':
      return 'outline';
  }
}
