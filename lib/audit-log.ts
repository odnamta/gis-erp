// Audit Log Service - Comprehensive audit trail for all system actions

import { createClient } from '@/lib/supabase/server'
import { UserProfile, UserRole } from '@/types/permissions'
import { AuditLogEntry, AuditAction, AuditLogFilter, AuditLogQueryResult } from '@/types/audit'
import { Database, Json } from '@/types/database'

/**
 * Log an action to the audit trail
 */
export async function logAudit(
  entry: Omit<AuditLogEntry, 'id' | 'createdAt'>,
  request?: Request
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Extract IP and user agent from request if available
    const ipAddress = request?.headers.get('x-forwarded-for')?.split(',')[0] || 
                      request?.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request?.headers.get('user-agent') || 'unknown'
    
    const { error } = await supabase.from('audit_logs').insert({
      user_id: entry.userId,
      user_name: entry.userName,
      user_email: entry.userEmail,
      user_role: entry.userRole,
      action: entry.action,
      module: entry.module,
      record_id: entry.recordId || null,
      record_type: entry.recordType || null,
      record_number: entry.recordNumber || null,
      old_values: entry.oldValues as Json || null,
      new_values: entry.newValues as Json || null,
      changes_summary: entry.changesSummary || null,
      workflow_status_from: entry.workflowStatusFrom || null,
      workflow_status_to: entry.workflowStatusTo || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      session_id: entry.sessionId || null,
    } as Database['public']['Tables']['audit_logs']['Insert'])
    
    if (error) {
      console.error('Failed to log audit entry:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (err) {
    console.error('Audit log error:', err)
    return { success: false, error: 'Failed to create audit log' }
  }
}

/**
 * Create an audit entry from a user profile
 */
export function createAuditEntry(
  profile: UserProfile,
  action: AuditAction,
  module: string,
  details: Partial<Omit<AuditLogEntry, 'userId' | 'userName' | 'userEmail' | 'userRole' | 'action' | 'module'>> = {}
): Omit<AuditLogEntry, 'id' | 'createdAt'> {
  return {
    userId: profile.id,
    userName: profile.full_name || 'Unknown',
    userEmail: profile.email,
    userRole: profile.role,
    action,
    module,
    ...details,
  }
}

/**
 * Log a create action
 */
export async function logCreate(
  profile: UserProfile,
  module: string,
  recordId: string,
  recordType: string,
  recordNumber: string,
  newValues?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAudit(
    createAuditEntry(profile, 'create', module, {
      recordId,
      recordType,
      recordNumber,
      newValues,
      changesSummary: `Created ${recordType} ${recordNumber}`,
    }),
    request
  )
}

/**
 * Log an update action
 */
export async function logUpdate(
  profile: UserProfile,
  module: string,
  recordId: string,
  recordType: string,
  recordNumber: string,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>,
  request?: Request
): Promise<void> {
  // Calculate changes summary
  const changes: string[] = []
  for (const key of Object.keys(newValues)) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changes.push(key)
    }
  }
  
  await logAudit(
    createAuditEntry(profile, 'update', module, {
      recordId,
      recordType,
      recordNumber,
      oldValues,
      newValues,
      changesSummary: `Updated ${recordType} ${recordNumber}: ${changes.join(', ')}`,
    }),
    request
  )
}

/**
 * Log a delete action
 */
export async function logDelete(
  profile: UserProfile,
  module: string,
  recordId: string,
  recordType: string,
  recordNumber: string,
  oldValues?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await logAudit(
    createAuditEntry(profile, 'delete', module, {
      recordId,
      recordType,
      recordNumber,
      oldValues,
      changesSummary: `Deleted ${recordType} ${recordNumber}`,
    }),
    request
  )
}

/**
 * Log a workflow transition
 */
export async function logWorkflowTransition(
  profile: UserProfile,
  module: string,
  recordId: string,
  recordType: string,
  recordNumber: string,
  action: 'submit' | 'check' | 'approve' | 'reject',
  fromStatus: string,
  toStatus: string,
  comment?: string,
  request?: Request
): Promise<void> {
  const actionLabels: Record<string, string> = {
    submit: 'submitted',
    check: 'checked/reviewed',
    approve: 'approved',
    reject: 'rejected',
  }
  
  await logAudit(
    createAuditEntry(profile, action, module, {
      recordId,
      recordType,
      recordNumber,
      workflowStatusFrom: fromStatus,
      workflowStatusTo: toStatus,
      changesSummary: `${recordType} ${recordNumber} ${actionLabels[action]}${comment ? `: ${comment}` : ''}`,
    }),
    request
  )
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(
  filter: AuditLogFilter
): Promise<AuditLogQueryResult> {
  const supabase = await createClient()
  
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
  
  // Apply filters
  if (filter.userId) {
    query = query.eq('user_id', filter.userId)
  }
  if (filter.recordId) {
    query = query.eq('record_id', filter.recordId)
  }
  if (filter.module) {
    query = query.eq('module', filter.module)
  }
  if (filter.action) {
    query = query.eq('action', filter.action)
  }
  if (filter.startDate) {
    query = query.gte('created_at', filter.startDate)
  }
  if (filter.endDate) {
    query = query.lte('created_at', filter.endDate)
  }
  
  // Pagination
  const limit = filter.limit || 50
  const offset = filter.offset || 0
  
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  const { data, error, count } = await query
  
  if (error) {
    console.error('Failed to query audit logs:', error)
    return { logs: [], total: 0, hasMore: false }
  }
  
  const logs: AuditLogEntry[] = ((data || []) as Array<Record<string, unknown>>).map(row => ({
    id: row.id as string,
    userId: row.user_id as string,
    userName: row.user_name as string,
    userEmail: row.user_email as string,
    userRole: row.user_role as UserRole,
    action: row.action as AuditAction,
    module: row.module as string,
    recordId: row.record_id as string | undefined,
    recordType: row.record_type as string | undefined,
    recordNumber: row.record_number as string | undefined,
    oldValues: row.old_values as Record<string, unknown> | undefined,
    newValues: row.new_values as Record<string, unknown> | undefined,
    changesSummary: row.changes_summary as string | undefined,
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
    sessionId: row.session_id as string | undefined,
    workflowStatusFrom: row.workflow_status_from as string | undefined,
    workflowStatusTo: row.workflow_status_to as string | undefined,
    createdAt: row.created_at as string | undefined,
  }))
  
  return {
    logs,
    total: count || 0,
    hasMore: (count || 0) > offset + limit,
  }
}

/**
 * Get audit history for a specific record
 */
export async function getRecordHistory(
  recordId: string
): Promise<AuditLogEntry[]> {
  const result = await queryAuditLogs({
    recordId,
    limit: 100,
  })
  return result.logs
}

/**
 * Get recent actions by a user
 */
export async function getUserActions(
  userId: string,
  limit: number = 20
): Promise<AuditLogEntry[]> {
  const result = await queryAuditLogs({
    userId,
    limit,
  })
  return result.logs
}
