// Activity Log Utility Functions for v0.13

import { format, isToday, isYesterday, differenceInDays, parseISO } from 'date-fns'
import { ActivityLogEntry } from '@/types/activity-log'

/**
 * Human-readable labels for action types
 */
const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  approved: 'Approved',
  pjo_approved: 'Approved',
  rejected: 'Rejected',
  pjo_rejected: 'Rejected',
  status_changed: 'Status Changed',
  payment_recorded: 'Payment Recorded',
}

/**
 * Human-readable labels for entity types
 */
const ENTITY_LABELS: Record<string, string> = {
  pjo: 'PJO',
  jo: 'Job Order',
  invoice: 'Invoice',
  customer: 'Customer',
  project: 'Project',
  user: 'User',
  system: 'System',
}

/**
 * Route paths for entity types
 */
const ENTITY_ROUTES: Record<string, string> = {
  pjo: '/pjo',
  jo: '/jo',
  invoice: '/invoices',
  customer: '/customers',
  project: '/projects',
}

/**
 * Format action type to human-readable label
 */
export function formatActionType(actionType: string): string {
  return ACTION_LABELS[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Format entity/document type to human-readable label
 */
export function formatEntityType(documentType: string): string {
  return ENTITY_LABELS[documentType] || documentType.toUpperCase()
}

/**
 * Format timestamp to relative time string
 * - "Today HH:mm" for today
 * - "Yesterday HH:mm" for yesterday
 * - "X days ago" for within 7 days
 * - "DD/MM/YYYY" for older dates
 */
export function formatRelativeTime(timestamp: string): string {
  const date = parseISO(timestamp)
  const now = new Date()

  if (isToday(date)) {
    return `Today ${format(date, 'HH:mm')}`
  }

  if (isYesterday(date)) {
    return `Yesterday ${format(date, 'HH:mm')}`
  }

  const daysDiff = differenceInDays(now, date)
  if (daysDiff <= 7) {
    return `${daysDiff} days ago`
  }

  return format(date, 'dd/MM/yyyy')
}

/**
 * Format JSONB details to readable string
 * Handles common patterns like status changes, references, etc.
 */
export function formatDetails(details: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) {
    return '-'
  }

  const parts: string[] = []

  // Handle status changes
  if ('status' in details) {
    if ('previous' in details || 'previous_status' in details) {
      const prev = details.previous || details.previous_status
      parts.push(`status: ${prev} → ${details.status}`)
    } else {
      parts.push(`status: ${details.status}`)
    }
  }

  // Handle PJO reference
  if ('from_pjo' in details) {
    parts.push(`from ${details.from_pjo}`)
  }

  // Handle IP address (for login)
  if ('ip' in details || 'ip_address' in details) {
    const ip = details.ip || details.ip_address
    parts.push(`IP: ${ip}`)
  }

  // Handle amount changes
  if ('amount' in details) {
    parts.push(`amount: ${details.amount}`)
  }

  // Handle reason
  if ('reason' in details) {
    parts.push(`reason: ${details.reason}`)
  }

  // If no specific patterns matched, show raw key-value pairs
  if (parts.length === 0) {
    for (const [key, value] of Object.entries(details)) {
      if (value !== null && value !== undefined) {
        parts.push(`${key}: ${value}`)
      }
    }
  }

  return parts.join(', ') || '-'
}

/**
 * Get navigation URL for an entity
 * Returns null for login/logout/system actions
 */
export function getEntityUrl(documentType: string, documentId: string): string | null {
  const route = ENTITY_ROUTES[documentType]
  if (!route || !documentId) {
    return null
  }
  return `${route}/${documentId}`
}

/**
 * Check if an action type should have a viewable entity link
 */
export function hasViewableEntity(actionType: string, documentType: string): boolean {
  const nonViewableActions = ['login', 'logout']
  const nonViewableEntities = ['user', 'system']
  
  return !nonViewableActions.includes(actionType) && !nonViewableEntities.includes(documentType)
}

/**
 * Export activity logs to CSV and trigger download
 */
export function exportToCsv(logs: ActivityLogEntry[], filename?: string): void {
  const csvFilename = filename || `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
  
  // CSV headers
  const headers = ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity Number', 'Details']
  
  // CSV rows
  const rows = logs.map(log => [
    format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
    log.user_name,
    formatActionType(log.action_type),
    formatEntityType(log.document_type),
    log.document_number || '-',
    formatDetails(log.details),
  ])
  
  // Build CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  
  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', csvFilename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Get date threshold for date range filter
 */
export function getDateThreshold(dateRange: string): Date | null {
  const now = new Date()
  
  switch (dateRange) {
    case 'last7':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'last30':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    case 'last90':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    case 'all':
    default:
      return null
  }
}
