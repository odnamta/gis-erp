// =====================================================
// v0.50: HSE - AUDIT & INSPECTION Types
// =====================================================

// Enums
export type AuditCategory =
  | 'safety_audit'
  | 'workplace_inspection'
  | 'vehicle_inspection'
  | 'equipment_inspection'
  | 'environmental_audit';

export type AuditStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type AuditRating = 'pass' | 'conditional_pass' | 'fail';

export type FindingSeverity = 'critical' | 'major' | 'minor' | 'observation';

export type FindingStatus = 'open' | 'in_progress' | 'closed' | 'verified';

export type RiskLevel = 'high' | 'medium' | 'low';

export type ChecklistItemType = 'yes_no' | 'rating' | 'text' | 'select';

// Checklist Template Types
export interface ChecklistItem {
  question: string;
  type: ChecklistItemType;
  options?: string[];
  weight: number;
  required: boolean;
}

export interface ChecklistSection {
  name: string;
  items: ChecklistItem[];
}

export interface ChecklistTemplate {
  sections: ChecklistSection[];
}

// Checklist Response Types
export interface ChecklistResponse {
  section: string;
  item_index: number;
  question: string;
  response: string | boolean | number | null;
  notes: string | null;
  finding_created: boolean;
}

// Audit Type
export interface AuditType {
  id: string;
  type_code: string;
  type_name: string;
  description: string | null;
  category: AuditCategory;
  frequency_days: number | null;
  checklist_template: ChecklistTemplate;
  is_active: boolean;
  created_at: string;
}

// Audit
export interface Audit {
  id: string;
  audit_number: string;
  audit_type_id: string;
  scheduled_date: string | null;
  conducted_date: string | null;
  location: string | null;
  department_id: string | null;
  asset_id: string | null;
  job_order_id: string | null;
  auditor_id: string | null;
  auditor_name: string | null;
  checklist_responses: ChecklistResponse[];
  overall_score: number | null;
  overall_rating: AuditRating | null;
  summary: string | null;
  critical_findings: number;
  major_findings: number;
  minor_findings: number;
  observations: number;
  status: AuditStatus;
  completed_at: string | null;
  photos: string[];
  documents: string[];
  created_by: string | null;
  created_at: string;
}

// Audit Finding
export interface AuditFinding {
  id: string;
  audit_id: string;
  finding_number: number;
  severity: FindingSeverity;
  category: string | null;
  finding_description: string;
  location_detail: string | null;
  photos: string[];
  risk_level: RiskLevel | null;
  potential_consequence: string | null;
  corrective_action: string | null;
  responsible_id: string | null;
  due_date: string | null;
  status: FindingStatus;
  closed_by: string | null;
  closed_at: string | null;
  closure_evidence: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

// Extended Audit with relations
export interface AuditWithType extends Audit {
  audit_type?: AuditType;
}

export interface AuditWithFindings extends Audit {
  findings?: AuditFinding[];
}

export interface AuditFull extends Audit {
  audit_type?: AuditType;
  findings?: AuditFinding[];
}

// View Types
export interface OpenFindingView {
  id: string;
  audit_id: string;
  finding_number: number;
  severity: FindingSeverity;
  category: string | null;
  finding_description: string;
  location_detail: string | null;
  photos: string[];
  risk_level: RiskLevel | null;
  potential_consequence: string | null;
  corrective_action: string | null;
  responsible_id: string | null;
  due_date: string | null;
  status: FindingStatus;
  closed_by: string | null;
  closed_at: string | null;
  closure_evidence: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  audit_number: string;
  audit_type: string;
  location: string | null;
  responsible_name: string | null;
  days_overdue: number | null;
}

export interface AuditScheduleItem {
  audit_type_id: string;
  type_code: string;
  type_name: string;
  frequency_days: number;
  last_conducted: string | null;
  next_due: string | null;
  is_overdue?: boolean;
}

// Dashboard Types
export interface AuditDashboardMetrics {
  dueSoonCount: number;
  openFindingsCount: number;
  criticalFindingsCount: number;
  averageScoreMTD: number;
  overdueAuditsCount: number;
}

export interface FindingCounts {
  critical: number;
  major: number;
  minor: number;
  observation: number;
  total: number;
}

// Form Input Types
export interface CreateAuditTypeInput {
  type_code: string;
  type_name: string;
  description?: string;
  category: AuditCategory;
  frequency_days?: number;
  checklist_template?: ChecklistTemplate;
}

export interface UpdateAuditTypeInput {
  type_name?: string;
  description?: string;
  category?: AuditCategory;
  frequency_days?: number | null;
  checklist_template?: ChecklistTemplate;
  is_active?: boolean;
}

export interface CreateAuditInput {
  audit_type_id: string;
  scheduled_date?: string;
  location?: string;
  department_id?: string;
  asset_id?: string;
  job_order_id?: string;
  auditor_id?: string;
  auditor_name?: string;
}

export interface UpdateAuditInput {
  scheduled_date?: string;
  conducted_date?: string;
  location?: string;
  department_id?: string;
  asset_id?: string;
  job_order_id?: string;
  auditor_id?: string;
  auditor_name?: string;
  checklist_responses?: ChecklistResponse[];
  summary?: string;
  photos?: string[];
  documents?: string[];
  status?: AuditStatus;
}

export interface CompleteAuditInput {
  checklist_responses: ChecklistResponse[];
  summary?: string;
  photos?: string[];
  documents?: string[];
}

export interface CreateFindingInput {
  audit_id: string;
  severity: FindingSeverity;
  category?: string;
  finding_description: string;
  location_detail?: string;
  photos?: string[];
  risk_level?: RiskLevel;
  potential_consequence?: string;
  corrective_action?: string;
  responsible_id?: string;
  due_date?: string;
}

export interface UpdateFindingInput {
  severity?: FindingSeverity;
  category?: string;
  finding_description?: string;
  location_detail?: string;
  photos?: string[];
  risk_level?: RiskLevel;
  potential_consequence?: string;
  corrective_action?: string;
  responsible_id?: string;
  due_date?: string;
  status?: FindingStatus;
}

export interface CloseFindingInput {
  closure_evidence: string;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Filter Types
export interface AuditFilters {
  audit_type_id?: string;
  status?: AuditStatus;
  date_from?: string;
  date_to?: string;
  location?: string;
}

export interface FindingFilters {
  severity?: FindingSeverity;
  status?: FindingStatus;
  responsible_id?: string;
  audit_id?: string;
}

// Constants
export const AUDIT_CATEGORIES: AuditCategory[] = [
  'safety_audit',
  'workplace_inspection',
  'vehicle_inspection',
  'equipment_inspection',
  'environmental_audit',
];

export const AUDIT_STATUSES: AuditStatus[] = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
];

export const AUDIT_RATINGS: AuditRating[] = ['pass', 'conditional_pass', 'fail'];

export const FINDING_SEVERITIES: FindingSeverity[] = [
  'critical',
  'major',
  'minor',
  'observation',
];

export const FINDING_STATUSES: FindingStatus[] = [
  'open',
  'in_progress',
  'closed',
  'verified',
];

export const RISK_LEVELS: RiskLevel[] = ['high', 'medium', 'low'];

export const CHECKLIST_ITEM_TYPES: ChecklistItemType[] = [
  'yes_no',
  'rating',
  'text',
  'select',
];

// Score thresholds for rating determination
export const SCORE_THRESHOLDS = {
  pass: 80,
  conditional_pass: 60,
} as const;

// Days ahead for "due soon" calculation
export const DUE_SOON_DAYS = 7;
