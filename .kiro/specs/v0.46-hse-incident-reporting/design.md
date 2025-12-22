# Design: v0.46 HSE - Incident Reporting

## 1. Database Schema

### 1.1 incident_categories Table

```sql
CREATE TABLE incident_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code VARCHAR(30) UNIQUE NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  severity_default VARCHAR(20) DEFAULT 'medium',
  requires_investigation BOOLEAN DEFAULT TRUE,
  requires_regulatory_report BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default categories
INSERT INTO incident_categories (category_code, category_name, requires_investigation, requires_regulatory_report, display_order) VALUES
('injury', 'Personal Injury', TRUE, TRUE, 1),
('near_miss', 'Near Miss', TRUE, FALSE, 2),
('vehicle_accident', 'Vehicle Accident', TRUE, TRUE, 3),
('property_damage', 'Property Damage', TRUE, FALSE, 4),
('equipment_failure', 'Equipment Failure', TRUE, FALSE, 5),
('environmental', 'Environmental Incident', TRUE, TRUE, 6),
('fire', 'Fire / Explosion', TRUE, TRUE, 7),
('security', 'Security Incident', TRUE, FALSE, 8),
('violation', 'Safety Violation', FALSE, FALSE, 9),
('other', 'Other', FALSE, FALSE, 10);
```

### 1.2 incidents Table

```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number VARCHAR(30) UNIQUE NOT NULL,
  
  -- Classification
  category_id UUID NOT NULL REFERENCES incident_categories(id),
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  incident_type VARCHAR(30) NOT NULL, -- 'accident', 'near_miss', 'observation', 'violation'
  
  -- When & Where
  incident_date DATE NOT NULL,
  incident_time TIME,
  location_type VARCHAR(30) NOT NULL, -- 'office', 'warehouse', 'road', 'customer_site', 'port', 'other'
  location_name VARCHAR(200),
  location_address TEXT,
  gps_coordinates VARCHAR(100),
  
  -- What happened
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  immediate_actions TEXT,
  
  -- Related entities
  job_order_id UUID REFERENCES job_orders(id),
  asset_id UUID REFERENCES assets(id),
  
  -- People involved
  reported_by UUID NOT NULL REFERENCES employees(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Supervisor notification
  supervisor_id UUID REFERENCES employees(id),
  supervisor_notified_at TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(30) DEFAULT 'reported', -- 'reported', 'under_investigation', 'pending_actions', 'closed', 'rejected'
  
  -- Investigation
  investigation_required BOOLEAN DEFAULT TRUE,
  investigation_started_at TIMESTAMPTZ,
  investigation_completed_at TIMESTAMPTZ,
  investigator_id UUID REFERENCES employees(id),
  
  -- Root cause analysis
  root_cause TEXT,
  contributing_factors JSONB DEFAULT '[]',
  
  -- Actions
  corrective_actions JSONB DEFAULT '[]', -- [{id, description, responsibleId, dueDate, status, completedAt}]
  preventive_actions JSONB DEFAULT '[]',
  
  -- Closure
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES user_profiles(id),
  closure_notes TEXT,
  
  -- Costs
  estimated_cost DECIMAL(15,2),
  actual_cost DECIMAL(15,2),
  insurance_claim_number VARCHAR(100),
  insurance_claim_status VARCHAR(30),
  
  -- External reporting
  reported_to_authority BOOLEAN DEFAULT FALSE,
  authority_report_date DATE,
  authority_reference VARCHAR(100),
  
  -- Documents and photos
  photos JSONB DEFAULT '[]',
  documents JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 incident_persons Table

```sql
CREATE TABLE incident_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  person_type VARCHAR(30) NOT NULL, -- 'injured', 'witness', 'involved', 'first_responder'
  
  -- Employee or external
  employee_id UUID REFERENCES employees(id),
  
  -- If external person
  person_name VARCHAR(200),
  person_company VARCHAR(200),
  person_phone VARCHAR(50),
  
  -- Injury details (if injured)
  injury_type VARCHAR(100),
  injury_description TEXT,
  body_part VARCHAR(100),
  treatment VARCHAR(100), -- 'none', 'first_aid', 'medical_treatment', 'hospitalized', 'fatality'
  days_lost INTEGER DEFAULT 0,
  
  statement TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.4 incident_history Table

```sql
CREATE TABLE incident_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'created', 'status_change', 'investigation_started', etc.
  description TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  performed_by UUID REFERENCES user_profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.5 Database Functions & Triggers

```sql
-- Sequence for incident numbers
CREATE SEQUENCE incident_seq START 1;

-- Auto-generate incident number
CREATE OR REPLACE FUNCTION generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.incident_number := 'INC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('incident_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_incident_number
  BEFORE INSERT ON incidents
  FOR EACH ROW
  WHEN (NEW.incident_number IS NULL)
  EXECUTE FUNCTION generate_incident_number();

-- Log status changes
CREATE OR REPLACE FUNCTION log_incident_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO incident_history (incident_id, action_type, description, previous_value, new_value)
    VALUES (NEW.id, 'status_change', 'Status changed', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incident_status_change_trigger
  AFTER UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION log_incident_status_change();
```

### 1.6 Indexes

```sql
CREATE INDEX idx_incidents_category ON incidents(category_id);
CREATE INDEX idx_incidents_date ON incidents(incident_date);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_job ON incidents(job_order_id);
CREATE INDEX idx_incident_persons ON incident_persons(incident_id);
```

### 1.7 Database Views

```sql
-- Incident summary by month
CREATE OR REPLACE VIEW incident_summary AS
SELECT 
  DATE_TRUNC('month', incident_date)::DATE as month,
  ic.category_name,
  i.severity,
  COUNT(*) as incident_count,
  COUNT(*) FILTER (WHERE i.incident_type = 'near_miss') as near_miss_count,
  SUM(ip.days_lost) as total_days_lost,
  COUNT(*) FILTER (WHERE i.status = 'closed') as closed_count,
  COUNT(*) FILTER (WHERE i.status NOT IN ('closed', 'rejected')) as open_count
FROM incidents i
JOIN incident_categories ic ON i.category_id = ic.id
LEFT JOIN incident_persons ip ON i.id = ip.incident_id AND ip.person_type = 'injured'
GROUP BY DATE_TRUNC('month', incident_date), ic.category_name, i.severity;

-- Open investigations view
CREATE OR REPLACE VIEW open_investigations AS
SELECT 
  i.*,
  ic.category_name,
  e.full_name as reported_by_name,
  inv.full_name as investigator_name,
  CURRENT_DATE - i.incident_date as days_open
FROM incidents i
JOIN incident_categories ic ON i.category_id = ic.id
JOIN employees e ON i.reported_by = e.id
LEFT JOIN employees inv ON i.investigator_id = inv.id
WHERE i.status IN ('reported', 'under_investigation', 'pending_actions')
ORDER BY 
  CASE i.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
  i.incident_date;
```

## 2. TypeScript Types

### 2.1 types/incident.ts

```typescript
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
}

// Main incident interface
export interface Incident {
  id: string;
  incidentNumber: string;
  categoryId: string;
  categoryName?: string;
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
  assetName?: string;
  reportedBy: string;
  reportedByName?: string;
  reportedAt: string;
  supervisorId?: string;
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
  closureNotes?: string;
  estimatedCost?: number;
  actualCost?: number;
  insuranceClaimNumber?: string;
  insuranceClaimStatus?: string;
  reportedToAuthority: boolean;
  authorityReportDate?: string;
  authorityReference?: string;
  photos: { url: string; name: string }[];
  documents: { url: string; name: string }[];
  persons?: IncidentPerson[];
  createdAt: string;
  updatedAt: string;
}

// Input types
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

export interface AddActionInput {
  description: string;
  responsibleId: string;
  dueDate: string;
}

// Statistics
export interface IncidentStatistics {
  totalIncidents: number;
  nearMisses: number;
  injuries: number;
  daysLost: number;
  openInvestigations: number;
  daysSinceLastLTI: number;
  bySeverity: Record<IncidentSeverity, number>;
  byCategory: Record<string, number>;
  monthlyTrend: { month: string; total: number; nearMisses: number; injuries: number }[];
}

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
```

## 3. UI Components Structure

### 3.1 Component Hierarchy

```
components/hse/
├── index.ts                          # Barrel export
├── incident-summary-cards.tsx        # Dashboard summary cards
├── incident-list.tsx                 # Incident list with filters
├── incident-card.tsx                 # Single incident card
├── incident-trend-chart.tsx          # 6-month trend chart
├── report-incident-form.tsx          # Multi-step report form
├── incident-detail-header.tsx        # Incident detail header
├── incident-tabs.tsx                 # Detail page tabs
├── investigation-panel.tsx           # Root cause & factors
├── actions-list.tsx                  # Corrective/preventive actions
├── add-action-dialog.tsx             # Add action modal
├── persons-list.tsx                  # People involved list
├── add-person-dialog.tsx             # Add person modal
├── incident-timeline.tsx             # History timeline
├── close-incident-dialog.tsx         # Closure modal
├── category-select.tsx               # Category dropdown
├── severity-badge.tsx                # Severity indicator
└── status-badge.tsx                  # Status indicator
```

### 3.2 Page Routes

```
app/(main)/hse/
├── page.tsx                          # HSE Dashboard
├── hse-client.tsx                    # Dashboard client component
├── incidents/
│   ├── page.tsx                      # Incidents list
│   ├── incidents-client.tsx          # List client component
│   ├── report/
│   │   ├── page.tsx                  # Report incident form
│   │   └── report-client.tsx         # Form client component
│   └── [id]/
│       ├── page.tsx                  # Incident detail
│       └── incident-detail-client.tsx # Detail client component
```

## 4. Key Functions

### 4.1 lib/incident-utils.ts

```typescript
// Severity color mapping
export function getSeverityColor(severity: IncidentSeverity): string;

// Status color mapping
export function getStatusColor(status: IncidentStatus): string;

// Calculate days since last LTI (Lost Time Injury)
export function calculateDaysSinceLastLTI(incidents: Incident[]): number;

// Check if incident can be closed
export function canCloseIncident(incident: Incident): { canClose: boolean; reason?: string };

// Get pending actions count
export function getPendingActionsCount(incident: Incident): number;

// Calculate monthly trend data
export function calculateMonthlyTrend(incidents: Incident[], months: number): MonthlyTrendData[];

// Validate incident input
export function validateIncidentInput(input: ReportIncidentInput): ValidationResult;

// Format incident number
export function formatIncidentNumber(number: string): string;

// Get contributing factor label
export function getContributingFactorLabel(factor: ContributingFactor): string;
```

### 4.2 lib/incident-actions.ts

```typescript
// Report new incident
export async function reportIncident(
  input: ReportIncidentInput,
  persons: AddPersonInput[],
  photos: File[],
  documents: File[]
): Promise<ActionResult<Incident>>;

// Get incident by ID
export async function getIncident(id: string): Promise<Incident | null>;

// Get incidents list with filters
export async function getIncidents(filters: IncidentFilters): Promise<Incident[]>;

// Start investigation
export async function startInvestigation(
  incidentId: string,
  investigatorId: string
): Promise<ActionResult>;

// Update root cause
export async function updateRootCause(
  incidentId: string,
  rootCause: string,
  contributingFactors: ContributingFactor[]
): Promise<ActionResult>;

// Add corrective action
export async function addCorrectiveAction(
  incidentId: string,
  action: AddActionInput
): Promise<ActionResult>;

// Add preventive action
export async function addPreventiveAction(
  incidentId: string,
  action: AddActionInput
): Promise<ActionResult>;

// Complete action
export async function completeAction(
  incidentId: string,
  actionId: string,
  actionType: 'corrective' | 'preventive'
): Promise<ActionResult>;

// Close incident
export async function closeIncident(
  incidentId: string,
  closureNotes: string
): Promise<ActionResult>;

// Get incident statistics
export async function getIncidentStatistics(
  year: number,
  month?: number
): Promise<IncidentStatistics>;

// Get incident history
export async function getIncidentHistory(incidentId: string): Promise<IncidentHistoryEntry[]>;

// Add person to incident
export async function addPersonToIncident(
  incidentId: string,
  person: AddPersonInput
): Promise<ActionResult>;
```

## 5. Role Permissions Matrix

| Action | Owner | Admin | Manager | HSE | Ops | Employee |
|--------|-------|-------|---------|-----|-----|----------|
| Report incident | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View all incidents | ✅ | ✅ | ✅ | ✅ | Own dept | Own |
| Start investigation | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update root cause | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Add actions | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Complete actions | ✅ | ✅ | ✅ | ✅ | Assigned | Assigned |
| Close incident | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View statistics | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

## 6. Notification Triggers

| Event | Recipients | Channel |
|-------|------------|---------|
| Incident reported | HSE Team, Supervisor | In-app, Email |
| Investigation assigned | Investigator | In-app, Email |
| Action assigned | Responsible person | In-app, Email |
| Action overdue | Responsible person, HSE | In-app, Email |
| Incident closed | Reporter, Investigator | In-app |
