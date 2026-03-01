// Enhanced Notification Center Types for v0.40

import { Notification, NotificationPriority, NotificationType, EntityType } from './notifications'

export type NotificationCategory = 'finance' | 'operations' | 'hr' | 'approvals' | 'system'

export interface EnhancedNotification extends Notification {
  category: NotificationCategory | string | null
  action_label: string | null
  is_archived: boolean | null
  archived_at: string | null
  email_sent: boolean | null
  email_sent_at: string | null
  push_sent: boolean | null
  push_sent_at: string | null
}

export interface NotificationGroup {
  label: string // 'New', 'Earlier', 'Today', 'Yesterday', or date string
  notifications: EnhancedNotification[]
}

export interface NotificationCenterFilters {
  status: 'all' | 'unread' | 'read'
  category: NotificationCategory | 'all'
  priority: NotificationPriority | 'all'
  searchQuery: string
}

export interface NotificationCenterState {
  notifications: EnhancedNotification[]
  groupedNotifications: NotificationGroup[]
  unreadCount: number
  totalCount: number
  isLoading: boolean
  hasMore: boolean
  filters: NotificationCenterFilters
}

export interface QuickAction {
  id: string
  label: string
  variant: 'default' | 'destructive' | 'outline'
  action: string // Action identifier for server
  entityType: string
  entityId: string
}

// Type to category mapping
export const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  approval: 'approvals',
  budget_alert: 'finance',
  status_change: 'operations',
  overdue: 'finance',
  deadline: 'operations',
  system: 'system',
  info: 'system',
  leave_request: 'hr',
  payroll: 'hr',
  payment: 'finance',
  invoice: 'finance',
  jo_update: 'operations',
  pjo_update: 'operations',
}

// Category labels for display
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  finance: 'Finance',
  operations: 'Operations',
  hr: 'Human Resources',
  approvals: 'Approvals',
  system: 'System',
}

// Category icons
export const CATEGORY_ICONS: Record<NotificationCategory, string> = {
  finance: 'DollarSign',
  operations: 'Truck',
  hr: 'Users',
  approvals: 'ClipboardCheck',
  system: 'Settings',
}

// Default filters
export const DEFAULT_FILTERS: NotificationCenterFilters = {
  status: 'all',
  category: 'all',
  priority: 'all',
  searchQuery: '',
}

// Priority order for sorting (higher = more important)
export const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
}
