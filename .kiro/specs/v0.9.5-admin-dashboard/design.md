# Design: Administration Dashboard (v0.9.5)

## Overview
Dashboard for **Administration Division** (role: `admin`) - handles document workflow (PJO/JO/Invoice creation and tracking). Not to be confused with `super_admin` (system administrator).

## Architecture

### File Structure
```
lib/
  admin-dashboard-utils.ts       # Utility functions and types

components/dashboard/admin/
  admin-dashboard.tsx            # Main container component
  admin-period-filter.tsx        # Period selection dropdown
  admin-kpi-cards.tsx            # 6 KPI cards
  pjo-status-pipeline.tsx        # Horizontal status pipeline
  pending-work-queue.tsx         # Action items table
  recent-documents-table.tsx     # Recent docs with type filter
  invoice-aging-summary.tsx      # Aging buckets display
  quick-actions-panel.tsx        # Quick action buttons

app/(main)/dashboard/
  actions.ts                     # Add fetchAdminDashboardData

__tests__/
  admin-dashboard-utils.test.ts  # Property-based tests
```

## Type Definitions

```typescript
// Period types
type AdminPeriodType = 'this_week' | 'this_month' | 'this_quarter'

interface AdminPeriodFilter {
  type: AdminPeriodType
  startDate: Date
  endDate: Date
}

// KPI types
interface AdminKPIs {
  pjosPendingApproval: number
  pjosReadyForJO: number
  josInProgress: number
  invoicesUnpaid: number
  revenueThisPeriod: number
  documentsCreated: number
}

// Pipeline types
interface PipelineStage {
  status: string
  label: string
  count: number
  percentage: number
}

// Pending work types
type WorkItemType = 'pjo' | 'jo' | 'invoice'
type ActionType = 'create_jo' | 'create_invoice' | 'send_invoice' | 'follow_up_payment'

interface PendingWorkItem {
  id: string
  type: WorkItemType
  number: string
  customerName: string
  actionNeeded: ActionType
  actionLabel: string
  daysPending: number
  linkUrl: string
}

// Recent documents types
interface RecentDocument {
  id: string
  type: WorkItemType
  number: string
  customerName: string
  status: string
  createdAt: string
  updatedAt: string
  linkUrl: string
}

// Invoice aging types
interface AgingBucket {
  label: string
  minDays: number
  maxDays: number | null
  count: number
  totalAmount: number
  isOverdue: boolean
}
```

## Component Design

### AdminDashboard (Main Container)
```
┌─────────────────────────────────────────────────────────────┐
│ Admin Dashboard                        [This Month ▼]       │
│ Welcome, Dio                                                │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ PJOs    │ │ Ready   │ │ JOs In  │ │Invoices │ │ Revenue │ │
│ │ Pending │ │ for JO  │ │Progress │ │ Unpaid  │ │  MTD    │ │
│ │   5     │ │   3     │ │   8     │ │   12    │ │ 450M    │ │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│ PJO Pipeline                                                │
│ [Draft: 2] → [Pending: 5] → [Approved: 8] → [Converted: 15] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────┐ ┌─────────────────────────┐ │
│ │ Pending Work Queue          │ │ Invoice Aging           │ │
│ │ ┌───┬────────┬─────┬──────┐ │ │ Current    : 5 (200M)   │ │
│ │ │Typ│Number  │Cust │Action│ │ │ 1-30 days  : 3 (150M)   │ │
│ │ ├───┼────────┼─────┼──────┤ │ │ 31-60 days : 2 (80M)    │ │
│ │ │PJO│0012/...│ABC  │→ JO  │ │ │ 61-90 days : 1 (50M) ⚠  │ │
│ │ │JO │JO-0008 │XYZ  │→ Inv │ │ │ 90+ days   : 1 (30M) 🔴 │ │
│ │ │INV│INV-045 │DEF  │Follow│ │ └─────────────────────────┘ │
│ │ └───┴────────┴─────┴──────┘ │                             │
│ └─────────────────────────────┘                             │
├─────────────────────────────────────────────────────────────┤
│ Recent Documents                    [All ▼]                 │
│ ┌─────┬──────────┬──────────┬────────┬──────────┬─────────┐ │
│ │Type │ Number   │ Customer │ Status │ Created  │ Updated │ │
│ ├─────┼──────────┼──────────┼────────┼──────────┼─────────┤ │
│ │ PJO │ 0015/... │ PT ABC   │ Draft  │ 15/12/25 │ 15/12/25│ │
│ │ JO  │ JO-0010  │ PT XYZ   │ Active │ 14/12/25 │ 15/12/25│ │
│ │ INV │ INV-048  │ PT DEF   │ Sent   │ 13/12/25 │ 13/12/25│ │
│ └─────┴──────────┴──────────┴────────┴──────────┴─────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions                                               │
│ [+ New PJO] [+ New Customer] [📋 All PJOs] [📋 All JOs]    │
└─────────────────────────────────────────────────────────────┘
```

## Utility Functions

### Period Functions
```typescript
getAdminPeriodDates(type: AdminPeriodType, currentDate: Date): AdminPeriodFilter
getAdminPreviousPeriodDates(period: AdminPeriodFilter): AdminPeriodFilter
```

### KPI Functions
```typescript
calculateAdminKPIs(pjos, jos, invoices, period): AdminKPIs
countPJOsPendingApproval(pjos): number
countPJOsReadyForJO(pjos): number
countJOsInProgress(jos): number
countInvoicesUnpaid(invoices): number
calculatePeriodRevenue(invoices, period): number
countDocumentsCreated(pjos, jos, invoices, period): number
```

### Pipeline Functions
```typescript
calculatePipelineStages(pjos): PipelineStage[]
```

### Pending Work Functions
```typescript
getPendingWorkItems(pjos, jos, invoices, currentDate): PendingWorkItem[]
determineActionNeeded(item): ActionType
calculateDaysPending(date, currentDate): number
sortByDaysPendingDesc(items): PendingWorkItem[]
```

### Aging Functions
```typescript
calculateAgingBuckets(invoices, currentDate): AgingBucket[]
getAgingBucket(daysPastDue): AgingBucket
```

### Document Functions
```typescript
getRecentDocuments(pjos, jos, invoices, limit): RecentDocument[]
filterDocumentsByType(docs, type): RecentDocument[]
```

## Data Flow

1. User loads dashboard → `fetchAdminDashboardData()` called
2. Server action queries:
   - `proforma_job_orders` with customer join
   - `job_orders` with PJO and customer join
   - `invoices` with JO and customer join
3. Utility functions calculate KPIs, pipeline, pending work, aging
4. Components render with loading states
5. Period change triggers re-fetch with new date range

## Database Queries

### PJOs Query
```sql
SELECT p.*, c.name as customer_name, pr.name as project_name
FROM proforma_job_orders p
LEFT JOIN projects pr ON p.project_id = pr.id
LEFT JOIN customers c ON pr.customer_id = c.id
WHERE p.is_active = true
ORDER BY p.created_at DESC
```

### JOs Query
```sql
SELECT j.*, p.pjo_number, c.name as customer_name
FROM job_orders j
LEFT JOIN proforma_job_orders p ON j.pjo_id = p.id
LEFT JOIN projects pr ON p.project_id = pr.id
LEFT JOIN customers c ON pr.customer_id = c.id
WHERE j.is_active = true
ORDER BY j.created_at DESC
```

### Invoices Query
```sql
SELECT i.*, j.jo_number, c.name as customer_name
FROM invoices i
LEFT JOIN job_orders j ON i.jo_id = j.id
LEFT JOIN proforma_job_orders p ON j.pjo_id = p.id
LEFT JOIN projects pr ON p.project_id = pr.id
LEFT JOIN customers c ON pr.customer_id = c.id
WHERE i.is_active = true
ORDER BY i.created_at DESC
```

## Testing Strategy

### Property Tests
1. **KPI calculations**: Sum properties, non-negative values
2. **Pipeline percentages**: Sum to 100%, counts match total
3. **Pending work sorting**: Descending by days pending
4. **Aging buckets**: Mutually exclusive, cover all invoices
5. **Period dates**: Valid ranges, no overlap
