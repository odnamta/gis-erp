# GIS-ERP Navigation Tech Debt

> Last updated: 2026-02-25

## Dead Navigation Links (404s)

Routes referenced in `lib/navigation.ts` that have no corresponding `page.tsx`.

| # | Nav Item | Dead href | Status | Fix |
|---|----------|-----------|--------|-----|
| 1 | ~~Admin (parent)~~ | ~~/admin/audit-logs~~ | **FIXED** (Feb 25) | Changed parent href to `/admin/feedback` |
| 2 | Help (parent) | `/help` | **OPEN** | Create `/app/(main)/help/page.tsx` as help center landing |

## RLS UUID Mismatch (employee_id = auth.uid())

Tables where RLS compared `employee_id` (FK to `employees.id`, an auto PK UUID) directly against `auth.uid()` (auth user UUID). These are different UUIDs — the correct pattern joins through `employees → user_profiles` to reach the auth UUID.

| # | Table | Policy | Status |
|---|-------|--------|--------|
| 1 | `leave_requests` | `leave_requests_all` | **FIXED** (Feb 25) |
| 2 | `leave_balances` | `leave_balances_all` | **FIXED** (Feb 25) |
| 3 | `attendance_records` | `attendance_records_all` | **FIXED** (Feb 25) |
| 4 | `payroll_records` | `payroll_records_all` | **FIXED** (Feb 25) |
| 5 | `employee_payroll_setup` | `employee_payroll_setup_all` | **FIXED** (Feb 25) |

Correct pattern:
```sql
employee_id IN (
  SELECT e.id FROM employees e
  JOIN user_profiles up ON up.id = e.user_id
  WHERE up.user_id = auth.uid()
)
```

## Orphan Admin Pages (not in navigation)

Pages that exist under `/admin/` but aren't linked from the sidebar. Accessible only by direct URL.

| Page | Purpose | Action Needed |
|------|---------|---------------|
| `/admin/changelog` | Change history viewer | Consider adding to Admin nav children |
| `/admin/security/events` | Security event logs | Consider adding to Admin nav children |
| `/admin/security/blocked-ips` | IP blocking | Consider adding to Admin nav children |
| `/admin/security/api-keys` | API key management | Consider adding to Admin nav children |
| `/admin/security/sessions` | Session management | Consider adding to Admin nav children |

## Decision Log

- **2026-02-25**: `/admin/audit-logs` parent href changed to `/admin/feedback` — Feedback is the most commonly used admin page and exists as a real page.
- **2026-02-25**: 5 RLS policies fixed with proper join pattern. All employee-related tables now correctly resolve auth UUID → user_profiles.user_id → user_profiles.id → employees.user_id → employees.id.
