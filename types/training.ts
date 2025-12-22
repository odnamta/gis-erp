// =====================================================
// v0.48: HSE - TRAINING RECORDS TYPES
// =====================================================

// Training type
export type TrainingType = 'induction' | 'refresher' | 'specialized' | 'certification' | 'toolbox';

// Training record status
export type TrainingRecordStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

// Training session status
export type SessionStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Attendance status
export type AttendanceStatus = 'registered' | 'attended' | 'absent' | 'cancelled';

// Compliance status
export type ComplianceStatus = 'not_trained' | 'valid' | 'expiring_soon' | 'expired';

// Training type labels (Indonesian)
export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  induction: 'Induksi',
  refresher: 'Penyegaran',
  specialized: 'Khusus',
  certification: 'Sertifikasi',
  toolbox: 'Toolbox Talk',
};

// Training record status labels (Indonesian)
export const TRAINING_RECORD_STATUS_LABELS: Record<TrainingRecordStatus, string> = {
  scheduled: 'Terjadwal',
  in_progress: 'Sedang Berlangsung',
  completed: 'Selesai',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
};

// Session status labels (Indonesian)
export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: 'Terjadwal',
  in_progress: 'Sedang Berlangsung',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

// Attendance status labels (Indonesian)
export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  registered: 'Terdaftar',
  attended: 'Hadir',
  absent: 'Tidak Hadir',
  cancelled: 'Dibatalkan',
};

// Compliance status labels (Indonesian)
export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  not_trained: 'Belum Dilatih',
  valid: 'Berlaku',
  expiring_soon: 'Segera Kadaluarsa',
  expired: 'Kadaluarsa',
};

// =====================================================
// INTERFACES
// =====================================================

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

// =====================================================
// INPUT TYPES
// =====================================================

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

// Update course input
export interface UpdateCourseInput {
  courseName?: string;
  description?: string;
  trainingType?: TrainingType;
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
  isActive?: boolean;
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

// Update training record input
export interface UpdateRecordInput {
  trainingDate?: string;
  completionDate?: string;
  trainingLocation?: string;
  trainerName?: string;
  trainingProvider?: string;
  status?: TrainingRecordStatus;
  assessmentScore?: number;
  certificateNumber?: string;
  certificateUrl?: string;
  validFrom?: string;
  validTo?: string;
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

// Update session input
export interface UpdateSessionInput {
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  trainerName?: string;
  trainerEmployeeId?: string;
  maxParticipants?: number;
  status?: SessionStatus;
  notes?: string;
}

// Add participant input
export interface AddParticipantInput {
  sessionId: string;
  employeeId: string;
}

// =====================================================
// FILTER TYPES
// =====================================================

// Course filters
export interface CourseFilters {
  trainingType?: TrainingType;
  isMandatory?: boolean;
  isActive?: boolean;
  search?: string;
}

// Record filters
export interface RecordFilters {
  employeeId?: string;
  courseId?: string;
  status?: TrainingRecordStatus | TrainingRecordStatus[];
  search?: string;
  expiringWithinDays?: number;
}

// Session filters
export interface SessionFilters {
  courseId?: string;
  status?: SessionStatus | SessionStatus[];
  fromDate?: string;
  toDate?: string;
  search?: string;
}

// Compliance filters
export interface ComplianceFilters {
  departmentId?: string;
  courseId?: string;
  complianceStatus?: ComplianceStatus;
}


// =====================================================
// ROW TYPES (Database)
// =====================================================

export interface TrainingCourseRow {
  id: string;
  course_code: string;
  course_name: string;
  description: string | null;
  training_type: string;
  duration_hours: number | null;
  validity_months: number | null;
  is_mandatory: boolean;
  applicable_roles: string[];
  applicable_departments: string[];
  prerequisite_courses: string[];
  internal_training: boolean;
  external_provider: string | null;
  requires_assessment: boolean;
  passing_score: number;
  is_active: boolean;
  created_at: string;
}

export interface TrainingRecordRow {
  id: string;
  employee_id: string;
  course_id: string;
  training_date: string;
  completion_date: string | null;
  training_location: string | null;
  trainer_name: string | null;
  training_provider: string | null;
  status: string;
  assessment_score: number | null;
  assessment_passed: boolean | null;
  certificate_number: string | null;
  certificate_url: string | null;
  valid_from: string | null;
  valid_to: string | null;
  training_cost: number | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingSessionRow {
  id: string;
  session_code: string;
  course_id: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  trainer_name: string | null;
  trainer_employee_id: string | null;
  max_participants: number | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SessionParticipantRow {
  id: string;
  session_id: string;
  employee_id: string;
  attendance_status: string;
  training_record_id: string | null;
}

export interface ComplianceRow {
  employee_id: string;
  employee_code: string;
  full_name: string;
  department_name: string;
  course_id: string;
  course_code: string;
  course_name: string;
  is_mandatory: boolean;
  validity_months: number | null;
  training_record_id: string | null;
  valid_to: string | null;
  compliance_status: string;
}

export interface ExpiringTrainingRow {
  employee_code: string;
  full_name: string;
  department_name: string;
  course_name: string;
  valid_to: string;
  days_until_expiry: number;
}

// =====================================================
// TRANSFORM FUNCTIONS
// =====================================================

export function transformCourseRow(row: TrainingCourseRow): TrainingCourse {
  return {
    id: row.id,
    courseCode: row.course_code,
    courseName: row.course_name,
    description: row.description ?? undefined,
    trainingType: row.training_type as TrainingType,
    durationHours: row.duration_hours ?? undefined,
    validityMonths: row.validity_months ?? undefined,
    isMandatory: row.is_mandatory,
    applicableRoles: row.applicable_roles || [],
    applicableDepartments: row.applicable_departments || [],
    prerequisiteCourses: row.prerequisite_courses || [],
    internalTraining: row.internal_training,
    externalProvider: row.external_provider ?? undefined,
    requiresAssessment: row.requires_assessment,
    passingScore: row.passing_score,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function transformRecordRow(row: TrainingRecordRow): TrainingRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    courseId: row.course_id,
    trainingDate: row.training_date,
    completionDate: row.completion_date ?? undefined,
    trainingLocation: row.training_location ?? undefined,
    trainerName: row.trainer_name ?? undefined,
    trainingProvider: row.training_provider ?? undefined,
    status: row.status as TrainingRecordStatus,
    assessmentScore: row.assessment_score ?? undefined,
    assessmentPassed: row.assessment_passed ?? undefined,
    certificateNumber: row.certificate_number ?? undefined,
    certificateUrl: row.certificate_url ?? undefined,
    validFrom: row.valid_from ?? undefined,
    validTo: row.valid_to ?? undefined,
    trainingCost: row.training_cost ?? undefined,
    notes: row.notes ?? undefined,
    recordedBy: row.recorded_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transformSessionRow(row: TrainingSessionRow): TrainingSession {
  return {
    id: row.id,
    sessionCode: row.session_code,
    courseId: row.course_id,
    sessionDate: row.session_date,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    location: row.location ?? undefined,
    trainerName: row.trainer_name ?? undefined,
    trainerEmployeeId: row.trainer_employee_id ?? undefined,
    maxParticipants: row.max_participants ?? undefined,
    status: row.status as SessionStatus,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
  };
}

export function transformParticipantRow(row: SessionParticipantRow): SessionParticipant {
  return {
    id: row.id,
    sessionId: row.session_id,
    employeeId: row.employee_id,
    attendanceStatus: row.attendance_status as AttendanceStatus,
    trainingRecordId: row.training_record_id ?? undefined,
  };
}

export function transformComplianceRow(row: ComplianceRow): ComplianceEntry {
  return {
    employeeId: row.employee_id,
    employeeCode: row.employee_code,
    employeeName: row.full_name,
    departmentName: row.department_name,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseName: row.course_name,
    isMandatory: row.is_mandatory,
    validityMonths: row.validity_months ?? undefined,
    trainingRecordId: row.training_record_id ?? undefined,
    validTo: row.valid_to ?? undefined,
    complianceStatus: row.compliance_status as ComplianceStatus,
  };
}

export function transformExpiringTrainingRow(row: ExpiringTrainingRow): ExpiringTraining {
  return {
    employeeCode: row.employee_code,
    employeeName: row.full_name,
    departmentName: row.department_name,
    courseName: row.course_name,
    validTo: row.valid_to,
    daysUntilExpiry: row.days_until_expiry,
  };
}

// =====================================================
// VALIDATION RESULT TYPE
// =====================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}
