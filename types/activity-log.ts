// Activity Log Types for v0.13

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

export interface ActivityLogUser {
  id: string
  name: string
}

export interface GetActivityLogsParams {
  filters: ActivityLogFilters
  page: number
  pageSize: number
}

export interface GetActivityLogsResult {
  logs: ActivityLogEntry[]
  total: number
}

// Constants for filter options
export const ACTION_TYPE_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'status_changed', label: 'Status Changed' },
  { value: 'payment_recorded', label: 'Payment Recorded' },
] as const

export const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'pjo', label: 'PJO' },
  { value: 'jo', label: 'Job Order' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'customer', label: 'Customer' },
  { value: 'project', label: 'Project' },
] as const

export const DATE_RANGE_OPTIONS = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
] as const
