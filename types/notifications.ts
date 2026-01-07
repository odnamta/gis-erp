// Notification System Types

export type NotificationType =
  | 'approval'
  | 'budget_alert'
  | 'status_change'
  | 'overdue'
  | 'system'
  | 'info'
  | 'deadline'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type EntityType = 'pjo' | 'jo' | 'invoice' | 'user' | 'cost_item' | 'feedback' | 'quotation'

// Json type from database
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType | string
  priority: NotificationPriority | string | null
  entity_type: EntityType | string | null
  entity_id: string | null
  is_read: boolean | null
  read_at: string | null
  action_url: string | null
  metadata: Json | null
  created_at: string | null
  expires_at: string | null
  deleted_at: string | null
}

export interface NotificationPreferences {
  id: string
  user_id: string
  approval_enabled: boolean | null
  budget_alert_enabled: boolean | null
  status_change_enabled: boolean | null
  overdue_enabled: boolean | null
  system_enabled: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface NotificationWithMeta extends Notification {
  relativeTime: string
  icon: string
  iconColor: string
}

// Service types
export interface CreateNotificationParams {
  userId: string
  title: string
  message: string
  type: NotificationType
  priority?: NotificationPriority
  entityType?: EntityType
  entityId?: string
  actionUrl?: string
  expiresAt?: Date
  metadata?: Record<string, unknown>
}

export interface CreateBulkNotificationParams {
  title: string
  message: string
  type: NotificationType
  priority?: NotificationPriority
  entityType?: EntityType
  entityId?: string
  actionUrl?: string
  expiresAt?: Date
  metadata?: Record<string, unknown>
}

export interface NotificationFilters {
  isRead?: boolean
  type?: NotificationType
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface NotificationRecipients {
  userIds?: string[]
  roles?: string[]
}
