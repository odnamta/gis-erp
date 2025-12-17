# Design Document

## Introduction

This document describes the technical design for the Activity Log Viewer feature (v0.13). The feature provides a UI for viewing, filtering, and exporting activity logs stored in the existing `activity_log` table.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Activity Log Page                             │
│  /app/(main)/settings/activity-log/page.tsx (Server Component)  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         ActivityLogClient (Client Component)              │   │
│  │  - Filter state management                                │   │
│  │  - Pagination state                                       │   │
│  │  - Export CSV handler                                     │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │   │
│  │  │ FilterBar   │ │ ActivityLog │ │ Pagination          │ │   │
│  │  │ Component   │ │ Table       │ │ Component           │ │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Server Actions                                │
│  /app/(main)/settings/activity-log/actions.ts                   │
│  - getActivityLogs(filters, pagination, userProfile)            │
│  - getActivityLogUsers() - for user filter dropdown             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Utility Functions                             │
│  /lib/activity-log-utils.ts                                     │
│  - formatActionType(action_type) → human-readable label         │
│  - formatEntityType(document_type) → human-readable label       │
│  - formatDetails(details) → readable string                     │
│  - formatRelativeTime(timestamp) → "Today 08:35", etc.          │
│  - getEntityUrl(document_type, document_id) → navigation URL    │
│  - exportToCsv(logs) → trigger CSV download                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Database                                      │
│  activity_log table (existing)                                  │
│  - id, action_type, document_type, document_id, document_number │
│  - user_id, user_name, details (jsonb), created_at              │
└─────────────────────────────────────────────────────────────────┘
```

## Database Design

### Existing Table: activity_log

The table already exists with the following structure:

```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  document_number TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS Policies Required

```sql
-- Owner/Admin: Full access to all logs
CREATE POLICY "Owners and admins can view all activity logs"
ON activity_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('owner', 'admin')
  )
);

-- Other users: Own logs only
CREATE POLICY "Users can view own activity logs"
ON activity_log FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('owner', 'admin')
  )
);
```

## Component Design

### 1. ActivityLogPage (Server Component)

**File:** `/app/(main)/settings/activity-log/page.tsx`

```typescript
// Server component that:
// 1. Checks user permissions (redirect if no access)
// 2. Fetches initial data
// 3. Passes user profile to client component for access control
```

### 2. ActivityLogClient (Client Component)

**File:** `/app/(main)/settings/activity-log/activity-log-client.tsx`

**Props:**
```typescript
interface ActivityLogClientProps {
  initialLogs: ActivityLogEntry[]
  initialTotal: number
  users: { id: string; name: string }[]
  userProfile: UserProfile
}
```

**State:**
```typescript
interface FilterState {
  actionType: string | null      // 'all' | specific action
  entityType: string | null      // 'all' | specific entity
  userId: string | null          // 'all' | specific user id
  dateRange: 'last7' | 'last30' | 'last90' | 'all'
  page: number
}
```

### 3. Filter Components

**Action Type Options:**
- All Actions
- Login / Logout
- Created
- Updated
- Deleted
- Approved
- Rejected
- Status Changed
- Payment Recorded

**Entity Type Options:**
- All Entities
- PJO
- Job Order
- Invoice
- Customer
- Project

**Date Range Options:**
- Last 7 days (default)
- Last 30 days
- Last 90 days
- All time

### 4. Activity Log Table

**Columns:**
| Column | Description |
|--------|-------------|
| Time | Relative timestamp (Today 08:35, Yesterday, 2 days ago) |
| User | User name from activity_log.user_name |
| Action | Human-readable action type |
| Entity | Document type + number (e.g., "PJO-0021") |
| Details | Formatted details from JSONB |
| Actions | View link (if applicable) |

## Utility Functions

### formatActionType(actionType: string): string

```typescript
const ACTION_LABELS: Record<string, string> = {
  'login': 'Login',
  'logout': 'Logout',
  'created': 'Created',
  'updated': 'Updated',
  'deleted': 'Deleted',
  'approved': 'Approved',
  'pjo_approved': 'Approved',
  'rejected': 'Rejected',
  'pjo_rejected': 'Rejected',
  'status_changed': 'Status Changed',
  'payment_recorded': 'Payment Recorded',
}
```

### formatEntityType(documentType: string): string

```typescript
const ENTITY_LABELS: Record<string, string> = {
  'pjo': 'PJO',
  'jo': 'Job Order',
  'invoice': 'Invoice',
  'customer': 'Customer',
  'project': 'Project',
  'user': 'User',
  'system': 'System',
}
```

### formatRelativeTime(timestamp: string): string

```typescript
// Returns:
// - "Today HH:mm" for today
// - "Yesterday HH:mm" for yesterday
// - "X days ago" for within 7 days
// - "DD/MM/YYYY" for older dates
```

### getEntityUrl(documentType: string, documentId: string): string | null

```typescript
const ENTITY_ROUTES: Record<string, string> = {
  'pjo': '/pjo',
  'jo': '/jo',
  'invoice': '/invoices',
  'customer': '/customers',
  'project': '/projects',
}
// Returns null for login/logout/system actions
```

### formatDetails(details: Record<string, unknown> | null): string

```typescript
// Formats JSONB details into readable string
// e.g., { status: 'paid', previous: 'sent' } → "status: sent → paid"
// e.g., { from_pjo: 'PJO-0018' } → "from PJO-0018"
```

### exportToCsv(logs: ActivityLogEntry[], filename: string): void

```typescript
// Generates CSV with columns:
// Timestamp, User, Action, Entity Type, Entity Number, Details
// Triggers browser download
```

## Access Control Logic

```typescript
function getAccessLevel(profile: UserProfile): 'full' | 'own' {
  if (profile.role === 'owner' || profile.role === 'admin') {
    return 'full'
  }
  return 'own'
}

function canExportCsv(profile: UserProfile): boolean {
  return profile.role === 'owner' || profile.role === 'admin'
}

function canFilterByUser(profile: UserProfile): boolean {
  return profile.role === 'owner' || profile.role === 'admin'
}
```

## Server Actions

### getActivityLogs

```typescript
interface GetActivityLogsParams {
  actionType?: string
  entityType?: string
  userId?: string
  dateRange: 'last7' | 'last30' | 'last90' | 'all'
  page: number
  pageSize: number
}

interface GetActivityLogsResult {
  logs: ActivityLogEntry[]
  total: number
}
```

### getActivityLogUsers

```typescript
// Returns list of users for filter dropdown
// Only called for owner/admin users
interface ActivityLogUser {
  id: string
  name: string
}
```

## Types

**File:** `/types/activity-log.ts`

```typescript
export interface ActivityLogEntry {
  id: string
  action_type: string
  document_type: string
  document_id: string
  document_number: string
  user_id: string | null
  user_name: string
  details: Record<string, unknown> | null
  created_at: string
}

export type ActionType = 
  | 'login' 
  | 'logout' 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'approved'
  | 'pjo_approved'
  | 'rejected'
  | 'pjo_rejected'
  | 'status_changed' 
  | 'payment_recorded'

export type EntityType = 
  | 'pjo' 
  | 'jo' 
  | 'invoice' 
  | 'customer' 
  | 'project'
  | 'user'
  | 'system'

export type DateRange = 'last7' | 'last30' | 'last90' | 'all'

export interface ActivityLogFilters {
  actionType: string | null
  entityType: string | null
  userId: string | null
  dateRange: DateRange
}
```

## File Structure

```
app/(main)/settings/activity-log/
├── page.tsx                    # Server component (auth + initial fetch)
├── activity-log-client.tsx     # Client component (filters + table)
└── actions.ts                  # Server actions

lib/
└── activity-log-utils.ts       # Utility functions

types/
└── activity-log.ts             # TypeScript types
```

## UI Mockup

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Activity Log                                          [Export CSV]              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ Filter: [All Actions ▼] [All Users ▼] [All Entities ▼]  Date: [Last 7 days ▼]  │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Time              │ User          │ Action      │ Entity      │ Details        │
│ ──────────────────┼───────────────┼─────────────┼─────────────┼─────────────── │
│ Today 08:35       │ Dio Atmando   │ Approved    │ PJO-0021    │ [View →]       │
│ Today 08:30       │ Dio Atmando   │ Created     │ PJO-0021    │ [View →]       │
│ Yesterday 16:45   │ Dio Atmando   │ Updated     │ Invoice-005 │ status: paid   │
│ Yesterday 14:20   │ Dio Atmando   │ Login       │ -           │ IP: 192.168.x  │
│ 2 days ago        │ Dio Atmando   │ Created     │ JO-0001     │ from PJO-0018  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                        [← Previous]  Page 1 of 5  [Next →]                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Dependencies

- Existing shadcn/ui components: Table, Select, Button, Card
- date-fns for date formatting
- Existing Supabase client from /lib/supabase
