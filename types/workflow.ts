// Workflow Types - Maker-Checker-Approver Pattern

import { UserRole } from './permissions'

/**
 * Workflow status for documents requiring approval
 */
export type WorkflowStatus = 
  | 'draft'          // Created by Maker
  | 'pending_check'  // Submitted for checking
  | 'checked'        // Reviewed by Checker (Manager)
  | 'approved'       // Approved by Approver (Director/Owner)
  | 'rejected'       // Rejected at any stage

/**
 * Workflow actions
 */
export type WorkflowAction = 
  | 'submit'     // Submit for review
  | 'check'      // Manager reviews/checks
  | 'approve'    // Director/Owner approves
  | 'reject'     // Reject at any stage

/**
 * Workflow transition definition
 */
export interface WorkflowTransition {
  from: WorkflowStatus
  to: WorkflowStatus
  allowedRoles: UserRole[]
  action: WorkflowAction
}

/**
 * PJO Workflow Transitions
 * Maker: administration
 * Checker: finance_manager (Feri)
 * Approver: director, owner
 */
export const PJO_WORKFLOW: WorkflowTransition[] = [
  // Submit for checking (maker submits)
  { from: 'draft', to: 'pending_check', allowedRoles: ['administration', 'finance_manager', 'director', 'owner'], action: 'submit' },
  // Check (manager reviews)
  { from: 'pending_check', to: 'checked', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'check' },
  // Approve after checking
  { from: 'checked', to: 'approved', allowedRoles: ['director', 'owner'], action: 'approve' },
  // Reject from pending_check state
  { from: 'pending_check', to: 'rejected', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'reject' },
  // Reject from checked state
  { from: 'checked', to: 'rejected', allowedRoles: ['director', 'owner'], action: 'reject' },
]

/**
 * JO Workflow Transitions (after costs collected)
 * Maker: administration
 * Checker: finance_manager (Feri)
 * Approver: director, owner
 */
export const JO_WORKFLOW: WorkflowTransition[] = [
  { from: 'draft', to: 'pending_check', allowedRoles: ['administration', 'finance_manager', 'director', 'owner'], action: 'submit' },
  { from: 'pending_check', to: 'checked', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'check' },
  { from: 'checked', to: 'approved', allowedRoles: ['director', 'owner'], action: 'approve' },
  { from: 'pending_check', to: 'rejected', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'reject' },
  { from: 'checked', to: 'rejected', allowedRoles: ['director', 'owner'], action: 'reject' },
]

/**
 * BKK (Disbursement) Workflow Transitions
 * Maker: administration, finance
 * Checker: finance_manager (Feri)
 * Approver: director, owner
 */
export const BKK_WORKFLOW: WorkflowTransition[] = [
  { from: 'draft', to: 'pending_check', allowedRoles: ['administration', 'finance', 'finance_manager', 'director', 'owner'], action: 'submit' },
  { from: 'pending_check', to: 'checked', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'check' },
  { from: 'checked', to: 'approved', allowedRoles: ['director', 'owner'], action: 'approve' },
  { from: 'pending_check', to: 'rejected', allowedRoles: ['finance_manager', 'director', 'owner'], action: 'reject' },
  { from: 'checked', to: 'rejected', allowedRoles: ['director', 'owner'], action: 'reject' },
]

/**
 * Workflow document types
 */
export type WorkflowDocumentType = 'pjo' | 'jo' | 'bkk'

/**
 * Get workflow transitions for a document type
 */
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

/**
 * Check if a transition is allowed for a role
 */
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

/**
 * Get available actions for a role on a document
 */
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
 * Workflow history entry
 */
export interface WorkflowHistoryEntry {
  id: string
  documentId: string
  documentType: WorkflowDocumentType
  action: WorkflowAction
  fromStatus: WorkflowStatus
  toStatus: WorkflowStatus
  userId: string
  userName: string
  userRole: UserRole
  comment?: string
  createdAt: string
}
