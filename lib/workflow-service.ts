// Workflow Service - Maker-Checker-Approver Pattern Implementation
// Note: Some TypeScript errors are expected until the database migration is applied

import { createClient } from '@/lib/supabase/server'
import { UserProfile, UserRole } from '@/types/permissions'
import { 
  WorkflowStatus, 
  WorkflowAction, 
  WorkflowDocumentType,
  getWorkflowTransitions,
  canTransition,
  getAvailableActions 
} from '@/types/workflow'
import { logWorkflowTransition } from '@/lib/audit-log'

export interface WorkflowTransitionResult {
  success: boolean
  error?: string
  newStatus?: WorkflowStatus
}

// Type for raw database response
interface RawDocumentData {
  id: string
  status?: string
  workflow_status?: string
  pjo_number?: string
  jo_number?: string
  bkk_number?: string
  checked_by?: string
  checked_at?: string
  approved_by?: string
  approved_at?: string
  rejected_by?: string
  rejected_at?: string
  rejection_reason?: string
  created_at?: string
}

/**
 * Perform a workflow transition on a document
 */
export async function performWorkflowTransition(
  documentType: WorkflowDocumentType,
  documentId: string,
  action: WorkflowAction,
  profile: UserProfile,
  comment?: string
): Promise<WorkflowTransitionResult> {
  const supabase = await createClient()
  
  // Get current document status based on document type
  let currentStatus: WorkflowStatus = 'draft'
  let documentNumber: string = documentId
  
  if (documentType === 'pjo') {
    const { data, error } = await supabase
      .from('proforma_job_orders')
      .select('id, status, pjo_number')
      .eq('id', documentId)
      .single()
    
    if (error || !data) {
      return { success: false, error: 'Document not found' }
    }
    
    // Map existing status to workflow status
    currentStatus = mapToWorkflowStatus(data.status)
    documentNumber = data.pjo_number || documentId
  } else if (documentType === 'jo') {
    const { data, error } = await supabase
      .from('job_orders')
      .select('id, status, jo_number')
      .eq('id', documentId)
      .single()
    
    if (error || !data) {
      return { success: false, error: 'Document not found' }
    }
    
    currentStatus = mapToWorkflowStatus(data.status)
    documentNumber = data.jo_number || documentId
  } else if (documentType === 'bkk') {
    // BKK uses disbursements table (or bukti_kas_keluar) with workflow_status column
    // Using type assertion since table may not exist in types yet
    const { data, error } = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: RawDocumentData | null; error: Error | null }> } } } })
      .from('bukti_kas_keluar')
      .select('id, workflow_status, bkk_number')
      .eq('id', documentId)
      .single()
    
    if (error || !data) {
      return { success: false, error: 'Document not found' }
    }
    
    currentStatus = (data.workflow_status || 'draft') as WorkflowStatus
    documentNumber = data.bkk_number || documentId
  }
  
  // Determine target status based on action
  const targetStatus = getTargetStatus(action, currentStatus)
  
  if (!targetStatus) {
    return { success: false, error: `Invalid action ${action} for current status` }
  }
  
  // Check if transition is allowed
  if (!canTransition(documentType, currentStatus, targetStatus, profile.role)) {
    return { 
      success: false, 
      error: `You don't have permission to ${action} this document` 
    }
  }
  
  // Prepare update data
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  
  // Add workflow metadata based on action
  if (action === 'submit') {
    updateData.submitted_by = profile.id
    updateData.submitted_at = new Date().toISOString()
  } else if (action === 'check') {
    updateData.checked_by = profile.id
    updateData.checked_at = new Date().toISOString()
  } else if (action === 'approve') {
    updateData.approved_by = profile.id
    updateData.approved_at = new Date().toISOString()
  } else if (action === 'reject') {
    updateData.rejected_by = profile.id
    updateData.rejected_at = new Date().toISOString()
    if (comment) {
      updateData.rejection_reason = comment
    }
  }
  
  // Update status field based on document type
  if (documentType === 'bkk') {
    updateData.workflow_status = targetStatus
    
    const { error } = await (supabase as unknown as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: Error | null }> } } })
      .from('bukti_kas_keluar')
      .update(updateData)
      .eq('id', documentId)
    
    if (error) {
      return { success: false, error: String(error) }
    }
  } else if (documentType === 'pjo') {
    // Map workflow status back to PJO status
    updateData.status = mapFromWorkflowStatus(targetStatus, 'pjo')
    
    const { error } = await supabase
      .from('proforma_job_orders')
      .update(updateData)
      .eq('id', documentId)
    
    if (error) {
      return { success: false, error: error.message }
    }
  } else if (documentType === 'jo') {
    // Map workflow status back to JO status
    updateData.status = mapFromWorkflowStatus(targetStatus, 'jo')
    
    const { error } = await supabase
      .from('job_orders')
      .update(updateData)
      .eq('id', documentId)
    
    if (error) {
      return { success: false, error: error.message }
    }
  }
  
  // Log the workflow transition
  await logWorkflowTransition(
    profile,
    documentType,
    documentId,
    documentType.toUpperCase(),
    documentNumber,
    action,
    currentStatus,
    targetStatus,
    comment
  )
  
  return { success: true, newStatus: targetStatus }
}

/**
 * Map existing status to workflow status
 */
function mapToWorkflowStatus(status: string): WorkflowStatus {
  const statusMap: Record<string, WorkflowStatus> = {
    'draft': 'draft',
    'pending_approval': 'pending_check',
    'pending_check': 'pending_check',
    'checked': 'checked',
    'approved': 'approved',
    'rejected': 'rejected',
    'active': 'approved',
    'completed': 'approved',
  }
  return statusMap[status] || 'draft'
}

/**
 * Map workflow status back to document-specific status
 */
function mapFromWorkflowStatus(workflowStatus: WorkflowStatus, documentType: WorkflowDocumentType): string {
  if (documentType === 'pjo') {
    const statusMap: Record<WorkflowStatus, string> = {
      'draft': 'draft',
      'pending_check': 'pending_approval',
      'checked': 'checked',
      'approved': 'approved',
      'rejected': 'rejected',
    }
    return statusMap[workflowStatus] || 'draft'
  }
  
  if (documentType === 'jo') {
    const statusMap: Record<WorkflowStatus, string> = {
      'draft': 'draft',
      'pending_check': 'pending_check',
      'checked': 'checked',
      'approved': 'active',
      'rejected': 'rejected',
    }
    return statusMap[workflowStatus] || 'draft'
  }
  
  return workflowStatus
}

/**
 * Get target status based on action
 */
function getTargetStatus(action: WorkflowAction, currentStatus: WorkflowStatus): WorkflowStatus | null {
  const actionTargets: Record<WorkflowAction, Record<WorkflowStatus, WorkflowStatus | null>> = {
    submit: {
      draft: 'pending_check',
      pending_check: null,
      checked: null,
      approved: null,
      rejected: null,
    },
    check: {
      draft: null,
      pending_check: 'checked',
      checked: null,
      approved: null,
      rejected: null,
    },
    approve: {
      draft: null,
      pending_check: null,
      checked: 'approved',
      approved: null,
      rejected: null,
    },
    reject: {
      draft: 'rejected',
      pending_check: 'rejected',
      checked: 'rejected',
      approved: null,
      rejected: null,
    },
  }
  
  return actionTargets[action]?.[currentStatus] || null
}

/**
 * Check a document (Manager action)
 */
export async function checkDocument(
  documentType: WorkflowDocumentType,
  documentId: string,
  profile: UserProfile,
  comment?: string
): Promise<WorkflowTransitionResult> {
  return performWorkflowTransition(documentType, documentId, 'check', profile, comment)
}

/**
 * Approve a document (Director/Owner action)
 */
export async function approveDocument(
  documentType: WorkflowDocumentType,
  documentId: string,
  profile: UserProfile,
  comment?: string
): Promise<WorkflowTransitionResult> {
  return performWorkflowTransition(documentType, documentId, 'approve', profile, comment)
}

/**
 * Reject a document
 */
export async function rejectDocument(
  documentType: WorkflowDocumentType,
  documentId: string,
  profile: UserProfile,
  reason: string
): Promise<WorkflowTransitionResult> {
  if (!reason) {
    return { success: false, error: 'Rejection reason is required' }
  }
  return performWorkflowTransition(documentType, documentId, 'reject', profile, reason)
}

/**
 * Get workflow status and available actions for a document
 */
export async function getWorkflowStatus(
  documentType: WorkflowDocumentType,
  documentId: string,
  userRole: UserRole
): Promise<{
  currentStatus: WorkflowStatus
  availableActions: WorkflowAction[]
  checkedBy?: string
  checkedAt?: string
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
}> {
  const supabase = await createClient()
  
  let currentStatus: WorkflowStatus = 'draft'
  let workflowData: RawDocumentData = { id: documentId }
  
  if (documentType === 'pjo') {
    const { data } = await supabase
      .from('proforma_job_orders')
      .select('id, status')
      .eq('id', documentId)
      .single()
    
    if (data) {
      currentStatus = mapToWorkflowStatus(data.status)
      workflowData = data as unknown as RawDocumentData
    }
  } else if (documentType === 'jo') {
    const { data } = await supabase
      .from('job_orders')
      .select('id, status')
      .eq('id', documentId)
      .single()
    
    if (data) {
      currentStatus = mapToWorkflowStatus(data.status)
      workflowData = data as unknown as RawDocumentData
    }
  } else if (documentType === 'bkk') {
    const { data } = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: RawDocumentData | null }> } } } })
      .from('bukti_kas_keluar')
      .select('id, workflow_status, checked_by, checked_at, approved_by, approved_at, rejected_by, rejected_at, rejection_reason')
      .eq('id', documentId)
      .single()
    
    if (data) {
      currentStatus = (data.workflow_status || 'draft') as WorkflowStatus
      workflowData = data
    }
  }
  
  const availableActions = getAvailableActions(documentType, currentStatus, userRole)
  
  return {
    currentStatus,
    availableActions,
    checkedBy: workflowData.checked_by,
    checkedAt: workflowData.checked_at,
    approvedBy: workflowData.approved_by,
    approvedAt: workflowData.approved_at,
    rejectedBy: workflowData.rejected_by,
    rejectedAt: workflowData.rejected_at,
    rejectionReason: workflowData.rejection_reason,
  }
}

/**
 * Get documents pending action for a user role
 */
export async function getPendingDocuments(
  documentType: WorkflowDocumentType,
  userRole: UserRole,
  limit: number = 10
): Promise<Array<{
  id: string
  documentNumber: string
  status: WorkflowStatus
  createdAt: string
  availableActions: WorkflowAction[]
}>> {
  const supabase = await createClient()
  
  // Determine which statuses this role can act on
  const transitions = getWorkflowTransitions(documentType)
  const actionableStatuses = [...new Set(
    transitions
      .filter(t => t.allowedRoles.includes(userRole))
      .map(t => t.from)
  )]
  
  if (actionableStatuses.length === 0) {
    return []
  }
  
  const results: Array<{
    id: string
    documentNumber: string
    status: WorkflowStatus
    createdAt: string
    availableActions: WorkflowAction[]
  }> = []
  
  if (documentType === 'pjo') {
    // Map workflow statuses to PJO statuses
    const pjoStatuses = actionableStatuses.map(s => mapFromWorkflowStatus(s, 'pjo'))
    
    const { data } = await supabase
      .from('proforma_job_orders')
      .select('id, pjo_number, status, created_at')
      .in('status', pjoStatuses)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (data) {
      for (const doc of data) {
        const workflowStatus = mapToWorkflowStatus(doc.status)
        results.push({
          id: doc.id,
          documentNumber: doc.pjo_number || doc.id,
          status: workflowStatus,
          createdAt: doc.created_at || '',
          availableActions: getAvailableActions(documentType, workflowStatus, userRole),
        })
      }
    }
  } else if (documentType === 'jo') {
    const joStatuses = actionableStatuses.map(s => mapFromWorkflowStatus(s, 'jo'))
    
    const { data } = await supabase
      .from('job_orders')
      .select('id, jo_number, status, created_at')
      .in('status', joStatuses)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (data) {
      for (const doc of data) {
        const workflowStatus = mapToWorkflowStatus(doc.status)
        results.push({
          id: doc.id,
          documentNumber: doc.jo_number || doc.id,
          status: workflowStatus,
          createdAt: doc.created_at || '',
          availableActions: getAvailableActions(documentType, workflowStatus, userRole),
        })
      }
    }
  } else if (documentType === 'bkk') {
    const { data } = await (supabase as unknown as { from: (table: string) => { select: (cols: string) => { in: (col: string, vals: string[]) => { order: (col: string, opts: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: RawDocumentData[] | null }> } } } } })
      .from('bukti_kas_keluar')
      .select('id, bkk_number, workflow_status, created_at')
      .in('workflow_status', actionableStatuses)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (data) {
      for (const doc of data) {
        const workflowStatus = (doc.workflow_status || 'draft') as WorkflowStatus
        results.push({
          id: doc.id,
          documentNumber: doc.bkk_number || doc.id,
          status: workflowStatus,
          createdAt: doc.created_at || '',
          availableActions: getAvailableActions(documentType, workflowStatus, userRole),
        })
      }
    }
  }
  
  return results
}
