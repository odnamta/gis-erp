// Workflow Types - Maker-Checker-Approver Pattern
// Inlined from @gama/erp-core/workflow/types (core pkg not available on Vercel)

import { UserRole } from './permissions'

export type WorkflowStatus = 'draft' | 'pending_check' | 'checked' | 'approved' | 'rejected'
export type WorkflowAction = 'submit' | 'check' | 'approve' | 'reject'

export interface WorkflowTransition {
  from: WorkflowStatus
  to: WorkflowStatus
  allowedRoles: UserRole[]
  action: WorkflowAction
}

export interface WorkflowHistoryEntry {
  id: string
  documentId: string
  documentType: string
  action: WorkflowAction
  fromStatus: WorkflowStatus
  toStatus: WorkflowStatus
  userId: string
  userName: string
  userRole: UserRole
  comment?: string
  createdAt: string
}

// =====================================================
// GIS-SPECIFIC WORKFLOW DEFINITIONS
// =====================================================

/**
 * GIS document types: PJO, JO, BKK
 */
export type WorkflowDocumentType = 'pjo' | 'jo' | 'bkk'

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

export function getWorkflowTransitions(documentType: WorkflowDocumentType): WorkflowTransition[] {
  switch (documentType) {
    case 'pjo':
      return PJO_WORKFLOW
    case 'jo':
      return JO_WORKFLOW
    case 'bkk':
      return BKK_WORKFLOW
    default:
      return []
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
