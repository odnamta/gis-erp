// =====================================================
// v0.50: HSE - AUDIT & INSPECTION Utility Functions
// =====================================================

import {
  AuditType,
  Audit,
  AuditFinding,
  AuditCategory,
  AuditRating,
  AuditStatus,
  FindingSeverity,
  FindingStatus,
  ChecklistTemplate,
  ChecklistSection,
  ChecklistItem,
  ChecklistResponse,
  ValidationResult,
  ValidationError,
  FindingCounts,
  AuditDashboardMetrics,
  AuditScheduleItem,
  OpenFindingView,
  AuditFilters,
  FindingFilters,
  AUDIT_CATEGORIES,
  FINDING_SEVERITIES,
  SCORE_THRESHOLDS,
  DUE_SOON_DAYS,
  CreateAuditTypeInput,
  CreateAuditInput,
  CreateFindingInput,
} from '@/types/audit';

// =====================================================
// Validation Functions
// =====================================================

/**
 * Validates if a category is a valid AuditCategory
 */
export function isValidCategory(category: string): category is AuditCategory {
  return AUDIT_CATEGORIES.includes(category as AuditCategory);
}

/**
 * Validates if a severity is a valid FindingSeverity
 */
export function isValidSeverity(severity: string): severity is FindingSeverity {
  return FINDING_SEVERITIES.includes(severity as FindingSeverity);
}

/**
 * Validates a checklist item structure
 */
export function isValidChecklistItem(item: unknown): item is ChecklistItem {
  if (!item || typeof item !== 'object') return false;
  const i = item as Record<string, unknown>;
  
  if (typeof i.question !== 'string' || i.question.trim() === '') return false;
  if (!['yes_no', 'rating', 'text', 'select'].includes(i.type as string)) return false;
  if (typeof i.weight !== 'number' || i.weight < 0) return false;
  if (typeof i.required !== 'boolean') return false;
  
  // If type is 'select', options must be an array of strings
  if (i.type === 'select') {
    if (!Array.isArray(i.options) || i.options.length === 0) return false;
    if (!i.options.every((opt: unknown) => typeof opt === 'string')) return false;
  }
  
  return true;
}

/**
 * Validates a checklist section structure
 */
export function isValidChecklistSection(section: unknown): section is ChecklistSection {
  if (!section || typeof section !== 'object') return false;
  const s = section as Record<string, unknown>;
  
  if (typeof s.name !== 'string' || s.name.trim() === '') return false;
  if (!Array.isArray(s.items)) return false;
  
  return s.items.every(isValidChecklistItem);
}

/**
 * Validates a checklist template structure
 */
export function isValidChecklistTemplate(template: unknown): template is ChecklistTemplate {
  if (!template || typeof template !== 'object') return false;
  const t = template as Record<string, unknown>;
  
  if (!Array.isArray(t.sections)) return false;
  
  return t.sections.every(isValidChecklistSection);
}

/**
 * Validates audit type input
 */
export function validateAuditType(input: Partial<CreateAuditTypeInput>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.type_code || input.type_code.trim() === '') {
    errors.push({ field: 'type_code', message: 'Type code is required' });
  } else if (input.type_code.length > 30) {
    errors.push({ field: 'type_code', message: 'Type code must be 30 characters or less' });
  }

  if (!input.type_name || input.type_name.trim() === '') {
    errors.push({ field: 'type_name', message: 'Type name is required' });
  } else if (input.type_name.length > 100) {
    errors.push({ field: 'type_name', message: 'Type name must be 100 characters or less' });
  }

  if (!input.category) {
    errors.push({ field: 'category', message: 'Category is required' });
  } else if (!isValidCategory(input.category)) {
    errors.push({ field: 'category', message: 'Invalid category' });
  }

  if (input.frequency_days !== undefined && input.frequency_days !== null) {
    if (input.frequency_days < 1) {
      errors.push({ field: 'frequency_days', message: 'Frequency must be at least 1 day' });
    }
  }

  if (input.checklist_template !== undefined) {
    if (!isValidChecklistTemplate(input.checklist_template)) {
      errors.push({ field: 'checklist_template', message: 'Invalid checklist template structure' });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates audit input
 */
export function validateAudit(input: Partial<CreateAuditInput>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.audit_type_id) {
    errors.push({ field: 'audit_type_id', message: 'Audit type is required' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates finding input
 */
export function validateFinding(input: Partial<CreateFindingInput>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.audit_id) {
    errors.push({ field: 'audit_id', message: 'Audit ID is required' });
  }

  if (!input.severity) {
    errors.push({ field: 'severity', message: 'Severity is required' });
  } else if (!isValidSeverity(input.severity)) {
    errors.push({ field: 'severity', message: 'Invalid severity' });
  }

  if (!input.finding_description || input.finding_description.trim() === '') {
    errors.push({ field: 'finding_description', message: 'Finding description is required' });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates closure evidence for finding closure
 */
export function validateClosureEvidence(evidence: string | undefined | null): ValidationResult {
  const errors: ValidationError[] = [];

  if (!evidence || evidence.trim() === '') {
    errors.push({ field: 'closure_evidence', message: 'Closure evidence is required' });
  }

  return { valid: errors.length === 0, errors };
}


// =====================================================
// Score Calculation Functions
// =====================================================

/**
 * Calculates the audit score based on checklist responses and template weights
 * Returns a percentage (0-100)
 */
export function calculateAuditScore(
  template: ChecklistTemplate,
  responses: ChecklistResponse[]
): number {
  if (!template.sections || template.sections.length === 0) {
    return 0;
  }

  let totalWeight = 0;
  let earnedWeight = 0;

  for (const section of template.sections) {
    for (let i = 0; i < section.items.length; i++) {
      const item = section.items[i];
      const response = responses.find(
        (r) => r.section === section.name && r.item_index === i
      );

      totalWeight += item.weight;

      if (response && response.response !== null) {
        switch (item.type) {
          case 'yes_no':
            // true = full weight, false = 0
            if (response.response === true || response.response === 'yes') {
              earnedWeight += item.weight;
            }
            break;
          case 'rating':
            // Assume rating is 1-5, normalize to percentage of weight
            const rating = Number(response.response);
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
              earnedWeight += (rating / 5) * item.weight;
            }
            break;
          case 'text':
            // Text responses get full weight if not empty
            if (typeof response.response === 'string' && response.response.trim() !== '') {
              earnedWeight += item.weight;
            }
            break;
          case 'select':
            // Select responses get full weight if a valid option is selected
            if (response.response && item.options?.includes(response.response as string)) {
              earnedWeight += item.weight;
            }
            break;
        }
      }
    }
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round((earnedWeight / totalWeight) * 100 * 100) / 100;
}

/**
 * Determines the audit rating based on score thresholds
 */
export function determineAuditRating(score: number): AuditRating {
  if (score >= SCORE_THRESHOLDS.pass) {
    return 'pass';
  } else if (score >= SCORE_THRESHOLDS.conditional_pass) {
    return 'conditional_pass';
  } else {
    return 'fail';
  }
}

// =====================================================
// Scheduling Functions
// =====================================================

/**
 * Calculates the next due date based on last conducted date and frequency
 */
export function calculateNextDueDate(
  lastConducted: Date | string | null,
  frequencyDays: number
): Date {
  const baseDate = lastConducted ? new Date(lastConducted) : new Date();
  
  // Handle invalid dates
  if (isNaN(baseDate.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + frequencyDays);
    return fallback;
  }
  
  const nextDue = new Date(baseDate);
  nextDue.setDate(nextDue.getDate() + frequencyDays);
  return nextDue;
}

/**
 * Checks if an audit is overdue based on scheduled/next due date
 */
export function isAuditOverdue(
  scheduledDate: Date | string,
  currentDate: Date = new Date()
): boolean {
  const scheduled = new Date(scheduledDate);
  const current = new Date(currentDate);
  
  // Reset time to compare dates only
  scheduled.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  
  return current > scheduled;
}

/**
 * Gets audits that are due within the specified number of days
 */
export function getAuditsDueSoon(
  scheduleItems: AuditScheduleItem[],
  daysAhead: number = DUE_SOON_DAYS,
  currentDate: Date = new Date()
): AuditScheduleItem[] {
  const current = new Date(currentDate);
  current.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(current);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return scheduleItems.filter((item) => {
    if (!item.next_due) return false;
    
    const nextDue = new Date(item.next_due);
    nextDue.setHours(0, 0, 0, 0);
    
    // Include if next_due is before or on the future date (includes overdue)
    return nextDue <= futureDate;
  }).map((item) => ({
    ...item,
    is_overdue: item.next_due ? isAuditOverdue(item.next_due, currentDate) : false,
  }));
}

// =====================================================
// Finding Functions
// =====================================================

/**
 * Severity order for sorting (lower = higher priority)
 */
const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  critical: 1,
  major: 2,
  minor: 3,
  observation: 4,
};

/**
 * Sorts findings by severity (critical first) then by due date
 */
export function sortFindingsBySeverity<T extends { severity: FindingSeverity; due_date: string | null }>(
  findings: T[]
): T[] {
  return [...findings].sort((a, b) => {
    // First sort by severity
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    
    // Then sort by due date (earlier dates first, null dates last)
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

/**
 * Calculates the number of days a finding is overdue
 * Returns negative number if not yet due, 0 if due today, positive if overdue
 */
export function calculateDaysOverdue(
  dueDate: Date | string,
  currentDate: Date = new Date()
): number {
  const due = new Date(dueDate);
  const current = new Date(currentDate);
  
  // Reset time to compare dates only
  due.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  
  const diffTime = current.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Counts findings by severity
 */
export function countFindingsBySeverity(findings: AuditFinding[]): FindingCounts {
  const counts: FindingCounts = {
    critical: 0,
    major: 0,
    minor: 0,
    observation: 0,
    total: findings.length,
  };

  for (const finding of findings) {
    counts[finding.severity]++;
  }

  return counts;
}

/**
 * Filters findings to only include open ones (not closed or verified)
 */
export function filterOpenFindings<T extends { status: FindingStatus }>(
  findings: T[]
): T[] {
  return findings.filter(
    (f) => f.status !== 'closed' && f.status !== 'verified'
  );
}

/**
 * Counts critical findings that are open
 */
export function countCriticalOpenFindings(findings: AuditFinding[]): number {
  return findings.filter(
    (f) => f.severity === 'critical' && f.status !== 'closed' && f.status !== 'verified'
  ).length;
}


// =====================================================
// Dashboard Metrics Functions
// =====================================================

/**
 * Calculates the average score from a list of completed audits
 */
export function calculateAverageScore(audits: Audit[]): number {
  const completedAudits = audits.filter(
    (a) => a.status === 'completed' && a.overall_score !== null
  );

  if (completedAudits.length === 0) {
    return 0;
  }

  const totalScore = completedAudits.reduce(
    (sum, audit) => sum + (audit.overall_score || 0),
    0
  );

  return Math.round((totalScore / completedAudits.length) * 100) / 100;
}

/**
 * Filters findings to only include critical and major severity
 */
export function filterCriticalMajorFindings<T extends { severity: FindingSeverity }>(
  findings: T[]
): T[] {
  return findings.filter(
    (f) => f.severity === 'critical' || f.severity === 'major'
  );
}

/**
 * Calculates all dashboard metrics
 */
export function calculateDashboardMetrics(
  audits: Audit[],
  findings: AuditFinding[],
  schedule: AuditScheduleItem[],
  currentDate: Date = new Date()
): AuditDashboardMetrics {
  // Get current month's completed audits for average score
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const mtdAudits = audits.filter((a) => {
    if (a.status !== 'completed' || !a.conducted_date) return false;
    const conductedDate = new Date(a.conducted_date);
    return (
      conductedDate.getMonth() === currentMonth &&
      conductedDate.getFullYear() === currentYear
    );
  });

  const openFindings = filterOpenFindings(findings);
  const dueSoonAudits = getAuditsDueSoon(schedule, DUE_SOON_DAYS, currentDate);
  const overdueAudits = dueSoonAudits.filter((a) => a.is_overdue);

  return {
    dueSoonCount: dueSoonAudits.length,
    openFindingsCount: openFindings.length,
    criticalFindingsCount: countCriticalOpenFindings(findings),
    averageScoreMTD: calculateAverageScore(mtdAudits),
    overdueAuditsCount: overdueAudits.length,
  };
}

// =====================================================
// List Filtering Functions
// =====================================================

/**
 * Filters audits based on provided criteria
 */
export function filterAudits(
  audits: Audit[],
  filters: AuditFilters
): Audit[] {
  return audits.filter((audit) => {
    // Filter by audit type
    if (filters.audit_type_id && audit.audit_type_id !== filters.audit_type_id) {
      return false;
    }

    // Filter by status
    if (filters.status && audit.status !== filters.status) {
      return false;
    }

    // Filter by date range (using conducted_date or scheduled_date)
    const auditDate = audit.conducted_date || audit.scheduled_date;
    if (auditDate) {
      const date = new Date(auditDate);
      
      if (filters.date_from) {
        const fromDate = new Date(filters.date_from);
        fromDate.setHours(0, 0, 0, 0);
        if (date < fromDate) return false;
      }
      
      if (filters.date_to) {
        const toDate = new Date(filters.date_to);
        toDate.setHours(23, 59, 59, 999);
        if (date > toDate) return false;
      }
    }

    // Filter by location (case-insensitive partial match)
    if (filters.location && audit.location) {
      if (!audit.location.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
    } else if (filters.location && !audit.location) {
      return false;
    }

    return true;
  });
}

/**
 * Filters findings based on provided criteria
 */
export function filterFindings(
  findings: AuditFinding[],
  filters: FindingFilters
): AuditFinding[] {
  return findings.filter((finding) => {
    // Filter by severity
    if (filters.severity && finding.severity !== filters.severity) {
      return false;
    }

    // Filter by status
    if (filters.status && finding.status !== filters.status) {
      return false;
    }

    // Filter by responsible person
    if (filters.responsible_id && finding.responsible_id !== filters.responsible_id) {
      return false;
    }

    // Filter by audit
    if (filters.audit_id && finding.audit_id !== filters.audit_id) {
      return false;
    }

    return true;
  });
}

// =====================================================
// Formatting Functions
// =====================================================

/**
 * Formats severity for display
 */
export function formatSeverity(severity: FindingSeverity): string {
  const labels: Record<FindingSeverity, string> = {
    critical: 'Critical',
    major: 'Major',
    minor: 'Minor',
    observation: 'Observation',
  };
  return labels[severity];
}

/**
 * Formats audit status for display
 */
export function formatAuditStatus(status: AuditStatus): string {
  const labels: Record<AuditStatus, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

/**
 * Formats finding status for display
 */
export function formatFindingStatus(status: FindingStatus): string {
  const labels: Record<FindingStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
    verified: 'Verified',
  };
  return labels[status];
}

/**
 * Formats audit rating for display
 */
export function formatAuditRating(rating: AuditRating): string {
  const labels: Record<AuditRating, string> = {
    pass: 'Pass',
    conditional_pass: 'Conditional Pass',
    fail: 'Fail',
  };
  return labels[rating];
}

/**
 * Formats category for display
 */
export function formatCategory(category: AuditCategory): string {
  const labels: Record<AuditCategory, string> = {
    safety_audit: 'Safety Audit',
    workplace_inspection: 'Workplace Inspection',
    vehicle_inspection: 'Vehicle Inspection',
    equipment_inspection: 'Equipment Inspection',
    environmental_audit: 'Environmental Audit',
  };
  return labels[category];
}

/**
 * Gets severity badge color class
 */
export function getSeverityColor(severity: FindingSeverity): string {
  const colors: Record<FindingSeverity, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    major: 'bg-orange-100 text-orange-800 border-orange-200',
    minor: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    observation: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return colors[severity];
}

/**
 * Gets audit status badge color class
 */
export function getAuditStatusColor(status: AuditStatus): string {
  const colors: Record<AuditStatus, string> = {
    scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return colors[status];
}

/**
 * Gets finding status badge color class
 */
export function getFindingStatusColor(status: FindingStatus): string {
  const colors: Record<FindingStatus, string> = {
    open: 'bg-red-100 text-red-800 border-red-200',
    in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    resolved: 'bg-purple-100 text-purple-800 border-purple-200',
    closed: 'bg-blue-100 text-blue-800 border-blue-200',
    verified: 'bg-green-100 text-green-800 border-green-200',
  };
  return colors[status];
}

/**
 * Gets audit rating badge color class
 */
export function getAuditRatingColor(rating: AuditRating): string {
  const colors: Record<AuditRating, string> = {
    pass: 'bg-green-100 text-green-800 border-green-200',
    conditional_pass: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    fail: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[rating];
}

/**
 * Formats risk level for display
 */
export function formatRiskLevel(level: string): string {
  const labels: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return labels[level] || level;
}

/**
 * Gets risk level badge color class
 */
export function getRiskLevelColor(level: string): string {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };
  return colors[level] || 'bg-gray-100 text-gray-800 border-gray-200';
}
