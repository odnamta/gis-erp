# Design Document: HSE Training Records

## Overview

The HSE Training Records module (v0.48) provides comprehensive safety training management for Gama ERP. It enables tracking of employee safety training including certifications, refresher schedules, and compliance status. The system supports course management, individual training records, batch training sessions, and compliance monitoring through a matrix view.

The module integrates with the existing employees table and follows the established patterns from v0.47 HSE Safety Documentation for consistency.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Training Dashboard                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐│
│  │ Compliance   │ │ Training     │ │ Records      │ │ Courses     ││
│  │ Matrix       │ │ Schedule     │ │ List         │ │ Library     ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Training Utils Layer                            │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐│
│  │ Compliance Calc  │ │ Validity Calc    │ │ Statistics Calc      ││
│  └──────────────────┘ └──────────────────┘ └──────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Training Actions Layer                          │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐│
│  │ Course Actions   │ │ Record Actions   │ │ Session Actions      ││
│  └──────────────────┘ └──────────────────┘ └──────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Supabase Database                            │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐│
│  │ safety_training_ │ │ employee_        │ │ training_sessions    ││
│  │ courses          │ │ training_records │ │ + participants       ││
│  └──────────────────┘ └──────────────────┘ └──────────────────────┘│
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │ Views: training_compliance, expiring_training                    ││
│  └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
app/(main)/hse/training/
├── page.tsx                    # Training dashboard
├── training-client.tsx         # Client component with tabs
├── courses/
│   ├── page.tsx               # Course library
│   ├── [id]/
│   │   └── page.tsx           # Course detail
│   └── new/
│       └── page.tsx           # New course form
├── records/
│   ├── page.tsx               # Training records list
│   ├── [id]/
│   │   └── page.tsx           # Record detail
│   └── new/
│       └── page.tsx           # New record form
└── sessions/
    ├── page.tsx               # Sessions list
    ├── [id]/
    │   └── page.tsx           # Session detail with participants
    └── new/
        └── page.tsx           # New session form

components/training/
├── compliance-matrix.tsx       # Matrix view of employee x course
├── compliance-summary-cards.tsx # Summary statistics cards
├── course-form.tsx            # Course create/edit form
├── course-list.tsx            # Course library list
├── course-card.tsx            # Individual course card
├── record-form.tsx            # Training record form
├── record-list.tsx            # Training records list
├── record-card.tsx            # Individual record card
├── session-form.tsx           # Training session form
├── session-list.tsx           # Sessions list
├── session-card.tsx           # Individual session card
├── participant-list.tsx       # Session participants
├── add-participant-dialog.tsx # Add participant to session
├── expiring-training-list.tsx # Expiring certifications list
├── training-status-badge.tsx  # Status badge component
└── compliance-status-icon.tsx # ✅ ⚠️ ❌ icons

lib/
├── training-utils.ts          # Utility functions
└── training-actions.ts        # Server actions

types/
└── training.ts                # TypeScript types
```

## Components and Interfaces

### Type Definitions (types/training.ts)

```typescript
// Training types
export type TrainingType = 'induction' | 'refresher' | 'specialized' | 'certification' | 'toolbox';

// Training record status
export type TrainingRecordStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

// Training session status
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Attendance status
export type AttendanceStatus = 'registered' | 'attended' | 'absent' | 'cancelled';

// Compliance status
export type ComplianceStatus = 'not_trained' | 'valid' | 'expiring_soon' | 'expired';

// Training course interface
export interface TrainingCourse {
  id: string;
  courseCode: string;
  courseName: string;
  description?: string;
  trainingType: TrainingType;
  durationHours?: number;
  validityMonths?: number;
  isMandatory: boolean;
  applicableRoles: string[];
  applicableDepartments: string[];
  prerequisiteCourses: string[];
  internalTraining: boolean;
  externalProvider?: string;
  requiresAssessment: boolean;
  passingScore: number;
  isActive: boolean;
  createdAt: string;
}

// Employee training record interface
export interface TrainingRecord {
  id: string;
  employeeId: string;
  courseId: string;
  trainingDate: string;
  completionDate?: string;
  trainingLocation?: string;
  trainerName?: string;
  trainingProvider?: string;
  status: TrainingRecordStatus;
  assessmentScore?: number;
  assessmentPassed?: boolean;
  certificateNumber?: string;
  certificateUrl?: string;
  validFrom?: string;
  validTo?: string;
  trainingCost?: number;
  notes?: string;
  recordedBy?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  courseName?: string;
  courseCode?: string;
}

// Training session interface
export interface TrainingSession {
  id: string;
  sessionCode: string;
  courseId: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  trainerName?: string;
  trainerEmployeeId?: string;
  maxParticipants?: number;
  status: SessionStatus;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  // Joined fields
  courseName?: string;
  courseCode?: string;
  trainerEmployeeName?: string;
  participantCount?: number;
}

// Session participant interface
export interface SessionParticipant {
  id: string;
  sessionId: string;
  employeeId: string;
  attendanceStatus: AttendanceStatus;
  trainingRecordId?: string;
  // Joined fields
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
}

// Compliance matrix entry
export interface ComplianceEntry {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  isMandatory: boolean;
  validityMonths?: number;
  trainingRecordId?: string;
  validTo?: string;
  complianceStatus: ComplianceStatus;
}

// Expiring training entry
export interface ExpiringTraining {
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  courseName: string;
  validTo: string;
  daysUntilExpiry: number;
}

// Training statistics
export interface TrainingStatistics {
  overallCompliancePercentage: number;
  fullyCompliantCount: number;
  expiringWithin30Days: number;
  nonCompliantCount: number;
  totalEmployees: number;
  totalRequiredTrainings: number;
}
```

### Input Types

```typescript
// Create course input
export interface CreateCourseInput {
  courseCode: string;
  courseName: string;
  description?: string;
  trainingType: TrainingType;
  durationHours?: number;
  validityMonths?: number;
  isMandatory?: boolean;
  applicableRoles?: string[];
  applicableDepartments?: string[];
  prerequisiteCourses?: string[];
  internalTraining?: boolean;
  externalProvider?: string;
  requiresAssessment?: boolean;
  passingScore?: number;
}

// Create training record input
export interface CreateRecordInput {
  employeeId: string;
  courseId: string;
  trainingDate: string;
  completionDate?: string;
  trainingLocation?: string;
  trainerName?: string;
  trainingProvider?: string;
  status?: TrainingRecordStatus;
  assessmentScore?: number;
  certificateNumber?: string;
  certificateUrl?: string;
  validFrom?: string;
  trainingCost?: number;
  notes?: string;
}

// Create session input
export interface CreateSessionInput {
  courseId: string;
  sessionDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  trainerName?: string;
  trainerEmployeeId?: string;
  maxParticipants?: number;
  notes?: string;
}

// Add participant input
export interface AddParticipantInput {
  sessionId: string;
  employeeId: string;
}
```

### Utility Functions (lib/training-utils.ts)

```typescript
// Validation functions
function validateCourseInput(input: CreateCourseInput): ValidationResult;
function validateRecordInput(input: CreateRecordInput, course: TrainingCourse): ValidationResult;
function validateSessionInput(input: CreateSessionInput): ValidationResult;

// Compliance calculation
function calculateComplianceStatus(validTo: string | null, currentDate: Date): ComplianceStatus;
function calculateOverallCompliance(entries: ComplianceEntry[]): number;
function countFullyCompliant(entries: ComplianceEntry[], employeeIds: string[]): number;
function countNonCompliant(entries: ComplianceEntry[], employeeIds: string[]): number;

// Validity calculation
function calculateValidTo(validFrom: Date, validityMonths: number): Date;
function getDaysUntilExpiry(validTo: string): number;
function isExpiringSoon(validTo: string, thresholdDays: number): boolean;

// Assessment calculation
function calculateAssessmentResult(score: number, passingScore: number): { passed: boolean; status: TrainingRecordStatus };

// Statistics calculation
function calculateTrainingStatistics(entries: ComplianceEntry[], employeeIds: string[]): TrainingStatistics;

// Filtering functions
function filterExpiringTraining(records: TrainingRecord[], withinDays: number): ExpiringTraining[];
function sortByExpiryDate(records: ExpiringTraining[]): ExpiringTraining[];

// Status helpers
function getComplianceStatusIcon(status: ComplianceStatus): string;
function getComplianceStatusColor(status: ComplianceStatus): string;
function getTrainingStatusLabel(status: TrainingRecordStatus): string;
function getSessionStatusLabel(status: SessionStatus): string;

// Code generation
function generateCourseCode(prefix: string, sequence: number): string;
function generateSessionCode(courseCode: string, date: Date, sequence: number): string;
```

### Server Actions (lib/training-actions.ts)

```typescript
// Course actions
async function createCourse(input: CreateCourseInput): Promise<TrainingCourse>;
async function updateCourse(id: string, input: Partial<CreateCourseInput>): Promise<TrainingCourse>;
async function toggleCourseActive(id: string): Promise<TrainingCourse>;
async function getCourses(filters?: CourseFilters): Promise<TrainingCourse[]>;
async function getCourseById(id: string): Promise<TrainingCourse | null>;

// Record actions
async function createTrainingRecord(input: CreateRecordInput): Promise<TrainingRecord>;
async function updateTrainingRecord(id: string, input: Partial<CreateRecordInput>): Promise<TrainingRecord>;
async function completeTrainingRecord(id: string, completionData: CompletionData): Promise<TrainingRecord>;
async function getTrainingRecords(filters?: RecordFilters): Promise<TrainingRecord[]>;
async function getEmployeeTrainingRecords(employeeId: string): Promise<TrainingRecord[]>;

// Session actions
async function createSession(input: CreateSessionInput): Promise<TrainingSession>;
async function updateSession(id: string, input: Partial<CreateSessionInput>): Promise<TrainingSession>;
async function completeSession(id: string): Promise<{ session: TrainingSession; recordsCreated: number }>;
async function cancelSession(id: string): Promise<TrainingSession>;
async function getSessions(filters?: SessionFilters): Promise<TrainingSession[]>;
async function getUpcomingSessions(): Promise<TrainingSession[]>;

// Participant actions
async function addParticipant(input: AddParticipantInput): Promise<SessionParticipant>;
async function removeParticipant(sessionId: string, employeeId: string): Promise<void>;
async function updateAttendance(participantId: string, status: AttendanceStatus): Promise<SessionParticipant>;
async function getSessionParticipants(sessionId: string): Promise<SessionParticipant[]>;

// Compliance actions
async function getComplianceMatrix(filters?: ComplianceFilters): Promise<ComplianceEntry[]>;
async function getExpiringTraining(withinDays?: number): Promise<ExpiringTraining[]>;
async function getTrainingStatistics(): Promise<TrainingStatistics>;
```

## Data Models

### Database Schema

```sql
-- Training courses
CREATE TABLE safety_training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_code VARCHAR(30) UNIQUE NOT NULL,
  course_name VARCHAR(200) NOT NULL,
  description TEXT,
  training_type VARCHAR(30) NOT NULL,
  duration_hours DECIMAL(5,2),
  validity_months INTEGER,
  is_mandatory BOOLEAN DEFAULT FALSE,
  applicable_roles TEXT[] DEFAULT '{}',
  applicable_departments TEXT[] DEFAULT '{}',
  prerequisite_courses UUID[] DEFAULT '{}',
  internal_training BOOLEAN DEFAULT TRUE,
  external_provider VARCHAR(200),
  requires_assessment BOOLEAN DEFAULT FALSE,
  passing_score INTEGER DEFAULT 70,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee training records
CREATE TABLE employee_training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  course_id UUID NOT NULL REFERENCES safety_training_courses(id),
  training_date DATE NOT NULL,
  completion_date DATE,
  training_location VARCHAR(200),
  trainer_name VARCHAR(200),
  training_provider VARCHAR(200),
  status VARCHAR(30) DEFAULT 'scheduled',
  assessment_score INTEGER,
  assessment_passed BOOLEAN,
  certificate_number VARCHAR(100),
  certificate_url VARCHAR(500),
  valid_from DATE,
  valid_to DATE,
  training_cost DECIMAL(15,2),
  notes TEXT,
  recorded_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training sessions
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code VARCHAR(30) UNIQUE NOT NULL,
  course_id UUID NOT NULL REFERENCES safety_training_courses(id),
  session_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location VARCHAR(200),
  trainer_name VARCHAR(200),
  trainer_employee_id UUID REFERENCES employees(id),
  max_participants INTEGER,
  status VARCHAR(30) DEFAULT 'scheduled',
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session participants
CREATE TABLE training_session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES training_sessions(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  attendance_status VARCHAR(30) DEFAULT 'registered',
  training_record_id UUID REFERENCES employee_training_records(id),
  UNIQUE(session_id, employee_id)
);

-- Indexes
CREATE INDEX idx_training_records_employee ON employee_training_records(employee_id);
CREATE INDEX idx_training_records_course ON employee_training_records(course_id);
CREATE INDEX idx_training_records_valid_to ON employee_training_records(valid_to);
CREATE INDEX idx_training_sessions_date ON training_sessions(session_date);
```

### Database Views

```sql
-- Compliance view
CREATE OR REPLACE VIEW training_compliance AS
SELECT 
  e.id as employee_id,
  e.employee_code,
  e.full_name,
  d.department_name,
  stc.id as course_id,
  stc.course_code,
  stc.course_name,
  stc.is_mandatory,
  stc.validity_months,
  etr.id as training_record_id,
  etr.valid_to,
  CASE 
    WHEN etr.id IS NULL THEN 'not_trained'
    WHEN etr.valid_to IS NULL THEN 'valid'
    WHEN etr.valid_to < CURRENT_DATE THEN 'expired'
    WHEN etr.valid_to <= CURRENT_DATE + 30 THEN 'expiring_soon'
    ELSE 'valid'
  END as compliance_status
FROM employees e
JOIN departments d ON e.department_id = d.id
CROSS JOIN safety_training_courses stc
LEFT JOIN employee_training_records etr 
  ON e.id = etr.employee_id 
  AND stc.id = etr.course_id
  AND etr.status = 'completed'
  AND (etr.valid_to IS NULL OR etr.valid_to >= CURRENT_DATE - 30)
WHERE e.status = 'active'
  AND stc.is_active = TRUE
  AND (stc.is_mandatory = TRUE 
       OR stc.applicable_departments = '{}' 
       OR d.department_code = ANY(stc.applicable_departments));

-- Expiring training view
CREATE OR REPLACE VIEW expiring_training AS
SELECT 
  e.employee_code,
  e.full_name,
  d.department_name,
  stc.course_name,
  etr.valid_to,
  etr.valid_to - CURRENT_DATE as days_until_expiry
FROM employee_training_records etr
JOIN employees e ON etr.employee_id = e.id
JOIN departments d ON e.department_id = d.id
JOIN safety_training_courses stc ON etr.course_id = stc.id
WHERE etr.status = 'completed'
  AND etr.valid_to IS NOT NULL
  AND etr.valid_to <= CURRENT_DATE + 60
  AND e.status = 'active'
ORDER BY etr.valid_to;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Compliance Status Calculation

*For any* employee-course combination with a training record, the compliance status SHALL be calculated as:
- 'valid' when valid_to is NULL or valid_to > current_date + 30 days
- 'expiring_soon' when valid_to is within 30 days of current_date
- 'expired' when valid_to < current_date
- 'not_trained' when no completed training record exists

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 2: Validity Date Calculation

*For any* training record marked as completed with a course that has validity_months set, the valid_to date SHALL equal valid_from + validity_months. When validity_months is NULL, valid_to SHALL be NULL (no expiry).

**Validates: Requirements 1.4, 2.3**

### Property 3: Assessment Result Determination

*For any* training record for a course that requires_assessment, when assessment_score < passing_score, the assessment_passed SHALL be FALSE and status SHALL be 'failed'. When assessment_score >= passing_score, assessment_passed SHALL be TRUE.

**Validates: Requirements 2.4, 2.5**

### Property 4: Compliance Percentage Calculation

*For any* set of compliance entries, the overall compliance percentage SHALL equal (count of 'valid' or 'expiring_soon' entries / total required entries) * 100. Only active employees and active courses SHALL be included in the calculation.

**Validates: Requirements 4.6, 4.7, 4.8, 4.9**

### Property 5: Expiring Training Filter

*For any* set of training records, the expiring training list SHALL:
- Include only completed records with non-null valid_to dates
- Include only records where valid_to is within the specified threshold (default 60 days)
- Include only active employees
- Be sorted by valid_to ascending (soonest first)

**Validates: Requirements 5.1, 5.3, 5.4, 5.5**

### Property 6: Session Capacity Enforcement

*For any* training session with max_participants set, the number of registered participants SHALL NOT exceed max_participants. Duplicate registrations (same employee, same session) SHALL be rejected.

**Validates: Requirements 3.4, 3.8**

### Property 7: Session Completion Auto-Record Creation

*For any* training session marked as completed, a training record SHALL be automatically created for each participant with 'attended' status. The created records SHALL have status 'completed' and valid_from set to the session date.

**Validates: Requirements 3.7**

### Property 8: Status/Type Validation

*For any* training course, training_type SHALL be one of: 'induction', 'refresher', 'specialized', 'certification', 'toolbox'.
*For any* training record, status SHALL be one of: 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled'.
*For any* training session, status SHALL be one of: 'scheduled', 'in_progress', 'completed', 'cancelled'.
*For any* session participant, attendance_status SHALL be one of: 'registered', 'attended', 'absent', 'cancelled'.

**Validates: Requirements 1.3, 2.2, 3.3, 3.6**

### Property 9: Prerequisite Validation

*For any* training record being marked as completed, if the course has prerequisite_courses specified, the employee SHALL have completed training records for all prerequisite courses. Otherwise, the completion SHALL be rejected.

**Validates: Requirements 1.7**

### Property 10: Permission Validation

*For any* user attempting to create/edit courses, records, or sessions, the user SHALL have one of the roles: 'hse', 'admin', 'super_admin'. Users with 'manager' role SHALL only view compliance reports for their department. All authenticated users SHALL be able to view their own training records.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

## Error Handling

### Validation Errors

| Error Code | Message | Condition |
|------------|---------|-----------|
| COURSE_CODE_EXISTS | Kode kursus sudah digunakan | Duplicate course_code |
| COURSE_NAME_REQUIRED | Nama kursus wajib diisi | Empty course_name |
| INVALID_TRAINING_TYPE | Jenis pelatihan tidak valid | Invalid training_type |
| EMPLOYEE_REQUIRED | Karyawan wajib dipilih | Missing employee_id |
| COURSE_REQUIRED | Kursus wajib dipilih | Missing course_id |
| TRAINING_DATE_REQUIRED | Tanggal pelatihan wajib diisi | Missing training_date |
| ASSESSMENT_REQUIRED | Nilai assessment wajib diisi | Missing score for assessment course |
| PREREQUISITES_NOT_MET | Prasyarat belum terpenuhi | Missing prerequisite completions |
| SESSION_FULL | Sesi sudah penuh | max_participants reached |
| ALREADY_REGISTERED | Karyawan sudah terdaftar | Duplicate participant |
| SESSION_NOT_SCHEDULED | Sesi tidak dalam status scheduled | Invalid session status for operation |

### Business Logic Errors

| Error Code | Message | Condition |
|------------|---------|-----------|
| CANNOT_COMPLETE_FAILED | Tidak dapat menyelesaikan pelatihan yang gagal | Attempting to complete failed record |
| CANNOT_MODIFY_COMPLETED | Tidak dapat mengubah pelatihan yang sudah selesai | Modifying completed record |
| CANNOT_ADD_TO_COMPLETED_SESSION | Tidak dapat menambah peserta ke sesi yang sudah selesai | Adding participant to completed session |
| INVALID_ASSESSMENT_SCORE | Nilai assessment harus 0-100 | Score out of range |

## Testing Strategy

### Unit Tests

Unit tests will cover:
- Input validation functions (validateCourseInput, validateRecordInput, validateSessionInput)
- Status label and color helper functions
- Code generation functions
- Date formatting utilities

### Property-Based Tests

Property-based tests will validate the correctness properties using fast-check library:
- Compliance status calculation across random dates and validity periods
- Validity date calculation with various validity_months values
- Assessment result determination with random scores
- Compliance percentage calculation with random entry sets
- Expiring training filter with random record sets
- Session capacity enforcement with random participant counts

### Integration Tests

Integration tests will cover:
- Course CRUD operations with database
- Training record creation and completion flow
- Session creation and participant management
- Compliance matrix generation
- Expiring training alerts

### Test Configuration

- Property tests: minimum 100 iterations per property
- Test framework: Vitest with fast-check for property-based testing
- Each property test tagged with: **Feature: hse-training-records, Property {number}: {property_text}**
