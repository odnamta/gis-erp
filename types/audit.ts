// Audit Trail Types & HSE Audit/Inspection Types

import { UserRole } from './permissions'

// =====================================================
// AUDIT TRAIL TYPES (for logging user actions)
// =====================================================

/**
 * Audit action types
 */
export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'export'
  | 'submit'
  | 'check'      // Manager reviews
  | 'approve'    // Director/Owner approves
  | 'reject'
  | 'cancel'
  | 'login'
  | 'logout'
  | 'role_change'
  | 'permission_change'

// =====================================================
// HSE AUDIT & INSPECTION TYPES
// =====================================================

/**
 * Audit status types
 */
export type AuditStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

/**
 * Audit statuses constant
 */
export const AUDIT_STATUSES: AuditStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled']

/**
 * Audit categories for HSE
 */
export const AUDIT_CATEGORIES = [
  'safety_audit',
  'workplace_inspection',
  'vehicle_inspection',
  'equipment_inspection',
  'environmental_audit',
] as const

export type AuditCategory = typeof AUDIT_CATEGORIES[number]

/**
 * Audit rating types
 */
export type AuditRating = 'pass' | 'conditional_pass' | 'fail'

/**
 * Checklist item types
 */
export const CHECKLIST_ITEM_TYPES = [
  'yes_no',
  'rating',
  'text',
  'select',
] as const

export type ChecklistItemType = typeof CHECKLIST_ITEM_TYPES[number]

/**
 * Finding severities
 */
export const FINDING_SEVERITIES = [
  'critical',
  'major',
  'minor',
  'observation',
] as const

export type FindingSeverity = typeof FINDING_SEVERITIES[number]

/**
 * Risk levels
 */
export const RISK_LEVELS = [
  'high',
  'medium',
  'low',
] as const

export type RiskLevel = typeof RISK_LEVELS[number]

/**
 * Finding statuses
 */
export const FINDING_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'verified',
  'closed',
] as const

export type FindingStatus = typeof FINDING_STATUSES[number]

/**
 * Score thresholds for audit scoring
 */
export const SCORE_THRESHOLDS = {
  pass: 80,
  conditional_pass: 60,
  fail: 0,
} as const

/**
 * Days before due date to consider "due soon"
 */
export const DUE_SOON_DAYS = 7

// =====================================================
// HSE AUDIT INTERFACES
// =====================================================

/**
 * Checklist item for audit templates
 */
export interface ChecklistItem {
  question: string
  type: ChecklistItemType
  weight: number
  required: boolean
  options?: string[]
}

/**
 * Checklist section containing items
 */
export interface ChecklistSection {
  name: string
  items: ChecklistItem[]
}

/**
 * Checklist template structure
 */
export interface ChecklistTemplate {
  sections: ChecklistSection[]
}

/**
 * Checklist response during audit
 */
export interface ChecklistResponse {
  section: string
  item_index: number
  response: boolean | string | number | null
  notes?: string | null
  question?: string
  finding_created?: boolean
}

/**
 * Audit type definition
 */
export interface AuditType {
  id: string
  type_code: string
  type_name: string
  description: string | null
  category: AuditCategory
  frequency_days: number | null
  checklist_template: ChecklistTemplate
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Audit record
 */
export interface Audit {
  id: string
  audit_number?: string
  audit_type_id: string
  scheduled_date: string | null
  conducted_date: string | null
  location: string | null
  department_id: string | null
  asset_id: string | null
  job_order_id: string | null
  auditor_id: string | null
  auditor_name: string | null
  checklist_responses: ChecklistResponse[]
  overall_score: number | null
  overall_rating: AuditRating | null
  summary: string | null
  photos: string[]
  documents: string[]
  critical_findings: number
  major_findings: number
  minor_findings: number
  observations: number
  status: AuditStatus
  created_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  // Relations
  audit_types?: AuditType
  audit_findings?: AuditFinding[]
}

/**
 * Audit finding record
 */
export interface AuditFinding {
  id: string
  audit_id: string
  finding_number: number
  severity: FindingSeverity
  category: string | null
  finding_description: string
  location_detail: string | null
  photos: string[]
  risk_level: RiskLevel | null
  potential_consequence: string | null
  corrective_action: string | null
  responsible_id: string | null
  due_date: string | null
  status: FindingStatus
  closure_evidence: string | null
  closed_by: string | null
  closed_at: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Audit schedule item (from view)
 */
export interface AuditScheduleItem {
  audit_type_id: string
  type_code: string
  type_name: string
  category: AuditCategory
  frequency_days: number | null
  last_conducted: string | null
  next_due: string | null
  is_overdue?: boolean
}

/**
 * Open finding view item
 */
export interface OpenFindingView {
  id: string
  audit_id: string
  audit_number: string
  finding_number: number
  severity: FindingSeverity
  finding_description: string
  status: FindingStatus
  due_date: string | null
  responsible_id: string | null
  responsible_name: string | null
  days_open: number
  days_overdue?: number
}

/**
 * Dashboard metrics for audits
 */
export interface AuditDashboardMetrics {
  dueSoonCount: number
  openFindingsCount: number
  criticalFindingsCount: number
  averageScoreMTD: number
  overdueAuditsCount: number
}

/**
 * Finding counts by severity
 */
export interface FindingCounts {
  critical: number
  major: number
  minor: number
  observation: number
  total: number
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string
  message: string
}

/**
 * Audit filters for list queries
 */
export interface AuditFilters {
  audit_type_id?: string
  status?: AuditStatus
  date_from?: string
  date_to?: string
  location?: string
}

/**
 * Finding filters for list queries
 */
export interface FindingFilters {
  severity?: FindingSeverity
  status?: FindingStatus
  responsible_id?: string
  audit_id?: string
}

// =====================================================
// INPUT TYPES FOR CRUD OPERATIONS
// =====================================================

/**
 * Input for creating audit type
 */
export interface CreateAuditTypeInput {
  type_code: string
  type_name: string
  description?: string
  category: AuditCategory
  frequency_days?: number
  checklist_template?: ChecklistTemplate
}

/**
 * Input for updating audit type
 */
export interface UpdateAuditTypeInput {
  type_name?: string
  description?: string
  category?: AuditCategory
  frequency_days?: number
  checklist_template?: ChecklistTemplate
  is_active?: boolean
}

/**
 * Input for creating audit
 */
export interface CreateAuditInput {
  audit_type_id: string
  scheduled_date?: string
  location?: string
  department_id?: string
  asset_id?: string
  job_order_id?: string
  auditor_id?: string
  auditor_name?: string
}

/**
 * Input for updating audit
 */
export interface UpdateAuditInput {
  scheduled_date?: string
  conducted_date?: string
  location?: string
  department_id?: string
  asset_id?: string
  job_order_id?: string
  auditor_id?: string
  auditor_name?: string
  checklist_responses?: ChecklistResponse[]
  summary?: string
  photos?: string[]
  documents?: string[]
  status?: AuditStatus
}

/**
 * Input for completing audit
 */
export interface CompleteAuditInput {
  checklist_responses: ChecklistResponse[]
  summary?: string
  photos?: string[]
  documents?: string[]
}

/**
 * Input for creating finding
 */
export interface CreateFindingInput {
  audit_id: string
  severity: FindingSeverity
  category?: string
  finding_description: string
  location_detail?: string
  photos?: string[]
  risk_level?: RiskLevel
  potential_consequence?: string
  corrective_action?: string
  responsible_id?: string
  due_date?: string
}

/**
 * Input for updating finding
 */
export interface UpdateFindingInput {
  severity?: FindingSeverity
  category?: string
  finding_description?: string
  location_detail?: string
  photos?: string[]
  risk_level?: RiskLevel
  potential_consequence?: string
  corrective_action?: string
  responsible_id?: string
  due_date?: string
  status?: FindingStatus
}

/**
 * Input for closing finding
 */
export interface CloseFindingInput {
  closure_evidence: string
}

// =====================================================
// AUDIT TRAIL/LOGGING TYPES
// =====================================================

/**
 * Audit log entry interface
 * Supports both camelCase and snake_case for flexibility
 */
export interface AuditLogEntry {
  id?: string
  // camelCase properties
  userId?: string
  userName?: string
  userEmail?: string
  userRole?: UserRole
  action?: AuditAction
  module?: string
  recordId?: string
  recordType?: string
  recordNumber?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  changesSummary?: string
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  workflowStatusFrom?: string
  workflowStatusTo?: string
  createdAt?: string
  requestMethod?: string
  requestPath?: string
  // snake_case properties (database format)
  entity_type?: string
  entity_id?: string
  entity_reference?: string
  description?: string
  changed_fields?: string[]
  timestamp?: string
  status?: string
  user_id?: string
  user_email?: string
  user_name?: string
  user_role?: UserRole
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  session_id?: string
  created_at?: string
  request_method?: string
  request_path?: string
  // Additional properties used by components
  error_message?: string
  metadata?: Record<string, unknown>
}

/**
 * Input for creating audit log entry
 * Supports both camelCase and snake_case for flexibility
 */
export interface CreateAuditLogInput {
  // camelCase (original)
  userId?: string
  userName?: string
  userEmail?: string
  userRole?: UserRole
  action?: AuditAction
  module?: string
  recordId?: string
  recordType?: string
  recordNumber?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  changesSummary?: string
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  workflowStatusFrom?: string
  workflowStatusTo?: string
  // snake_case (database)
  user_id?: string
  user_email?: string
  user_role?: UserRole
  entity_type?: string
  entity_id?: string
  entity_reference?: string
  description?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  changed_fields?: string[]
  ip_address?: string
  user_agent?: string
  session_id?: string
  request_method?: string
  request_path?: string
  status?: string
  error_message?: string
  metadata?: Record<string, unknown>
}

/**
 * Audit log filters for queries (alias for AuditLogFilter)
 * Uses snake_case to match database column names
 */
export interface AuditLogFilters {
  user_id?: string
  user_email?: string
  user_role?: UserRole
  action?: AuditAction | AuditAction[]
  module?: string | string[]
  entity_type?: string | string[]
  entity_id?: string
  status?: string | string[]
  start_date?: string
  end_date?: string
  search?: string
  // Legacy camelCase support
  userId?: string
  recordId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * Pagination options for audit logs
 */
export interface AuditLogPagination {
  page: number
  pageSize: number
  page_size?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

/**
 * Paginated audit logs result
 */
export interface PaginatedAuditLogs {
  logs: AuditLogEntry[]
  data?: AuditLogEntry[]  // Alternative property name
  total: number
  page: number
  pageSize: number
  page_size?: number  // snake_case alternative
  totalPages: number
  total_pages?: number  // snake_case alternative
  hasMore: boolean
}

/**
 * Audit log statistics
 */
export interface AuditLogStats {
  total_entries: number
  entries_today: number
  entries_this_week: number
  entries_this_month: number
  by_action: Record<string, number>
  by_module: Record<string, number>
  by_user: { user_id: string; user_email: string; count: number }[]
  // Alternative property names
  entries_by_action?: Record<string, number>
  entries_by_module?: Record<string, number>
  entries_by_user?: { user_id: string; user_email: string; count: number }[]
}

/**
 * Changed field information
 */
export interface ChangedField {
  field: string
  oldValue?: unknown
  newValue?: unknown
  // snake_case alternatives
  old_value?: unknown
  new_value?: unknown
}

/**
 * Formatted audit description
 */
export interface FormattedAuditDescription {
  action: string
  module: string
  entityReference?: string
  description: string
  changedFields?: ChangedField[]
  // Additional properties used by components
  summary?: string
  changed_fields_summary?: string
}

/**
 * Audit log filter options
 */
export interface AuditLogFilter {
  userId?: string
  recordId?: string
  module?: string
  action?: AuditAction
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

/**
 * Audit log query result
 */
export interface AuditLogQueryResult {
  logs: AuditLogEntry[]
  total: number
  hasMore: boolean
}

/**
 * Module names for audit logging
 */
export type AuditModule = 
  | 'customers'
  | 'projects'
  | 'quotations'
  | 'pjo'
  | 'job_orders'
  | 'invoices'
  | 'payments'
  | 'bkk'
  | 'vendors'
  | 'vendor_invoices'
  | 'employees'
  | 'attendance'
  | 'leave'
  | 'payroll'
  | 'assets'
  | 'maintenance'
  | 'incidents'
  | 'audits'
  | 'training'
  | 'ppe'
  | 'surveys'
  | 'jmp'
  | 'drawings'
  | 'users'
  | 'settings'
  | 'auth'


/**
 * Retention periods for different log types
 */
export interface RetentionPeriods {
  audit_logs: number
  system_logs: number
  login_history: number
  data_access_logs: number
}

/**
 * Retention configuration
 */
export interface RetentionConfig {
  periods: RetentionPeriods
  archive_enabled: boolean
  archive_location: string | null
  auto_cleanup_enabled: boolean
  last_cleanup_at: string | null
  next_cleanup_at: string | null
}

/**
 * Storage statistics for audit tables
 */
export interface AuditStorageStats {
  audit_logs: {
    count: number
    size_bytes: number
    oldest_entry: string | null
    newest_entry: string | null
  }
  system_logs: {
    count: number
    size_bytes: number
    oldest_entry: string | null
    newest_entry: string | null
  }
  login_history: {
    count: number
    size_bytes: number
    oldest_entry: string | null
    newest_entry: string | null
  }
  data_access_logs: {
    count: number
    size_bytes: number
    oldest_entry: string | null
    newest_entry: string | null
  }
  total_size_bytes: number
}

/**
 * Archive request
 */
export interface ArchiveRequest {
  log_type: 'audit_logs' | 'system_logs' | 'login_history' | 'data_access_logs'
  before_date: string
  delete_after_archive?: boolean
}

/**
 * Archive result
 */
export interface ArchiveResult {
  success: boolean
  records_archived: number
  records_deleted: number
  archive_path: string | null
  error?: string
}
