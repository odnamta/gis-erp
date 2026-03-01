import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import { NotificationType, NotificationPriority } from '@/types/notifications'

/**
 * Format a timestamp as relative time
 * e.g., "2 min ago", "1 hour ago", "Yesterday", "Dec 15"
 */
export function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()

  // If within the last hour, show minutes
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) {
    return 'Just now'
  }

  if (diffMins < 60) {
    return `${diffMins} min ago`
  }

  // If within the last 24 hours, show hours
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24 && isToday(date)) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  }

  // If yesterday
  if (isYesterday(date)) {
    return 'Yesterday'
  }

  // If within the last week
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  // Otherwise show date
  return format(date, 'MMM d')
}

/**
 * Get the icon name for a notification type
 */
export function getNotificationIcon(type: NotificationType | string | null): string {
  switch (type) {
    case 'approval':
      return 'ClipboardCheck'
    case 'budget_alert':
      return 'AlertTriangle'
    case 'status_change':
      return 'RefreshCw'
    case 'overdue':
      return 'Clock'
    case 'deadline':
      return 'CalendarClock'
    case 'system':
      return 'Info'
    case 'info':
      return 'Bell'
    default:
      return 'Bell'
  }
}

/**
 * Get the icon color for a notification based on type and priority
 */
export function getNotificationIconColor(
  type: NotificationType | string | null,
  priority: NotificationPriority | string | null
): string {
  // Urgent priority always gets red
  if (priority === 'urgent') {
    return 'text-red-500'
  }

  switch (type) {
    case 'approval':
      return 'text-blue-500'
    case 'budget_alert':
      return 'text-orange-500'
    case 'status_change':
      return 'text-green-500'
    case 'overdue':
      return 'text-red-500'
    case 'deadline':
      return 'text-amber-500'
    case 'system':
      return 'text-gray-500'
    case 'info':
      return 'text-blue-400'
    default:
      return 'text-gray-500'
  }
}

/**
 * Format badge count for display
 * Returns "99+" for counts over 99
 */
export function formatBadgeCount(count: number): string {
  if (count <= 0) {
    return ''
  }
  if (count > 99) {
    return '99+'
  }
  return count.toString()
}

/**
 * Get notification type display name
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'approval':
      return 'Approval'
    case 'budget_alert':
      return 'Budget Alert'
    case 'status_change':
      return 'Status Change'
    case 'overdue':
      return 'Overdue'
    case 'deadline':
      return 'Deadline'
    case 'system':
      return 'System'
    case 'info':
      return 'Info'
    default:
      return 'Notification'
  }
}

/**
 * Get priority display name
 */
export function getPriorityLabel(priority: NotificationPriority): string {
  switch (priority) {
    case 'urgent':
      return 'Urgent'
    case 'high':
      return 'High'
    case 'normal':
      return 'Normal'
    case 'low':
      return 'Low'
    default:
      return 'Normal'
  }
}

/**
 * Check if notification should show pulsing indicator
 */
export function shouldPulse(priority: NotificationPriority | string | null): boolean {
  return priority === 'urgent'
}

/**
 * Truncate message for preview
 */
export function truncateMessage(message: string, maxLength: number = 100): string {
  if (message.length <= maxLength) {
    return message
  }
  return message.substring(0, maxLength - 3) + '...'
}
