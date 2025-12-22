// =====================================================
// v0.48: HSE - TRAINING RECORDS UTILITIES
// =====================================================

import {
  TrainingType,
  TrainingRecordStatus,
  SessionStatus,
  AttendanceStatus,
  ComplianceStatus,
  TrainingCourse,
  TrainingRecord,
  ComplianceEntry,
  ExpiringTraining,
  TrainingStatistics,
  CreateCourseInput,
  CreateRecordInput,
  CreateSessionInput,
  ValidationResult,
  TRAINING_TYPE_LABELS,
  TRAINING_RECORD_STATUS_LABELS,
  SESSION_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  COMPLIANCE_STATUS_LABELS,
} from '@/types/training';

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

const VALID_TRAINING_TYPES: TrainingType[] = ['induction', 'refresher', 'specialized', 'certification', 'toolbox'];
const VALID_RECORD_STATUSES: TrainingRecordStatus[] = ['scheduled', 'in_progress', 'completed', 'failed', 'cancelled'];
const VALID_SESSION_STATUSES: SessionStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled'];
const VALID_ATTENDANCE_STATUSES: AttendanceStatus[] = ['registered', 'attended', 'absent', 'cancelled'];

/**
 * Validate training type
 */
export function isValidTrainingType(type: string): type is TrainingType {
  return VALID_TRAINING_TYPES.includes(type as TrainingType);
}

/**
 * Validate training record status
 */
export function isValidRecordStatus(status: string): status is TrainingRecordStatus {
  return VALID_RECORD_STATUSES.includes(status as TrainingRecordStatus);
}

/**
 * Validate session status
 */
export function isValidSessionStatus(status: string): status is SessionStatus {
  return VALID_SESSION_STATUSES.includes(status as SessionStatus);
}

/**
 * Validate attendance status
 */
export function isValidAttendanceStatus(status: string): status is AttendanceStatus {
  return VALID_ATTENDANCE_STATUSES.includes(status as AttendanceStatus);
}

/**
 * Validate course input
 */
export function validateCourseInput(input: CreateCourseInput): ValidationResult {
  if (!input.courseCode || input.courseCode.trim() === '') {
    return { valid: false, error: 'Kode kursus wajib diisi' };
  }

  if (!input.courseName || input.courseName.trim() === '') {
    return { valid: false, error: 'Nama kursus wajib diisi' };
  }

  if (!input.trainingType || !isValidTrainingType(input.trainingType)) {
    return { valid: false, error: 'Jenis pelatihan tidak valid' };
  }

  if (input.durationHours !== undefined && input.durationHours < 0) {
    return { valid: false, error: 'Durasi harus positif' };
  }

  if (input.validityMonths !== undefined && input.validityMonths < 1) {
    return { valid: false, error: 'Masa berlaku harus minimal 1 bulan' };
  }

  if (input.passingScore !== undefined && (input.passingScore < 0 || input.passingScore > 100)) {
    return { valid: false, error: 'Nilai kelulusan harus 0-100' };
  }

  return { valid: true };
}


/**
 * Validate training record input
 */
export function validateRecordInput(
  input: CreateRecordInput,
  course?: TrainingCourse
): ValidationResult {
  if (!input.employeeId || input.employeeId.trim() === '') {
    return { valid: false, error: 'Karyawan wajib dipilih' };
  }

  if (!input.courseId || input.courseId.trim() === '') {
    return { valid: false, error: 'Kursus wajib dipilih' };
  }

  if (!input.trainingDate || input.trainingDate.trim() === '') {
    return { valid: false, error: 'Tanggal pelatihan wajib diisi' };
  }

  const trainingDate = new Date(input.trainingDate);
  if (isNaN(trainingDate.getTime())) {
    return { valid: false, error: 'Format tanggal pelatihan tidak valid' };
  }

  if (input.status && !isValidRecordStatus(input.status)) {
    return { valid: false, error: 'Status pelatihan tidak valid' };
  }

  // Course-specific validation
  if (course) {
    if (course.requiresAssessment && input.status === 'completed') {
      if (input.assessmentScore === undefined || input.assessmentScore === null) {
        return { valid: false, error: 'Nilai assessment wajib diisi untuk kursus ini' };
      }
    }

    if (input.assessmentScore !== undefined) {
      if (input.assessmentScore < 0 || input.assessmentScore > 100) {
        return { valid: false, error: 'Nilai assessment harus 0-100' };
      }
    }
  }

  if (input.trainingCost !== undefined && input.trainingCost < 0) {
    return { valid: false, error: 'Biaya pelatihan harus positif' };
  }

  return { valid: true };
}

/**
 * Validate session input
 */
export function validateSessionInput(input: CreateSessionInput): ValidationResult {
  if (!input.courseId || input.courseId.trim() === '') {
    return { valid: false, error: 'Kursus wajib dipilih' };
  }

  if (!input.sessionDate || input.sessionDate.trim() === '') {
    return { valid: false, error: 'Tanggal sesi wajib diisi' };
  }

  const sessionDate = new Date(input.sessionDate);
  if (isNaN(sessionDate.getTime())) {
    return { valid: false, error: 'Format tanggal sesi tidak valid' };
  }

  if (input.maxParticipants !== undefined && input.maxParticipants < 1) {
    return { valid: false, error: 'Kapasitas peserta harus minimal 1' };
  }

  return { valid: true };
}

// =====================================================
// COMPLIANCE CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate compliance status based on valid_to date
 */
export function calculateComplianceStatus(
  validTo: string | null | undefined,
  currentDate: Date = new Date()
): ComplianceStatus {
  if (!validTo) {
    return 'valid'; // No expiry = always valid
  }

  const expiryDate = new Date(validTo);
  if (isNaN(expiryDate.getTime())) {
    return 'valid';
  }

  const now = new Date(currentDate);
  now.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < now) {
    return 'expired';
  }

  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (expiry <= thirtyDaysFromNow) {
    return 'expiring_soon';
  }

  return 'valid';
}

/**
 * Calculate overall compliance percentage
 */
export function calculateOverallCompliance(entries: ComplianceEntry[]): number {
  if (entries.length === 0) return 100;

  const compliantCount = entries.filter(
    e => e.complianceStatus === 'valid' || e.complianceStatus === 'expiring_soon'
  ).length;

  const percentage = (compliantCount / entries.length) * 100;
  return Math.round(percentage * 100) / 100;
}

/**
 * Count fully compliant employees (100% compliance on all mandatory training)
 */
export function countFullyCompliant(
  entries: ComplianceEntry[],
  employeeIds: string[]
): number {
  return employeeIds.filter(employeeId => {
    const employeeEntries = entries.filter(
      e => e.employeeId === employeeId && e.isMandatory
    );
    if (employeeEntries.length === 0) return true;
    return employeeEntries.every(
      e => e.complianceStatus === 'valid' || e.complianceStatus === 'expiring_soon'
    );
  }).length;
}

/**
 * Count non-compliant employees (missing or expired mandatory training)
 */
export function countNonCompliant(
  entries: ComplianceEntry[],
  employeeIds: string[]
): number {
  return employeeIds.filter(employeeId => {
    const employeeEntries = entries.filter(
      e => e.employeeId === employeeId && e.isMandatory
    );
    return employeeEntries.some(
      e => e.complianceStatus === 'not_trained' || e.complianceStatus === 'expired'
    );
  }).length;
}

/**
 * Count entries expiring within specified days
 */
export function countExpiringWithinDays(
  entries: ComplianceEntry[],
  days: number = 30
): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + days);

  return entries.filter(e => {
    if (!e.validTo) return false;
    const expiry = new Date(e.validTo);
    expiry.setHours(0, 0, 0, 0);
    return expiry >= now && expiry <= threshold;
  }).length;
}


// =====================================================
// VALIDITY CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate valid_to date from valid_from and validity_months
 */
export function calculateValidTo(validFrom: Date, validityMonths: number): Date {
  const validTo = new Date(validFrom);
  validTo.setMonth(validTo.getMonth() + validityMonths);
  return validTo;
}

/**
 * Get days until expiry
 */
export function getDaysUntilExpiry(validTo: string | Date | null | undefined): number | null {
  if (!validTo) {
    return null;
  }

  const expiry = typeof validTo === 'string' ? new Date(validTo) : validTo;
  
  if (isNaN(expiry.getTime())) {
    return null;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const expiryNormalized = new Date(expiry);
  expiryNormalized.setHours(0, 0, 0, 0);

  const diffTime = expiryNormalized.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if training is expiring soon
 */
export function isExpiringSoon(
  validTo: string | Date | null | undefined,
  thresholdDays: number = 30
): boolean {
  const days = getDaysUntilExpiry(validTo);
  if (days === null) {
    return false;
  }
  return days >= 0 && days <= thresholdDays;
}

// =====================================================
// ASSESSMENT CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate assessment result
 */
export function calculateAssessmentResult(
  score: number,
  passingScore: number
): { passed: boolean; status: TrainingRecordStatus } {
  const passed = score >= passingScore;
  return {
    passed,
    status: passed ? 'completed' : 'failed',
  };
}

// =====================================================
// STATISTICS FUNCTIONS
// =====================================================

/**
 * Calculate training statistics
 */
export function calculateTrainingStatistics(
  entries: ComplianceEntry[],
  employeeIds: string[]
): TrainingStatistics {
  const mandatoryEntries = entries.filter(e => e.isMandatory);
  
  return {
    overallCompliancePercentage: calculateOverallCompliance(mandatoryEntries),
    fullyCompliantCount: countFullyCompliant(entries, employeeIds),
    expiringWithin30Days: countExpiringWithinDays(entries, 30),
    nonCompliantCount: countNonCompliant(entries, employeeIds),
    totalEmployees: employeeIds.length,
    totalRequiredTrainings: mandatoryEntries.length,
  };
}

// =====================================================
// FILTERING FUNCTIONS
// =====================================================

/**
 * Filter expiring training records
 */
export function filterExpiringTraining(
  records: ExpiringTraining[],
  withinDays: number = 60
): ExpiringTraining[] {
  return records.filter(r => r.daysUntilExpiry >= 0 && r.daysUntilExpiry <= withinDays);
}

/**
 * Sort expiring training by valid_to ascending
 */
export function sortByExpiryDate(records: ExpiringTraining[]): ExpiringTraining[] {
  return [...records].sort((a, b) => {
    const dateA = new Date(a.validTo).getTime();
    const dateB = new Date(b.validTo).getTime();
    return dateA - dateB;
  });
}

// =====================================================
// STATUS HELPER FUNCTIONS
// =====================================================

/**
 * Get compliance status icon
 */
export function getComplianceStatusIcon(status: ComplianceStatus): string {
  const icons: Record<ComplianceStatus, string> = {
    valid: '✅',
    expiring_soon: '⚠️',
    expired: '❌',
    not_trained: '❌',
  };
  return icons[status] || '❓';
}

/**
 * Get compliance status color
 */
export function getComplianceStatusColor(status: ComplianceStatus): string {
  const colors: Record<ComplianceStatus, string> = {
    valid: 'bg-green-100 text-green-800',
    expiring_soon: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-800',
    not_trained: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get training type label (Indonesian)
 */
export function getTrainingTypeLabel(type: TrainingType): string {
  return TRAINING_TYPE_LABELS[type] || type;
}

/**
 * Get training type color
 */
export function getTrainingTypeColor(type: TrainingType): string {
  const colors: Record<TrainingType, string> = {
    induction: 'bg-blue-100 text-blue-800',
    refresher: 'bg-purple-100 text-purple-800',
    specialized: 'bg-orange-100 text-orange-800',
    certification: 'bg-green-100 text-green-800',
    toolbox: 'bg-gray-100 text-gray-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

/**
 * Get training record status label (Indonesian)
 */
export function getTrainingStatusLabel(status: TrainingRecordStatus): string {
  return TRAINING_RECORD_STATUS_LABELS[status] || status;
}

/**
 * Get training record status color
 */
export function getTrainingStatusColor(status: TrainingRecordStatus): string {
  const colors: Record<TrainingRecordStatus, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get session status label (Indonesian)
 */
export function getSessionStatusLabel(status: SessionStatus): string {
  return SESSION_STATUS_LABELS[status] || status;
}

/**
 * Get session status color
 */
export function getSessionStatusColor(status: SessionStatus): string {
  const colors: Record<SessionStatus, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get attendance status label (Indonesian)
 */
export function getAttendanceStatusLabel(status: AttendanceStatus): string {
  return ATTENDANCE_STATUS_LABELS[status] || status;
}

/**
 * Get attendance status color
 */
export function getAttendanceStatusColor(status: AttendanceStatus): string {
  const colors: Record<AttendanceStatus, string> = {
    registered: 'bg-blue-100 text-blue-800',
    attended: 'bg-green-100 text-green-800',
    absent: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get compliance status label (Indonesian)
 */
export function getComplianceStatusLabel(status: ComplianceStatus): string {
  return COMPLIANCE_STATUS_LABELS[status] || status;
}

// =====================================================
// CODE GENERATION FUNCTIONS
// =====================================================

/**
 * Generate session code
 */
export function generateSessionCode(courseCode: string, date: Date, sequence: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');
  return `${courseCode}-${year}${month}${day}-${seq}`;
}

// =====================================================
// PREREQUISITE VALIDATION
// =====================================================

/**
 * Check if employee has completed all prerequisites
 */
export function hasCompletedPrerequisites(
  employeeRecords: TrainingRecord[],
  prerequisiteCourseIds: string[]
): boolean {
  if (prerequisiteCourseIds.length === 0) return true;

  const completedCourseIds = employeeRecords
    .filter(r => r.status === 'completed')
    .map(r => r.courseId);

  return prerequisiteCourseIds.every(prereqId => completedCourseIds.includes(prereqId));
}

/**
 * Get missing prerequisites
 */
export function getMissingPrerequisites(
  employeeRecords: TrainingRecord[],
  prerequisiteCourseIds: string[]
): string[] {
  if (prerequisiteCourseIds.length === 0) return [];

  const completedCourseIds = employeeRecords
    .filter(r => r.status === 'completed')
    .map(r => r.courseId);

  return prerequisiteCourseIds.filter(prereqId => !completedCourseIds.includes(prereqId));
}
