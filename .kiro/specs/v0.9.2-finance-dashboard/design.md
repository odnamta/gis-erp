# Design Document: Finance Dashboard (v0.9.2)

## Overview

This feature implements a dedicated Finance Dashboard for finance staff in Gama ERP. The dashboard provides a focused view of accounts receivable, invoice tracking, quotation pipeline monitoring, and payment management - enabling finance users to manage cash flow and follow up on outstanding payments efficiently.

The design leverages the existing permission system from v0.9 and follows the same patterns established in the Ops Dashboard (v0.9.1) for role-based dashboard routing.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Main Layout                               │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐  │
│  │   Sidebar   │  │              Dashboard                   │  │
│  │  (filtered) │  │  ┌─────────────────────────────────────┐│  │
│  │             │  │  │  Role-based Dashboard Router        ││  │
│  │  Dashboard  │  │  │  ┌─────────┐  ┌─────────────────┐  ││  │
│  │  Projects   │  │  │  │ Admin/  │  │ Finance Dashboard│  ││  │
│  │  PJOs       │  │  │  │ Manager │  │ (this feature)   │  ││  │
│  │  Invoices   │  │  │  │Dashboard│  │                  │  ││  │
│  │             │  │  │  └─────────┘  └─────────────────┘  ││  │
│  └─────────────┘  │  └─────────────────────────────────────┘│  │
│                   └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Dashboard Routing Strategy

The main `/dashboard` page checks user role and renders the appropriate dashboard:
- `admin`, `manager` → Full Dashboard (existing)
- `ops` → Operations Dashboard (v0.9.1)
- `finance` → Finance Dashboard (this feature)
- `viewer` → Minimal read-only dashboard

## Components and Interfaces

### New Components

```
components/
├── dashboard/
│   ├── finance/
│   │   ├── finance-dashboard.tsx      # Main finance dashboard container
│   │   ├── finance-kpi-cards.tsx      # 3 KPI cards (AR, Overdue, Revenue)
│   │   ├── ar-aging-summary.tsx       # AR aging breakdown by bucket
│   │   ├── pjo-pipeline.tsx           # Quotation pipeline table
│   │   ├── overdue-invoices-table.tsx # Overdue invoices with remind action
│   │   ├── recent-payments-table.tsx  # Recent payments list
│   │   └── export-report-dropdown.tsx # Export options dropdown
```

### Component Interfaces

```typescript
// Finance Dashboard Props
interface FinanceDashboardProps {
  kpis: FinanceKPIs
  arAging: ARAgingData
  pjoPipeline: PJOPipelineData[]
  overdueInvoices: OverdueInvoice[]
  recentPayments: RecentPayment[]
}

// KPI Data
interface FinanceKPIs {
  outstandingAR: number
  outstandingARCount: number
  overdueAmount: number
  overdueCount: number
  criticalOverdueCount: number
  monthlyRevenue: number
  monthlyJOCount: number
  previousMonthRevenue: number
  revenueTrend: 'up' | 'down' | 'stable'
}

// AR Aging Data
interface ARAgingData {
  current: AgingBucket      // 0-30 days
  days31to60: AgingBucket   // 31-60 days
  days61to90: AgingBucket   // 61-90 days
  over90: AgingBucket       // 90+ days
}

interface AgingBucket {
  count: number
  amount: number
  invoices: Invoice[]
}

// PJO Pipeline
interface PJOPipelineData {
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  count: number
  totalValue: number
}

// Overdue Invoice
interface OverdueInvoice {
  id: string
  invoice_number: string
  customer_name: string
  total_amount: number
  due_date: string
  days_overdue: number
  severity: 'warning' | 'orange' | 'critical'
}

// Recent Payment
interface RecentPayment {
  id: string
  invoice_number: string
  customer_name: string
  total_amount: number
  paid_at: string
  payment_reference: string | null
}

// Severity levels
type OverdueSeverity = 'warning' | 'orange' | 'critical'
```

### Utility Functions

```typescript
// lib/finance-dashboard-utils.ts

export function calculateAgingBucket(dueDate: string, currentDate: Date): AgingBucketType {
  // Returns: 'current' | 'days31to60' | 'days61to90' | 'over90'
}

export function calculateDaysOverdue(dueDate: string, currentDate: Date): number {
  // Returns number of days past due date
}

export function getOverdueSeverity(daysOverdue: number): OverdueSeverity {
  // 1-30: 'warning', 31-60: 'orange', 60+: 'critical'
}

export function groupInvoicesByAging(invoices: Invoice[], currentDate: Date): ARAgingData {
  // Groups invoices into aging buckets
}

export function groupPJOsByStatus(pjos: ProformaJobOrder[]): PJOPipelineData[] {
  // Groups PJOs by status with count and total value
}

export function filterOverdueInvoices(invoices: Invoice[], currentDate: Date): OverdueInvoice[] {
  // Returns invoices where due_date < currentDate, sorted by days_overdue desc
}

export function filterRecentPayments(invoices: Invoice[], currentDate: Date): RecentPayment[] {
  // Returns paid invoices from last 30 days, sorted by paid_at desc
}

export function calculateMonthlyRevenue(jobOrders: JobOrder[], currentDate: Date): {
  current: number
  previous: number
  currentCount: number
  trend: 'up' | 'down' | 'stable'
} {
  // Calculates revenue from completed JOs in current and previous month
}

export function calculateFinanceKPIs(
  invoices: Invoice[],
  jobOrders: JobOrder[],
  currentDate: Date
): FinanceKPIs {
  // Aggregates all KPI data
}
```

## Data Models

### Database Queries

```sql
-- Outstanding AR (invoices with status 'sent' or 'overdue')
SELECT 
  i.id,
  i.invoice_number,
  i.total_amount,
  i.due_date,
  i.status,
  c.name as customer_name
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.status IN ('sent', 'overdue')
ORDER BY i.due_date ASC;

-- PJO Pipeline Summary
SELECT 
  status,
  COUNT(*) as count,
  COALESCE(SUM(total_revenue_calculated), 0) as total_value
FROM proforma_job_orders
WHERE is_active = true
GROUP BY status
ORDER BY 
  CASE status 
    WHEN 'draft' THEN 1 
    WHEN 'pending_approval' THEN 2 
    WHEN 'approved' THEN 3 
    WHEN 'rejected' THEN 4 
  END;

-- Recent Payments (last 30 days)
SELECT 
  i.id,
  i.invoice_number,
  i.total_amount,
  i.paid_at,
  i.notes as payment_reference,
  c.name as customer_name
FROM invoices i
JOIN customers c ON i.customer_id = c.id
WHERE i.status = 'paid'
  AND i.paid_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY i.paid_at DESC;

-- Monthly Revenue from Completed JOs
SELECT 
  DATE_TRUNC('month', completed_at) as month,
  COUNT(*) as jo_count,
  COALESCE(SUM(final_revenue), 0) as total_revenue
FROM job_orders
WHERE status IN ('completed', 'submitted_to_finance', 'invoiced', 'closed')
  AND completed_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
GROUP BY DATE_TRUNC('month', completed_at)
ORDER BY month DESC;
```

### AR Aging Calculation

```typescript
function calculateAgingBucket(dueDate: string, currentDate: Date): AgingBucketType {
  const due = new Date(dueDate)
  const diffDays = Math.floor((currentDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays <= 30) return 'current'
  if (diffDays <= 60) return 'days31to60'
  if (diffDays <= 90) return 'days61to90'
  return 'over90'
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Dashboard routing for finance role
*For any* user profile with role='finance', the dashboard router SHALL return the Finance Dashboard component
**Validates: Requirements 1.1**

### Property 2: AR aging bucket classification
*For any* invoice with a due date and current date, the aging bucket classification SHALL place the invoice in exactly one bucket: 'current' (0-30 days), 'days31to60' (31-60 days), 'days61to90' (61-90 days), or 'over90' (90+ days) based on days since due date
**Validates: Requirements 2.1, 2.3**

### Property 3: Aging bucket aggregation
*For any* set of invoices in an aging bucket, the bucket's count SHALL equal the number of invoices and the amount SHALL equal the sum of all invoice total_amounts
**Validates: Requirements 2.2**

### Property 4: PJO pipeline grouping and aggregation
*For any* set of active PJOs, the pipeline grouping SHALL produce exactly one entry per status with count equal to PJOs in that status and totalValue equal to sum of total_revenue_calculated
**Validates: Requirements 3.1, 3.2**

### Property 5: Overdue invoice filter
*For any* invoice, it SHALL appear in the overdue list if and only if the invoice status is 'sent' or 'overdue' AND current date is greater than due_date
**Validates: Requirements 4.1**

### Property 6: Overdue invoice sort order
*For any* list of overdue invoices, the list SHALL be sorted by days_overdue in descending order (oldest first)
**Validates: Requirements 4.3**

### Property 7: Recent payments filter
*For any* invoice, it SHALL appear in recent payments if and only if status='paid' AND paid_at is within the last 30 days from current date
**Validates: Requirements 5.1**

### Property 8: Recent payments sort order
*For any* list of recent payments, the list SHALL be sorted by paid_at in descending order (most recent first)
**Validates: Requirements 5.4**

### Property 9: Overdue severity classification
*For any* overdue invoice with days_overdue, the severity SHALL be 'warning' if 1-30 days, 'orange' if 31-60 days, and 'critical' if more than 60 days
**Validates: Requirements 8.1, 8.2, 8.3**

### Property 10: Monthly revenue calculation
*For any* set of completed job orders, monthly revenue SHALL equal the sum of final_revenue for JOs where completed_at falls within the specified month, and trend SHALL be 'up' if current > previous, 'down' if current < previous, 'stable' if equal
**Validates: Requirements 7.1, 7.2**

### Property 11: Export completeness
*For any* AR aging export, the export SHALL contain all outstanding invoices with their correct aging bucket classification
**Validates: Requirements 6.2**

## Error Handling

| Scenario | Handling |
|----------|----------|
| No outstanding invoices | Show empty state with "All invoices paid!" message |
| No overdue invoices | Show empty state with "No overdue invoices" message |
| No recent payments | Show empty state with "No recent payments" message |
| Database query fails | Show error toast, display cached data if available |
| Export fails | Show error toast with retry option |
| Unauthorized access attempt | Redirect to appropriate dashboard with toast notification |

## Testing Strategy

### Unit Tests
- Test aging bucket calculation with various date combinations
- Test days overdue calculation
- Test severity classification
- Test monthly revenue aggregation
- Test pipeline grouping

### Property-Based Tests (using fast-check)
- Property 2: AR aging bucket classification
- Property 3: Aging bucket aggregation
- Property 4: PJO pipeline grouping
- Property 5: Overdue invoice filter
- Property 6: Overdue invoice sort order
- Property 7: Recent payments filter
- Property 8: Recent payments sort order
- Property 9: Severity classification
- Property 10: Monthly revenue calculation

### Integration Tests
- Full dashboard render with mock data
- Export functionality
- Navigation between dashboard and filtered lists
