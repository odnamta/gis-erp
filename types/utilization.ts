// =====================================================
// v0.43: EQUIPMENT - UTILIZATION TRACKING TYPES
// =====================================================

import { Asset } from './assets';

// Assignment type options
export type AssignmentType = 'job_order' | 'project' | 'employee' | 'location';

// Daily log status options
export type DailyLogStatus = 'operating' | 'idle' | 'maintenance' | 'repair' | 'standby';

// Utilization category based on rate
export type UtilizationCategory = 'high' | 'normal' | 'low' | 'very_low';

// Availability status
export type AvailabilityStatus = 'available' | 'assigned' | 'unavailable';

// Asset Assignment interface
export interface AssetAssignment {
  id: string;
  assetId: string;
  assignmentType: AssignmentType;
  jobOrderId?: string;
  projectId?: string;
  employeeId?: string;
  locationId?: string;
  assignedFrom: string;
  assignedTo?: string;
  startKm?: number;
  endKm?: number;
  startHours?: number;
  endHours?: number;
  kmUsed?: number;
  hoursUsed?: number;
  notes?: string;
  assignedBy?: string;
  createdAt: string;
  // Joined fields
  asset?: Asset;
  jobOrder?: { jo_number: string; customer_name?: string };
}

// Database row format for AssetAssignment
export interface AssetAssignmentRow {
  id: string;
  asset_id: string;
  assignment_type: AssignmentType;
  job_order_id: string | null;
  project_id: string | null;
  employee_id: string | null;
  location_id: string | null;
  assigned_from: string;
  assigned_to: string | null;
  start_km: number | null;
  end_km: number | null;
  start_hours: number | null;
  end_hours: number | null;
  km_used: number | null;
  hours_used: number | null;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
}


// Current assignment view row (with joined fields)
export interface CurrentAssignmentRow extends AssetAssignmentRow {
  asset_code: string;
  asset_name: string;
  registration_number: string | null;
  jo_number: string | null;
  customer_name: string | null;
}

// Daily Log interface
export interface AssetDailyLog {
  id: string;
  assetId: string;
  logDate: string;
  status: DailyLogStatus;
  jobOrderId?: string;
  startKm?: number;
  endKm?: number;
  kmToday?: number;
  startHours?: number;
  endHours?: number;
  hoursToday?: number;
  fuelLiters?: number;
  fuelCost?: number;
  operatorEmployeeId?: string;
  operatorName?: string;
  notes?: string;
  loggedBy?: string;
  createdAt: string;
}

// Database row format for AssetDailyLog
export interface AssetDailyLogRow {
  id: string;
  asset_id: string;
  log_date: string;
  status: DailyLogStatus;
  job_order_id: string | null;
  start_km: number | null;
  end_km: number | null;
  km_today: number | null;
  start_hours: number | null;
  end_hours: number | null;
  hours_today: number | null;
  fuel_liters: number | null;
  fuel_cost: number | null;
  operator_employee_id: string | null;
  operator_name: string | null;
  notes: string | null;
  logged_by: string | null;
  created_at: string;
}

// Monthly Utilization Summary
export interface UtilizationSummary {
  assetId: string;
  assetCode: string;
  assetName: string;
  month: string;
  operatingDays: number;
  idleDays: number;
  maintenanceDays: number;
  repairDays: number;
  standbyDays: number;
  totalLoggedDays: number;
  utilizationRate: number;
  totalKm: number;
  totalHours: number;
  totalFuelLiters: number;
  totalFuelCost: number;
  kmPerLiter?: number;
}

// Database row format for UtilizationSummary
export interface UtilizationSummaryRow {
  asset_id: string;
  asset_code: string;
  asset_name: string;
  month: string;
  operating_days: number;
  idle_days: number;
  maintenance_days: number;
  repair_days: number;
  standby_days: number;
  total_logged_days: number;
  utilization_rate: number;
  total_km: number;
  total_hours: number;
  total_fuel_liters: number;
  total_fuel_cost: number;
  km_per_liter: number | null;
}


// Asset Availability
export interface AssetAvailability {
  id: string;
  assetCode: string;
  assetName: string;
  registrationNumber?: string;
  status: string;
  capacityTons?: number;
  categoryId: string;
  categoryName: string;
  currentLocation?: string;
  availabilityStatus: AvailabilityStatus;
  currentJob?: string;
}

// Database row format for AssetAvailability
export interface AssetAvailabilityRow {
  id: string;
  asset_code: string;
  asset_name: string;
  registration_number: string | null;
  status: string;
  capacity_tons: number | null;
  category_id: string;
  category_name: string;
  current_location: string | null;
  availability_status: AvailabilityStatus;
  current_job: string | null;
}

// Dashboard Stats
export interface UtilizationDashboardStats {
  averageUtilizationRate: number;
  operatingCount: number;
  idleCount: number;
  maintenanceCount: number;
  totalAssets: number;
}

// Form inputs
export interface AssignmentInput {
  assetId: string;
  assignmentType: AssignmentType;
  jobOrderId?: string;
  projectId?: string;
  employeeId?: string;
  locationId?: string;
  assignedFrom: string;
  assignedTo?: string;
  startKm?: number;
  startHours?: number;
  notes?: string;
}

export interface DailyLogInput {
  assetId: string;
  logDate: string;
  status: DailyLogStatus;
  jobOrderId?: string;
  startKm?: number;
  endKm?: number;
  startHours?: number;
  endHours?: number;
  fuelLiters?: number;
  fuelCost?: number;
  operatorEmployeeId?: string;
  operatorName?: string;
  notes?: string;
}

export interface CompleteAssignmentInput {
  assignmentId: string;
  endKm?: number;
  endHours?: number;
}

// Filter state
export interface UtilizationFilterState {
  month: string; // YYYY-MM format
  categoryId?: string;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  error?: string;
}


// Transform functions: Row to Interface
export function transformAssignmentRow(row: AssetAssignmentRow): AssetAssignment {
  return {
    id: row.id,
    assetId: row.asset_id,
    assignmentType: row.assignment_type,
    jobOrderId: row.job_order_id ?? undefined,
    projectId: row.project_id ?? undefined,
    employeeId: row.employee_id ?? undefined,
    locationId: row.location_id ?? undefined,
    assignedFrom: row.assigned_from,
    assignedTo: row.assigned_to ?? undefined,
    startKm: row.start_km ?? undefined,
    endKm: row.end_km ?? undefined,
    startHours: row.start_hours ?? undefined,
    endHours: row.end_hours ?? undefined,
    kmUsed: row.km_used ?? undefined,
    hoursUsed: row.hours_used ?? undefined,
    notes: row.notes ?? undefined,
    assignedBy: row.assigned_by ?? undefined,
    createdAt: row.created_at,
  };
}

export function transformCurrentAssignmentRow(row: CurrentAssignmentRow): AssetAssignment {
  return {
    ...transformAssignmentRow(row),
    jobOrder: row.jo_number ? {
      jo_number: row.jo_number,
      customer_name: row.customer_name ?? undefined,
    } : undefined,
  };
}

export function transformDailyLogRow(row: AssetDailyLogRow): AssetDailyLog {
  return {
    id: row.id,
    assetId: row.asset_id,
    logDate: row.log_date,
    status: row.status,
    jobOrderId: row.job_order_id ?? undefined,
    startKm: row.start_km ?? undefined,
    endKm: row.end_km ?? undefined,
    kmToday: row.km_today ?? undefined,
    startHours: row.start_hours ?? undefined,
    endHours: row.end_hours ?? undefined,
    hoursToday: row.hours_today ?? undefined,
    fuelLiters: row.fuel_liters ?? undefined,
    fuelCost: row.fuel_cost ?? undefined,
    operatorEmployeeId: row.operator_employee_id ?? undefined,
    operatorName: row.operator_name ?? undefined,
    notes: row.notes ?? undefined,
    loggedBy: row.logged_by ?? undefined,
    createdAt: row.created_at,
  };
}

export function transformUtilizationSummaryRow(row: UtilizationSummaryRow): UtilizationSummary {
  return {
    assetId: row.asset_id,
    assetCode: row.asset_code,
    assetName: row.asset_name,
    month: row.month,
    operatingDays: row.operating_days,
    idleDays: row.idle_days,
    maintenanceDays: row.maintenance_days,
    repairDays: row.repair_days,
    standbyDays: row.standby_days,
    totalLoggedDays: row.total_logged_days,
    utilizationRate: row.utilization_rate,
    totalKm: row.total_km,
    totalHours: row.total_hours,
    totalFuelLiters: row.total_fuel_liters,
    totalFuelCost: row.total_fuel_cost,
    kmPerLiter: row.km_per_liter ?? undefined,
  };
}

export function transformAvailabilityRow(row: AssetAvailabilityRow): AssetAvailability {
  return {
    id: row.id,
    assetCode: row.asset_code,
    assetName: row.asset_name,
    registrationNumber: row.registration_number ?? undefined,
    status: row.status,
    capacityTons: row.capacity_tons ?? undefined,
    categoryId: row.category_id,
    categoryName: row.category_name,
    currentLocation: row.current_location ?? undefined,
    availabilityStatus: row.availability_status,
    currentJob: row.current_job ?? undefined,
  };
}
