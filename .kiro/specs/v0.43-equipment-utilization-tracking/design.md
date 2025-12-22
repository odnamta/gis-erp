# Design Document: Equipment Utilization Tracking

## Overview

This document describes the technical design for the Equipment Utilization Tracking feature (v0.43) in Gama ERP. The feature enables comprehensive tracking of equipment utilization through job assignments, daily usage logs, and aggregated reporting to optimize fleet productivity.

The system builds on the existing Equipment Asset Registry (v0.41) and Maintenance Tracking (v0.42) modules, adding utilization-specific tables, views, and UI components.

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Gama ERP Application                         │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  Utilization    │  │  Assignment     │  │  Daily Log      │     │
│  │  Dashboard      │  │  Management     │  │  Entry          │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           └────────────────────┼────────────────────┘               │
│                                │                                    │
│                    ┌───────────▼───────────┐                       │
│                    │  Utilization Utils    │                       │
│                    │  (lib/utilization-    │                       │
│                    │   utils.ts)           │                       │
│                    └───────────┬───────────┘                       │
│                                │                                    │
│                    ┌───────────▼───────────┐                       │
│                    │  Supabase Client      │                       │
│                    └───────────┬───────────┘                       │
└────────────────────────────────┼────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      Supabase DB        │
                    │  ┌──────────────────┐   │
                    │  │ asset_assignments│   │
                    │  │ asset_daily_logs │   │
                    │  │ asset_utilization│   │
                    │  │ _monthly (view)  │   │
                    │  └──────────────────┘   │
                    └─────────────────────────┘
```

### Component Architecture

```
app/(main)/equipment/
├── utilization/
│   └── page.tsx                    # Utilization dashboard
├── [id]/
│   ├── assign/
│   │   └── page.tsx                # Asset assignment form
│   └── logs/
│       └── page.tsx                # Daily logs for asset

components/utilization/
├── index.ts                        # Barrel export
├── utilization-dashboard.tsx       # Main dashboard component
├── utilization-summary-cards.tsx   # KPI summary cards
├── utilization-table.tsx           # Asset utilization table
├── utilization-chart.tsx           # Trend chart component
├── assignment-form.tsx             # Asset assignment form
├── assignment-list.tsx             # Current assignments list
├── daily-log-form.tsx              # Daily log entry form
├── daily-log-table.tsx             # Daily logs table
└── availability-list.tsx           # Available assets list

lib/
├── utilization-utils.ts            # Utility functions
└── utilization-actions.ts          # Server actions

types/
└── utilization.ts                  # TypeScript types
```

## Components and Interfaces

### TypeScript Types

```typescript
// types/utilization.ts

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
}

// Database row format
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

// Database row format
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

// Asset Availability
export interface AssetAvailability {
  id: string;
  assetCode: string;
  assetName: string;
  registrationNumber?: string;
  status: string;
  capacityTons?: number;
  categoryName: string;
  currentLocation?: string;
  availabilityStatus: AvailabilityStatus;
  currentJob?: string;
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
```

### Utility Functions

```typescript
// lib/utilization-utils.ts

// Valid status values
export const DAILY_LOG_STATUSES: { value: DailyLogStatus; label: string }[] = [
  { value: 'operating', label: 'Operating' },
  { value: 'idle', label: 'Idle' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'standby', label: 'Standby' },
];

export const ASSIGNMENT_TYPES: { value: AssignmentType; label: string }[] = [
  { value: 'job_order', label: 'Job Order' },
  { value: 'project', label: 'Project' },
  { value: 'employee', label: 'Employee' },
  { value: 'location', label: 'Location' },
];

/**
 * Calculate utilization category based on rate
 */
export function getUtilizationCategory(rate: number): UtilizationCategory {
  if (rate >= 75) return 'high';
  if (rate >= 50) return 'normal';
  if (rate >= 25) return 'low';
  return 'very_low';
}

/**
 * Get utilization category label
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
 * Calculate km used from start and end readings
 */
export function calculateKmUsed(startKm?: number, endKm?: number): number | undefined {
  if (startKm === undefined || endKm === undefined) return undefined;
  if (endKm < startKm) return undefined; // Invalid reading
  return endKm - startKm;
}

/**
 * Calculate hours used from start and end readings
 */
export function calculateHoursUsed(startHours?: number, endHours?: number): number | undefined {
  if (startHours === undefined || endHours === undefined) return undefined;
  if (endHours < startHours) return undefined; // Invalid reading
  return endHours - startHours;
}

/**
 * Calculate fuel efficiency (km per liter)
 */
export function calculateFuelEfficiency(totalKm: number, totalFuelLiters: number): number | undefined {
  if (totalFuelLiters <= 0 || totalKm <= 0) return undefined;
  return Math.round((totalKm / totalFuelLiters) * 100) / 100;
}

/**
 * Calculate utilization rate
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
): { valid: boolean; error?: string } {
  if (assetStatus !== 'active') {
    return { valid: false, error: 'Asset is not active and cannot be assigned' };
  }
  if (hasOpenAssignment) {
    return { valid: false, error: 'Asset already has an open assignment' };
  }
  return { valid: true };
}

/**
 * Validate daily log status
 */
export function isValidDailyLogStatus(status: string): status is DailyLogStatus {
  return ['operating', 'idle', 'maintenance', 'repair', 'standby'].includes(status);
}

/**
 * Validate assignment type
 */
export function isValidAssignmentType(type: string): type is AssignmentType {
  return ['job_order', 'project', 'employee', 'location'].includes(type);
}

/**
 * Get availability badge variant
 */
export function getAvailabilityBadgeVariant(
  status: AvailabilityStatus
): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'available': return 'default';
    case 'assigned': return 'secondary';
    case 'unavailable': return 'destructive';
  }
}

/**
 * Transform database row to interface
 */
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
    operatingCount: summaries.filter(s => s.utilizationRate >= 50).length,
    idleCount: summaries.filter(s => s.utilizationRate < 25).length,
    maintenanceCount: summaries.filter(s => s.maintenanceDays > 0).length,
    totalAssets: summaries.length,
  };
}
```

## Data Models

### Database Schema

```sql
-- =====================================================
-- v0.43: EQUIPMENT - UTILIZATION TRACKING
-- =====================================================

-- Asset assignments (to jobs, projects, employees, locations)
CREATE TABLE asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  
  -- Assignment target
  assignment_type VARCHAR(30) NOT NULL, -- 'job_order', 'project', 'employee', 'location'
  job_order_id UUID REFERENCES job_orders(id),
  project_id UUID REFERENCES projects(id),
  employee_id UUID REFERENCES employees(id),
  location_id UUID REFERENCES asset_locations(id),
  
  -- Period
  assigned_from TIMESTAMPTZ NOT NULL,
  assigned_to TIMESTAMPTZ,
  
  -- Meter readings at assignment
  start_km INTEGER,
  end_km INTEGER,
  start_hours DECIMAL(10,2),
  end_hours DECIMAL(10,2),
  
  -- Calculated usage (computed columns)
  km_used INTEGER GENERATED ALWAYS AS (end_km - start_km) STORED,
  hours_used DECIMAL(10,2) GENERATED ALWAYS AS (end_hours - start_hours) STORED,
  
  notes TEXT,
  assigned_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily utilization log (for detailed tracking)
CREATE TABLE asset_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id),
  log_date DATE NOT NULL,
  
  -- Status for the day
  status VARCHAR(30) NOT NULL, -- 'operating', 'idle', 'maintenance', 'repair', 'standby'
  
  -- Assignment
  job_order_id UUID REFERENCES job_orders(id),
  
  -- Meter readings
  start_km INTEGER,
  end_km INTEGER,
  km_today INTEGER GENERATED ALWAYS AS (end_km - start_km) STORED,
  
  start_hours DECIMAL(10,2),
  end_hours DECIMAL(10,2),
  hours_today DECIMAL(10,2) GENERATED ALWAYS AS (end_hours - start_hours) STORED,
  
  -- Fuel
  fuel_liters DECIMAL(10,2),
  fuel_cost DECIMAL(15,2),
  
  -- Operator
  operator_employee_id UUID REFERENCES employees(id),
  operator_name VARCHAR(200),
  
  notes TEXT,
  logged_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(asset_id, log_date)
);

-- Indexes for performance
CREATE INDEX idx_asset_assignments_asset ON asset_assignments(asset_id);
CREATE INDEX idx_asset_assignments_job ON asset_assignments(job_order_id);
CREATE INDEX idx_asset_assignments_period ON asset_assignments(assigned_from, assigned_to);
CREATE INDEX idx_asset_daily_logs_asset ON asset_daily_logs(asset_id);
CREATE INDEX idx_asset_daily_logs_date ON asset_daily_logs(log_date);

-- Monthly utilization summary (materialized view)
CREATE MATERIALIZED VIEW asset_utilization_monthly AS
SELECT 
  a.id as asset_id,
  a.asset_code,
  a.asset_name,
  DATE_TRUNC('month', adl.log_date)::DATE as month,
  
  -- Days by status
  COUNT(*) FILTER (WHERE adl.status = 'operating') as operating_days,
  COUNT(*) FILTER (WHERE adl.status = 'idle') as idle_days,
  COUNT(*) FILTER (WHERE adl.status = 'maintenance') as maintenance_days,
  COUNT(*) FILTER (WHERE adl.status = 'repair') as repair_days,
  COUNT(*) FILTER (WHERE adl.status = 'standby') as standby_days,
  COUNT(*) as total_logged_days,
  
  -- Utilization rate
  ROUND(
    COUNT(*) FILTER (WHERE adl.status = 'operating')::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 1
  ) as utilization_rate,
  
  -- KM and Hours
  COALESCE(SUM(adl.km_today), 0) as total_km,
  COALESCE(SUM(adl.hours_today), 0) as total_hours,
  
  -- Fuel
  COALESCE(SUM(adl.fuel_liters), 0) as total_fuel_liters,
  COALESCE(SUM(adl.fuel_cost), 0) as total_fuel_cost,
  
  -- Fuel efficiency
  CASE 
    WHEN SUM(adl.km_today) > 0 THEN 
      ROUND(SUM(adl.km_today)::NUMERIC / NULLIF(SUM(adl.fuel_liters), 0), 2)
    ELSE NULL
  END as km_per_liter
  
FROM assets a
LEFT JOIN asset_daily_logs adl ON a.id = adl.asset_id
GROUP BY a.id, a.asset_code, a.asset_name, DATE_TRUNC('month', adl.log_date);

CREATE UNIQUE INDEX idx_utilization_monthly ON asset_utilization_monthly(asset_id, month);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_asset_utilization()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY asset_utilization_monthly;
END;
$$ LANGUAGE plpgsql;

-- View for current assignments
CREATE OR REPLACE VIEW current_asset_assignments AS
SELECT 
  aa.*,
  a.asset_code,
  a.asset_name,
  a.registration_number,
  jo.jo_number,
  c.name as customer_name
FROM asset_assignments aa
JOIN assets a ON aa.asset_id = a.id
LEFT JOIN job_orders jo ON aa.job_order_id = jo.id
LEFT JOIN customers c ON jo.customer_id = c.id
WHERE aa.assigned_to IS NULL
   OR aa.assigned_to > NOW();

-- View for asset availability
CREATE OR REPLACE VIEW asset_availability AS
SELECT 
  a.id,
  a.asset_code,
  a.asset_name,
  a.registration_number,
  a.status,
  a.capacity_tons,
  ac.category_name,
  al.location_name as current_location,
  CASE 
    WHEN a.status != 'active' THEN 'unavailable'
    WHEN EXISTS (
      SELECT 1 FROM asset_assignments aa 
      WHERE aa.asset_id = a.id AND aa.assigned_to IS NULL
    ) THEN 'assigned'
    ELSE 'available'
  END as availability_status,
  (
    SELECT jo.jo_number 
    FROM asset_assignments aa
    JOIN job_orders jo ON aa.job_order_id = jo.id
    WHERE aa.asset_id = a.id AND aa.assigned_to IS NULL
    LIMIT 1
  ) as current_job
FROM assets a
JOIN asset_categories ac ON a.category_id = ac.id
LEFT JOIN asset_locations al ON a.current_location_id = al.id
WHERE a.status NOT IN ('disposed', 'sold');
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Assignment Validation

*For any* asset and assignment attempt, the assignment SHALL be rejected if the asset status is not 'active' OR if the asset has an existing open assignment (assigned_to is null).

**Validates: Requirements 1.2, 1.3**

### Property 2: Usage Calculation Consistency

*For any* assignment or daily log with both start and end meter readings, the calculated usage (km_used or km_today) SHALL equal end_reading minus start_reading, and SHALL be undefined if end < start.

**Validates: Requirements 1.7, 2.6**

### Property 3: Availability Status Derivation

*For any* asset, the availability_status SHALL be:
- 'unavailable' if asset.status != 'active'
- 'assigned' if asset.status == 'active' AND has open assignment
- 'available' if asset.status == 'active' AND no open assignment

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 4: Utilization Category Classification

*For any* utilization rate percentage, the category SHALL be:
- 'high' if rate >= 75
- 'normal' if 50 <= rate < 75
- 'low' if 25 <= rate < 50
- 'very_low' if rate < 25

**Validates: Requirements 3.5**

### Property 5: Daily Log Upsert Behavior

*For any* asset and date combination, creating a daily log when one already exists SHALL update the existing record rather than creating a duplicate.

**Validates: Requirements 2.8**

### Property 6: Utilization Rate Calculation

*For any* set of daily logs for an asset in a month, the utilization_rate SHALL equal (operating_days / total_logged_days) * 100, rounded to one decimal place.

**Validates: Requirements 3.3**

### Property 7: Fuel Efficiency Calculation

*For any* monthly utilization summary with total_km > 0 and total_fuel_liters > 0, km_per_liter SHALL equal total_km / total_fuel_liters, rounded to two decimal places.

**Validates: Requirements 5.4**

### Property 8: Category Filter Correctness

*For any* category filter applied to asset availability, all returned assets SHALL belong to the specified category.

**Validates: Requirements 4.6**

### Property 9: Monthly Report Aggregation

*For any* monthly utilization report, the total_km SHALL equal the sum of km_today from all daily logs for that asset in that month.

**Validates: Requirements 5.2**

### Property 10: Valid Status Values

*For any* daily log, the status field SHALL be one of: 'operating', 'idle', 'maintenance', 'repair', 'standby'.

**Validates: Requirements 2.1**

## Error Handling

### Assignment Errors

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| Asset not active | "Asset is not active and cannot be assigned" | 400 |
| Asset already assigned | "Asset already has an open assignment" | 409 |
| Invalid assignment type | "Invalid assignment type" | 400 |
| Job order not found | "Job order not found" | 404 |
| Assignment not found | "Assignment not found" | 404 |

### Daily Log Errors

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| Invalid status | "Invalid daily log status" | 400 |
| Invalid date format | "Invalid date format" | 400 |
| End km less than start | "End odometer cannot be less than start" | 400 |
| Asset not found | "Asset not found" | 404 |

### General Errors

| Error Condition | Error Message | HTTP Status |
|----------------|---------------|-------------|
| Database error | "Failed to save data" | 500 |
| Unauthorized | "You don't have permission to perform this action" | 403 |

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Utility function tests** (`__tests__/utilization-utils.test.ts`)
   - Test `getUtilizationCategory` with boundary values (24, 25, 49, 50, 74, 75)
   - Test `calculateKmUsed` with valid and invalid readings
   - Test `deriveAvailabilityStatus` with all status combinations
   - Test transform functions with sample data

2. **Validation tests**
   - Test `validateAssignment` with various asset states
   - Test `isValidDailyLogStatus` with valid and invalid values

### Property-Based Tests

Property-based tests will use `fast-check` library to verify universal properties:

1. **Property tests** (`__tests__/utilization-utils.property.test.ts`)
   - Each property from the Correctness Properties section
   - Minimum 100 iterations per property
   - Tag format: `Feature: equipment-utilization-tracking, Property N: description`

### Test Configuration

```typescript
// vitest.config.ts additions
export default defineConfig({
  test: {
    // ... existing config
  },
});
```

Property tests should be annotated with requirement references:
```typescript
// Example property test annotation
// **Validates: Requirements 1.2, 1.3**
test.prop([fc.string(), fc.boolean()])('Property 1: Assignment Validation', ...);
```
