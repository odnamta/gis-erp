# Design Document: Operations Dashboard (v0.9.1)

## Overview

This feature implements a dedicated Operations Dashboard for ops staff in Gama ERP. The dashboard provides a focused, efficient view of their work including pending cost entries, active jobs, and budget status - while strictly hiding sensitive financial data like revenue, profit, and margins.

The design leverages the existing permission system from v0.9 and extends it with role-based dashboard routing and ops-specific components.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Layout                               │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐  │
│  │   Sidebar   │  │              Dashboard                   │  │
│  │  (filtered) │  │  ┌─────────────────────────────────────┐│  │
│  │             │  │  │  Role-based Dashboard Router        ││  │
│  │  Dashboard  │  │  │  ┌─────────┐  ┌─────────────────┐  ││  │
│  │  Projects   │  │  │  │ Admin/  │  │ Ops Dashboard   │  ││  │
│  │  PJOs       │  │  │  │ Manager │  │ (this feature)  │  ││  │
│  │  Job Orders │  │  │  │Dashboard│  │                 │  ││  │
│  │             │  │  │  └─────────┘  └─────────────────┘  ││  │
│  └─────────────┘  │  └─────────────────────────────────────┘│  │
│                   └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard Routing Strategy

The main `/dashboard` page will check user role and render the appropriate dashboard:
- `admin`, `manager`, `finance` → Full Dashboard (existing)
- `ops` → Operations Dashboard (new)
- `viewer` → Minimal read-only dashboard

## Components and Interfaces

### New Components

```
components/
├── dashboard/
│   ├── ops/
│   │   ├── ops-dashboard.tsx        # Main ops dashboard container
│   │   ├── ops-kpi-cards.tsx        # 4 KPI cards for ops metrics
│   │   ├── pending-costs-table.tsx  # Table of PJOs needing cost entry
│   │   ├── active-jobs-table.tsx    # Table of active JOs
│   │   ├── quick-cost-modal.tsx     # Modal for quick cost entry
│   │   └── weekly-stats.tsx         # Weekly performance summary
```

### Component Interfaces

```typescript
// Ops Dashboard Props
interface OpsDashboardProps {
  kpis: OpsKPIs
  pendingCosts: PendingCostEntry[]
  activeJobs: ActiveJob[]
  weeklyStats: WeeklyStats
}

// KPI Data
interface OpsKPIs {
  pendingCostEntries: number
  inProgressJobs: number
  completedThisWeek: number
  overBudgetItems: number
  urgentCount: number
}

// Pending Cost Entry
interface PendingCostEntry {
  id: string
  pjo_number: string
  project_name: string
  customer_name: string
  confirmed_count: number
  total_count: number
  approved_at: string
  is_urgent: boolean // > 3 days since approval
}

// Active Job
interface ActiveJob {
  id: string
  jo_number: string
  commodity: string
  pol: string
  pod: string
  status: 'active' | 'in_progress'
  project_name: string
}

// Weekly Stats
interface WeeklyStats {
  completedThisWeek: number
  completedLastWeek: number
  avgCompletionDays: number
  trend: 'up' | 'down' | 'stable'
}
```

### Server Actions

```typescript
// lib/dashboard-utils.ts (extend existing)

export async function getOpsDashboardData(): Promise<OpsDashboardData> {
  // Fetch all ops-specific data in parallel
}

export async function getOpsKPIs(): Promise<OpsKPIs> {
  // Count pending entries, active jobs, completed this week, over budget
}

export async function getPendingCostEntries(): Promise<PendingCostEntry[]> {
  // Get approved PJOs with incomplete cost confirmations
  // Sort by urgency (oldest first)
}

export async function getActiveJobs(): Promise<ActiveJob[]> {
  // Get JOs with status active or in_progress
}

export async function getWeeklyStats(): Promise<WeeklyStats> {
  // Calculate weekly performance metrics
}
```

## Data Models

### Database Queries

```sql
-- Pending Cost Entries (approved PJOs with incomplete costs)
SELECT 
  pjo.id,
  pjo.pjo_number,
  pjo.approved_at,
  p.name as project_name,
  c.name as customer_name,
  COUNT(CASE WHEN ci.confirmed_at IS NOT NULL THEN 1 END) as confirmed_count,
  COUNT(ci.id) as total_count
FROM proforma_job_orders pjo
JOIN projects p ON pjo.project_id = p.id
JOIN customers c ON p.customer_id = c.id
LEFT JOIN pjo_cost_items ci ON ci.pjo_id = pjo.id
WHERE pjo.status = 'approved'
  AND pjo.converted_to_jo = false
GROUP BY pjo.id, p.name, c.name
HAVING COUNT(CASE WHEN ci.confirmed_at IS NOT NULL THEN 1 END) < COUNT(ci.id)
ORDER BY pjo.approved_at ASC;

-- Active Jobs
SELECT 
  jo.id,
  jo.jo_number,
  jo.commodity,
  jo.pol,
  jo.pod,
  jo.status,
  p.name as project_name
FROM job_orders jo
JOIN proforma_job_orders pjo ON jo.pjo_id = pjo.id
JOIN projects p ON pjo.project_id = p.id
WHERE jo.status IN ('active', 'in_progress')
ORDER BY jo.created_at DESC;

-- Over Budget Items Count
SELECT COUNT(*) 
FROM pjo_cost_items 
WHERE status = 'exceeded';

-- Completed This Week
SELECT COUNT(DISTINCT pjo_id)
FROM pjo_cost_items
WHERE confirmed_at >= date_trunc('week', CURRENT_DATE)
GROUP BY pjo_id
HAVING COUNT(*) = COUNT(confirmed_at);
```

### Urgency Calculation

```typescript
function isUrgent(approvedAt: string): boolean {
  const daysSinceApproval = differenceInDays(new Date(), new Date(approvedAt))
  return daysSinceApproval > 3
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Ops users cannot see financial data
*For any* user profile with role='ops', the permission check for 'can_see_revenue' and 'can_see_profit' SHALL return false
**Validates: Requirements 1.2, 1.4**

### Property 2: Pending cost entries filter correctly
*For any* set of PJOs, the pending cost entries filter SHALL return only PJOs where status='approved' AND converted_to_jo=false AND confirmed_count < total_count
**Validates: Requirements 2.1**

### Property 3: Cost entry progress calculation
*For any* PJO with cost items, the progress display SHALL show "X/Y" where X is the count of items with confirmed_at NOT NULL and Y is the total count of cost items
**Validates: Requirements 2.2, 2.3**

### Property 4: Active jobs filter correctly
*For any* set of JOs, the active jobs filter SHALL return only JOs where status IN ('active', 'in_progress')
**Validates: Requirements 3.1**

### Property 5: Budget variance calculation
*For any* cost item with actual_amount set, the variance SHALL equal (actual_amount - estimated_amount) and warning SHALL display when variance > 0
**Validates: Requirements 4.2, 4.3**

### Property 6: Justification required for exceeded costs
*For any* cost confirmation where actual_amount > estimated_amount, the confirmation SHALL fail if justification is empty or null
**Validates: Requirements 4.4**

### Property 7: Navigation filtering for ops role
*For any* user profile with role='ops', the navigation filter SHALL exclude 'customers', 'invoices', and 'reports' menu items AND include 'dashboard', 'projects', 'pjo', and 'job-orders'
**Validates: Requirements 5.1, 5.2**

### Property 8: Urgency calculation
*For any* PJO with approved_at date, is_urgent SHALL be true if and only if the difference between current date and approved_at is greater than 3 days
**Validates: Requirements 7.1**

### Property 9: Pending entries sort order
*For any* list of pending cost entries, the list SHALL be sorted by approved_at in ascending order (oldest first)
**Validates: Requirements 7.2**

### Property 10: Weekly trend calculation
*For any* weekly stats with completedThisWeek and completedLastWeek, trend SHALL be 'up' if this > last, 'down' if this < last, 'stable' if equal
**Validates: Requirements 6.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| No pending cost entries | Show empty state with "All caught up!" message |
| No active jobs | Show empty state with "No active jobs" message |
| Database query fails | Show error toast, display cached data if available |
| Quick entry submission fails | Show error in modal, keep modal open for retry |
| Unauthorized access attempt | Redirect to ops dashboard with toast notification |

## Testing Strategy

### Unit Tests
- Test urgency calculation with various dates
- Test progress calculation with edge cases (0 items, all confirmed)
- Test navigation filter for ops role
- Test variance calculation

### Property-Based Tests (using fast-check)
- Property 1: Financial data hiding for ops role
- Property 2: Pending cost entries filter
- Property 4: Active jobs filter
- Property 5: Budget variance calculation
- Property 6: Justification validation
- Property 7: Navigation filtering
- Property 8: Urgency calculation
- Property 9: Sort order verification
- Property 10: Trend calculation

### Integration Tests
- Full dashboard render with mock data
- Quick cost entry modal flow
- Navigation between dashboard and cost entry pages
