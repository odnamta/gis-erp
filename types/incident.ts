// =====================================================
// v0.46: HSE - INCIDENT REPORTING TYPES
// =====================================================

// Incident severity levels
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

// Incident types
export type IncidentType = 'accident' | 'near_miss' | 'observation' | 'violation';

// Incident status workflow
export type IncidentStatus = 'reported' | 'under_investigation' | 'pending_actions' | 'closed' | 'rejected';

// Location types
export type LocationType = 'office' | 'warehouse' | 'road' | 'customer_site' | 'port' | 'other';

// Person types in incident
export type PersonType = 'injured' | 'witness' | 'involved' | 'first_responder';

// Treatment levels
export type TreatmentLevel = 'none' | 'first_aid' | 'medical_treatment' | 'hospitalized' | 'fatality';

// Action status
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

// Contributing factors
export type ContributingFactor = 
  | 'equipment_failure'
  | 'procedure_not_followed'
  | 'human_error'
  | 'environmental_conditions'
  | 'training_gap';

// Insurance claim status
export type InsuranceClaimStatus = 'pending' | 'submitted' | 'approved' | 'rejected' | 'paid';

// =====================================================
// INTERFACES
// =====================================================

// Incident category
export interface IncidentCategory {
  id: string;
  categoryCode: string;
  categoryName: string;
  description?: string;
  severityDefault: IncidentSeverity;
  requiresInvestigation: boolean;
  requiresRegulatoryReport: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
}

// Corrective/Preventive action
export interface IncidentAction {
  id: string;
  description: string;
  responsibleId: string;
  responsibleName?: string;
  dueDate: string;
  status: ActionStatus;
  completedAt?: string;
}

// Person involved in incident
export interface IncidentPerson {
  id: string;
  incidentId: string;
  personType: PersonType;
  employeeId?: string;
  employeeName?: string;
  personName?: string;
  personCompany?: string;
  personPhone?: string;
  injuryType?: string;
  injuryDescription?: string;
  bodyPart?: string;
  treatment?: TreatmentLevel;
  daysLost: number;
  statement?: string;
  createdAt: string;
}

// Photo/Document attachment
export interface IncidentAttachment {
  url: string;
  name: string;
  uploadedAt?: string;
}

// Main incident interface
export interface Incident {
  id: string;
  incidentNumber: string;
  categoryId: string;
  categoryName?: string;
  categoryCode?: string;
  severity: IncidentSeverity;
  incidentType: IncidentType;
  incidentDate: string;
  incidentTime?: string;
  locationType: LocationType;
  locationName?: string;
  locationAddress?: string;
  gpsCoordinates?: string;
  title: string;
  description: string;
  immediateActions?: string;
  jobOrderId?: string;
  jobOrderNumber?: string;
  assetId?: string;
  assetCode?: string;
  assetName?: string;
  reportedBy: string;
  reportedByName?: string;
  reportedAt: string;
  supervisorId?: string;
  supervisorName?: string;
  supervisorNotifiedAt?: string;
  status: IncidentStatus;
  investigationRequired: boolean;
  investigationStartedAt?: string;
  investigationCompletedAt?: string;
  investigatorId?: string;
  investigatorName?: string;
  rootCause?: string;
  contributingFactors: ContributingFactor[];
  correctiveActions: IncidentAction[];
  preventiveActions: IncidentAction[];
  closedAt?: string;
  closedBy?: string;
  closedByName?: string;
  closureNotes?: string;
  estimatedCost?: number;
  actualCost?: number;
  insuranceClaimNumber?: string;
  insuranceClaimStatus?: InsuranceClaimStatus;
  reportedToAuthority: boolean;
  authorityReportDate?: string;
  authorityReference?: string;
  photos: IncidentAttachment[];
  documents: IncidentAttachment[];
  persons?: IncidentPerson[];
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// INPUT TYPES
// =====================================================

// Report incident input
export interface ReportIncidentInput {
  categoryId: string;
  severity: IncidentSeverity;
  incidentType: IncidentType;
  incidentDate: string;
  incidentTime?: string;
  locationType: LocationType;
  locationName?: string;
  locationAddress?: string;
  gpsCoordinates?: string;
  title: string;
  description: string;
  immediateActions?: string;
  jobOrderId?: string;
  assetId?: string;
  supervisorId?: string;
}

// Add person input
export interface AddPersonInput {
  personType: PersonType;
  employeeId?: string;
  personName?: string;
  personCompany?: string;
  personPhone?: string;
  injuryType?: string;
  injuryDescription?: string;
  bodyPart?: string;
  treatment?: TreatmentLevel;
  daysLost?: number;
  statement?: string;
}

// Add action input
export interface AddActionInput {
  description: string;
  responsibleId: string;
  dueDate: string;
}

// Update root cause input
export interface UpdateRootCauseInput {
  rootCause: string;
  contributingFactors: ContributingFactor[];
}

// Close incident input
export interface CloseIncidentInput {
  closureNotes: string;
}

// Incident filters
export interface IncidentFilters {
  status?: IncidentStatus | IncidentStatus[];
  severity?: IncidentSeverity | IncidentSeverity[];
  categoryId?: string;
  incidentType?: IncidentType;
  dateFrom?: string;
  dateTo?: string;
  reportedBy?: string;
  investigatorId?: string;
  jobOrderId?: string;
  assetId?: string;
  search?: string;
}

// =====================================================
// STATISTICS & DASHBOARD
// =====================================================

// Monthly trend data point
export interface MonthlyTrendData {
  month: string;
  total: number;
  nearMisses: number;
  injuries: number;
}

// Incident statistics
export interface IncidentStatistics {
  totalIncidents: number;
  nearMisses: number;
  injuries: number;
  daysLost: number;
  openInvestigations: number;
  daysSinceLastLTI: number;
  bySeverity: Record<IncidentSeverity, number>;
  byCategory: Record<string, number>;
  monthlyTrend: MonthlyTrendData[];
}

// Dashboard summary
export interface IncidentDashboardSummary {
  openIncidents: number;
  underInvestigation: number;
  nearMissesMTD: number;
  injuriesMTD: number;
  daysSinceLastLTI: number;
}

// =====================================================
// HISTORY
// =====================================================

// History entry
export interface IncidentHistoryEntry {
  id: string;
  incidentId: string;
  actionType: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  performedBy?: string;
  performedByName?: string;
  performedAt: string;
}

// =====================================================
// ROW TYPES (Database)
// =====================================================

export interface IncidentCategoryRow {
  id: string;
  category_code: string;
  category_name: string;
  description: string | null;
  severity_default: string;
  requires_investigation: boolean;
  requires_regulatory_report: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface IncidentRow {
  id: string;
  incident_number: string;
  category_id: string;
  severity: string;
  incident_type: string;
  incident_date: string;
  incident_time: string | null;
  location_type: string;
  location_name: string | null;
  location_address: string | null;
  gps_coordinates: string | null;
  title: string;
  description: string;
  immediate_actions: string | null;
  job_order_id: string | null;
  asset_id: string | null;
  reported_by: string;
  reported_at: string;
  supervisor_id: string | null;
  supervisor_notified_at: string | null;
  status: string;
  investigation_required: boolean;
  investigation_started_at: string | null;
  investigation_completed_at: string | null;
  investigator_id: string | null;
  root_cause: string | null;
  contributing_factors: ContributingFactor[];
  corrective_actions: IncidentAction[];
  preventive_actions: IncidentAction[];
  closed_at: string | null;
  closed_by: string | null;
  closure_notes: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  insurance_claim_number: string | null;
  insurance_claim_status: string | null;
  reported_to_authority: boolean;
  authority_report_date: string | null;
  authority_reference: string | null;
  photos: IncidentAttachment[];
  documents: IncidentAttachment[];
  created_at: string;
  updated_at: string;
}

export interface IncidentPersonRow {
  id: string;
  incident_id: string;
  person_type: string;
  employee_id: string | null;
  person_name: string | null;
  person_company: string | null;
  person_phone: string | null;
  injury_type: string | null;
  injury_description: string | null;
  body_part: string | null;
  treatment: string | null;
  days_lost: number;
  statement: string | null;
  created_at: string;
}

export interface IncidentHistoryRow {
  id: string;
  incident_id: string;
  action_type: string;
  description: string;
  previous_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  performed_at: string;
}

// =====================================================
// TRANSFORM FUNCTIONS
// =====================================================

export function transformCategoryRow(row: IncidentCategoryRow): IncidentCategory {
  return {
    id: row.id,
    categoryCode: row.category_code,
    categoryName: row.category_name,
    description: row.description ?? undefined,
    severityDefault: row.severity_default as IncidentSeverity,
    requiresInvestigation: row.requires_investigation,
    requiresRegulatoryReport: row.requires_regulatory_report,
    isActive: row.is_active,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

export function transformIncidentRow(row: IncidentRow): Incident {
  return {
    id: row.id,
    incidentNumber: row.incident_number,
    categoryId: row.category_id,
    severity: row.severity as IncidentSeverity,
    incidentType: row.incident_type as IncidentType,
    incidentDate: row.incident_date,
    incidentTime: row.incident_time ?? undefined,
    locationType: row.location_type as LocationType,
    locationName: row.location_name ?? undefined,
    locationAddress: row.location_address ?? undefined,
    gpsCoordinates: row.gps_coordinates ?? undefined,
    title: row.title,
    description: row.description,
    immediateActions: row.immediate_actions ?? undefined,
    jobOrderId: row.job_order_id ?? undefined,
    assetId: row.asset_id ?? undefined,
    reportedBy: row.reported_by,
    reportedAt: row.reported_at,
    supervisorId: row.supervisor_id ?? undefined,
    supervisorNotifiedAt: row.supervisor_notified_at ?? undefined,
    status: row.status as IncidentStatus,
    investigationRequired: row.investigation_required,
    investigationStartedAt: row.investigation_started_at ?? undefined,
    investigationCompletedAt: row.investigation_completed_at ?? undefined,
    investigatorId: row.investigator_id ?? undefined,
    rootCause: row.root_cause ?? undefined,
    contributingFactors: row.contributing_factors || [],
    correctiveActions: row.corrective_actions || [],
    preventiveActions: row.preventive_actions || [],
    closedAt: row.closed_at ?? undefined,
    closedBy: row.closed_by ?? undefined,
    closureNotes: row.closure_notes ?? undefined,
    estimatedCost: row.estimated_cost ?? undefined,
    actualCost: row.actual_cost ?? undefined,
    insuranceClaimNumber: row.insurance_claim_number ?? undefined,
    insuranceClaimStatus: row.insurance_claim_status as InsuranceClaimStatus | undefined,
    reportedToAuthority: row.reported_to_authority,
    authorityReportDate: row.authority_report_date ?? undefined,
    authorityReference: row.authority_reference ?? undefined,
    photos: row.photos || [],
    documents: row.documents || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transformPersonRow(row: IncidentPersonRow): IncidentPerson {
  return {
    id: row.id,
    incidentId: row.incident_id,
    personType: row.person_type as PersonType,
    employeeId: row.employee_id ?? undefined,
    personName: row.person_name ?? undefined,
    personCompany: row.person_company ?? undefined,
    personPhone: row.person_phone ?? undefined,
    injuryType: row.injury_type ?? undefined,
    injuryDescription: row.injury_description ?? undefined,
    bodyPart: row.body_part ?? undefined,
    treatment: row.treatment as TreatmentLevel | undefined,
    daysLost: row.days_lost,
    statement: row.statement ?? undefined,
    createdAt: row.created_at,
  };
}

export function transformHistoryRow(row: IncidentHistoryRow): IncidentHistoryEntry {
  return {
    id: row.id,
    incidentId: row.incident_id,
    actionType: row.action_type,
    description: row.description,
    previousValue: row.previous_value ?? undefined,
    newValue: row.new_value ?? undefined,
    performedBy: row.performed_by ?? undefined,
    performedAt: row.performed_at,
  };
}
