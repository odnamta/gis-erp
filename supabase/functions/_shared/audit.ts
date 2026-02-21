// Audit log helpers for Edge Functions
// Uses service client to bypass RLS (audit_logs is system-level)
// Ported from lib/audit-log.ts

import type { UserProfile } from './auth.ts'

// Minimal Supabase client type to avoid importing the full SDK
// deno-lint-ignore no-explicit-any
type SupabaseClient = any

/**
 * Insert a row into audit_logs using the service client.
 */
export async function logAudit(
  serviceClient: SupabaseClient,
  profile: UserProfile,
  entry: {
    action: string
    module: string
    recordId?: string
    recordType?: string
    recordNumber?: string
    oldValues?: Record<string, unknown>
    newValues?: Record<string, unknown>
    changesSummary?: string
    workflowStatusFrom?: string
    workflowStatusTo?: string
  }
): Promise<void> {
  const { error } = await serviceClient.from('audit_logs').insert({
    user_id: profile.user_id,
    user_name: profile.full_name,
    user_email: profile.email,
    user_role: profile.role,
    action: entry.action,
    module: entry.module,
    record_id: entry.recordId || null,
    record_type: entry.recordType || null,
    record_number: entry.recordNumber || null,
    old_values: entry.oldValues || null,
    new_values: entry.newValues || null,
    changes_summary: entry.changesSummary || null,
    workflow_status_from: entry.workflowStatusFrom || null,
    workflow_status_to: entry.workflowStatusTo || null,
    ip_address: 'edge-function',
    user_agent: 'supabase-edge-function',
  })

  if (error) {
    console.error('Audit log insert failed:', error)
  }
}

/**
 * Log a workflow transition (submit/check/approve/reject).
 */
export async function logWorkflowTransition(
  serviceClient: SupabaseClient,
  profile: UserProfile,
  module: string,
  recordId: string,
  recordType: string,
  recordNumber: string,
  action: 'submit' | 'check' | 'approve' | 'reject',
  fromStatus: string,
  toStatus: string,
  comment?: string
): Promise<void> {
  const actionLabels: Record<string, string> = {
    submit: 'submitted',
    check: 'checked/reviewed',
    approve: 'approved',
    reject: 'rejected',
  }

  await logAudit(serviceClient, profile, {
    action,
    module,
    recordId,
    recordType,
    recordNumber,
    workflowStatusFrom: fromStatus,
    workflowStatusTo: toStatus,
    changesSummary: `${recordType} ${recordNumber} ${actionLabels[action]}${comment ? `: ${comment}` : ''}`,
  })
}
