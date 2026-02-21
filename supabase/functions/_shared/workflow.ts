// Workflow types and pure logic — ported from types/workflow.ts + lib/workflow-service.ts
// Maker-Checker-Approver pattern for PJO, JO, BKK documents

import type { UserRole } from './auth.ts'

// =====================================================
// TYPES
// =====================================================

export type WorkflowStatus =
  | 'draft'
  | 'pending_check'
  | 'checked'
  | 'approved'
  | 'rejected'

export type WorkflowAction =
  | 'submit'
  | 'check'
  | 'approve'
  | 'reject'

export type WorkflowDocumentType = 'pjo' | 'jo' | 'bkk'

export interface WorkflowTransition {
  from: WorkflowStatus
  to: WorkflowStatus
  allowedRoles: UserRole[]
  action: WorkflowAction
}

// =====================================================
// WORKFLOW DEFINITIONS
// =====================================================

export const PJO_WORKFLOW: WorkflowTransition[] = [
  { from: 'draft', to: 'pending_check', allowedRoles: ['administration', 'finance_manager', 'director', 'owner'], action: 'submit' },
  { from: 'pending_check', to: 'checked', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'check' },
  { from: 'checked', to: 'approved', allowedRoles: ['director', 'owner'], action: 'approve' },
  { from: 'pending_check', to: 'rejected', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'reject' },
  { from: 'checked', to: 'rejected', allowedRoles: ['director', 'owner'], action: 'reject' },
]

export const JO_WORKFLOW: WorkflowTransition[] = [
  { from: 'draft', to: 'pending_check', allowedRoles: ['administration', 'finance_manager', 'director', 'owner'], action: 'submit' },
  { from: 'pending_check', to: 'checked', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'check' },
  { from: 'checked', to: 'approved', allowedRoles: ['director', 'owner'], action: 'approve' },
  { from: 'pending_check', to: 'rejected', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'reject' },
  { from: 'checked', to: 'rejected', allowedRoles: ['director', 'owner'], action: 'reject' },
]

export const BKK_WORKFLOW: WorkflowTransition[] = [
  { from: 'draft', to: 'pending_check', allowedRoles: ['administration', 'finance', 'finance_manager', 'director', 'owner'], action: 'submit' },
  { from: 'pending_check', to: 'checked', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'check' },
  { from: 'checked', to: 'approved', allowedRoles: ['director', 'owner'], action: 'approve' },
  { from: 'pending_check', to: 'rejected', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'reject' },
  { from: 'checked', to: 'rejected', allowedRoles: ['director', 'owner'], action: 'reject' },
]

// =====================================================
// PURE FUNCTIONS
// =====================================================

export function getWorkflowTransitions(documentType: WorkflowDocumentType): WorkflowTransition[] {
  switch (documentType) {
    case 'pjo': return PJO_WORKFLOW
    case 'jo': return JO_WORKFLOW
    case 'bkk': return BKK_WORKFLOW
    default: return []
  }
}

export function canTransition(
  documentType: WorkflowDocumentType,
  fromStatus: WorkflowStatus,
  toStatus: WorkflowStatus,
  userRole: UserRole
): boolean {
  const transitions = getWorkflowTransitions(documentType)
  return transitions.some(
    t => t.from === fromStatus && t.to === toStatus && t.allowedRoles.includes(userRole)
  )
}

export function getAvailableActions(
  documentType: WorkflowDocumentType,
  currentStatus: WorkflowStatus,
  userRole: UserRole
): WorkflowAction[] {
  const transitions = getWorkflowTransitions(documentType)
  return transitions
    .filter(t => t.from === currentStatus && t.allowedRoles.includes(userRole))
    .map(t => t.action)
}

/**
 * Determine target status based on action and current status.
 * Returns null if the action is not valid from the current status.
 */
export function getTargetStatus(
  action: WorkflowAction,
  currentStatus: WorkflowStatus
): WorkflowStatus | null {
  const actionTargets: Record<WorkflowAction, Partial<Record<WorkflowStatus, WorkflowStatus>>> = {
    submit: { draft: 'pending_check' },
    check: { pending_check: 'checked' },
    approve: { checked: 'approved' },
    reject: { draft: 'rejected', pending_check: 'rejected', checked: 'rejected' },
  }
  return actionTargets[action]?.[currentStatus] ?? null
}

/**
 * Map existing DB status strings to WorkflowStatus.
 * PJO uses 'pending_approval' for pending_check, JO uses 'pending_check' directly.
 */
export function mapToWorkflowStatus(status: string): WorkflowStatus {
  const statusMap: Record<string, WorkflowStatus> = {
    draft: 'draft',
    pending_approval: 'pending_check',
    pending_check: 'pending_check',
    checked: 'checked',
    approved: 'approved',
    rejected: 'rejected',
    active: 'approved',
    completed: 'approved',
  }
  return statusMap[status] || 'draft'
}

/**
 * Map WorkflowStatus back to document-specific DB status.
 * PJO: pending_check → 'pending_approval', approved → 'approved'
 * JO:  pending_check → 'pending_check', approved → 'active'
 */
export function mapFromWorkflowStatus(
  workflowStatus: WorkflowStatus,
  documentType: WorkflowDocumentType
): string {
  if (documentType === 'pjo') {
    const map: Record<WorkflowStatus, string> = {
      draft: 'draft',
      pending_check: 'pending_approval',
      checked: 'checked',
      approved: 'approved',
      rejected: 'rejected',
    }
    return map[workflowStatus] || 'draft'
  }

  if (documentType === 'jo') {
    const map: Record<WorkflowStatus, string> = {
      draft: 'draft',
      pending_check: 'pending_check',
      checked: 'checked',
      approved: 'active',
      rejected: 'rejected',
    }
    return map[workflowStatus] || 'draft'
  }

  // BKK uses workflow_status directly
  return workflowStatus
}
