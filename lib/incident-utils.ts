// =====================================================
// v0.46: HSE - INCIDENT REPORTING UTILITY FUNCTIONS
// =====================================================

import {
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  LocationType,
  PersonType,
  TreatmentLevel,
  ContributingFactor,
  ActionStatus,
  Incident,
  IncidentAction,
  ReportIncidentInput,
  MonthlyTrendData,
} from '@/types/incident';

// =====================================================
// VALIDATION RESULT TYPE
// =====================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// =====================================================
// COLOR MAPPING FUNCTIONS
// =====================================================

/**
 * Get color class for severity level
 * Property: Each severity level maps to a unique color
 */
export function getSeverityColor(severity: IncidentSeverity): string {
  const colors: Record<IncidentSeverity, string> = {
    low: 'text-blue-600 bg-blue-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100',
  };
  return colors[severity] || 'text-gray-600 bg-gray-100';
}

/**
 * Get badge variant for severity level
 */
export function getSeverityBadgeVariant(
  severity: IncidentSeverity
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<IncidentSeverity, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    low: 'outline',
    medium: 'secondary',
    high: 'default',
    critical: 'destructive',
  };
  return variants[severity] || 'outline';
}

/**
 * Get color class for incident status
 * Property: Each status maps to a unique color
 */
export function getStatusColor(status: IncidentStatus): string {
  const colors: Record<IncidentStatus, string> = {
    reported: 'text-blue-600 bg-blue-100',
    under_investigation: 'text-purple-600 bg-purple-100',
    pending_actions: 'text-yellow-600 bg-yellow-100',
    closed: 'text-green-600 bg-green-100',
    rejected: 'text-gray-600 bg-gray-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

/**
 * Get badge variant for status
 */
export function getStatusBadgeVariant(
  status: IncidentStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<IncidentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    reported: 'secondary',
    under_investigation: 'default',
    pending_actions: 'outline',
    closed: 'default',
    rejected: 'destructive',
  };
  return variants[status] || 'outline';
}

/**
 * Get color class for action status
 */
export function getActionStatusColor(status: ActionStatus): string {
  const colors: Record<ActionStatus, string> = {
    pending: 'text-gray-600 bg-gray-100',
    in_progress: 'text-blue-600 bg-blue-100',
    completed: 'text-green-600 bg-green-100',
    overdue: 'text-red-600 bg-red-100',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

// =====================================================
// LABEL FUNCTIONS
// =====================================================

/**
 * Get display label for severity
 */
export function getSeverityLabel(severity: IncidentSeverity): string {
  const labels: Record<IncidentSeverity, string> = {
    low: 'Rendah',
    medium: 'Sedang',
    high: 'Tinggi',
    critical: 'Kritis',
  };
  return labels[severity] || severity;
}

/**
 * Get display label for status
 */
export function getStatusLabel(status: IncidentStatus): string {
  const labels: Record<IncidentStatus, string> = {
    reported: 'Dilaporkan',
    under_investigation: 'Dalam Investigasi',
    pending_actions: 'Menunggu Tindakan',
    closed: 'Ditutup',
    rejected: 'Ditolak',
  };
  return labels[status] || status;
}

/**
 * Get display label for incident type
 */
export function getIncidentTypeLabel(type: IncidentType): string {
  const labels: Record<IncidentType, string> = {
    accident: 'Kecelakaan',
    near_miss: 'Nyaris Celaka',
    observation: 'Observasi',
    violation: 'Pelanggaran',
  };
  return labels[type] || type;
}

/**
 * Get display label for location type
 */
export function getLocationTypeLabel(type: LocationType): string {
  const labels: Record<LocationType, string> = {
    office: 'Kantor',
    warehouse: 'Gudang',
    road: 'Jalan',
    customer_site: 'Lokasi Pelanggan',
    port: 'Pelabuhan',
    other: 'Lainnya',
  };
  return labels[type] || type;
}

/**
 * Get display label for person type
 */
export function getPersonTypeLabel(type: PersonType): string {
  const labels: Record<PersonType, string> = {
    injured: 'Korban',
    witness: 'Saksi',
    involved: 'Terlibat',
    first_responder: 'Penolong Pertama',
  };
  return labels[type] || type;
}

/**
 * Get display label for treatment level
 */
export function getTreatmentLabel(treatment: TreatmentLevel): string {
  const labels: Record<TreatmentLevel, string> = {
    none: 'Tidak Ada',
    first_aid: 'P3K',
    medical_treatment: 'Perawatan Medis',
    hospitalized: 'Rawat Inap',
    fatality: 'Meninggal',
  };
  return labels[treatment] || treatment;
}

/**
 * Get display label for contributing factor
 */
export function getContributingFactorLabel(factor: ContributingFactor): string {
  const labels: Record<ContributingFactor, string> = {
    equipment_failure: 'Kegagalan Peralatan',
    procedure_not_followed: 'Prosedur Tidak Diikuti',
    human_error: 'Kesalahan Manusia',
    environmental_conditions: 'Kondisi Lingkungan',
    training_gap: 'Kurang Pelatihan',
  };
  return labels[factor] || factor;
}

/**
 * Get display label for action status
 */
export function getActionStatusLabel(status: ActionStatus): string {
  const labels: Record<ActionStatus, string> = {
    pending: 'Menunggu',
    in_progress: 'Dalam Proses',
    completed: 'Selesai',
    overdue: 'Terlambat',
  };
  return labels[status] || status;
}

// =====================================================
// CALCULATION FUNCTIONS
// =====================================================

/**
 * Calculate days since last Lost Time Injury (LTI)
 * Property: Returns number of days since the most recent injury incident with days_lost > 0
 * If no LTI found, returns days since tracking started (or a large number)
 */
export function calculateDaysSinceLastLTI(
  incidents: Incident[],
  referenceDate: Date = new Date()
): number {
  // Filter for injury incidents with lost time
  const ltiIncidents = incidents.filter(
    (inc) =>
      inc.incidentType === 'accident' &&
      inc.persons?.some((p) => p.personType === 'injured' && p.daysLost > 0)
  );

  if (ltiIncidents.length === 0) {
    // No LTI found - return days since start of year or 365 (whichever is less)
    const startOfYear = new Date(referenceDate.getFullYear(), 0, 1);
    const daysSinceYearStart = Math.floor(
      (referenceDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.min(daysSinceYearStart, 365);
  }

  // Find most recent LTI
  const sortedLTI = ltiIncidents.sort(
    (a, b) => new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime()
  );
  const lastLTI = sortedLTI[0];
  const lastLTIDate = new Date(lastLTI.incidentDate);
  lastLTIDate.setHours(0, 0, 0, 0);
  
  const refDate = new Date(referenceDate);
  refDate.setHours(0, 0, 0, 0);

  const daysSince = Math.floor(
    (refDate.getTime() - lastLTIDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(0, daysSince);
}

/**
 * Get pending actions count for an incident
 * Property: Count of actions with status 'pending' or 'in_progress' or 'overdue'
 */
export function getPendingActionsCount(incident: Incident): number {
  const pendingStatuses: ActionStatus[] = ['pending', 'in_progress', 'overdue'];
  
  const pendingCorrective = (incident.correctiveActions || []).filter(
    (a) => pendingStatuses.includes(a.status)
  ).length;
  
  const pendingPreventive = (incident.preventiveActions || []).filter(
    (a) => pendingStatuses.includes(a.status)
  ).length;

  return pendingCorrective + pendingPreventive;
}

/**
 * Check if an incident can be closed
 * Property: Incident can only be closed if all actions are completed
 */
export function canCloseIncident(incident: Incident): { canClose: boolean; reason?: string } {
  // Check if already closed
  if (incident.status === 'closed') {
    return { canClose: false, reason: 'Insiden sudah ditutup' };
  }

  // Check if rejected
  if (incident.status === 'rejected') {
    return { canClose: false, reason: 'Insiden sudah ditolak' };
  }

  // Check pending actions
  const pendingCount = getPendingActionsCount(incident);
  if (pendingCount > 0) {
    return {
      canClose: false,
      reason: `Masih ada ${pendingCount} tindakan yang belum selesai`,
    };
  }

  // Check if investigation is required but not completed
  if (incident.investigationRequired && !incident.investigationCompletedAt) {
    // Allow closure if root cause is documented
    if (!incident.rootCause) {
      return {
        canClose: false,
        reason: 'Investigasi belum selesai - root cause belum didokumentasikan',
      };
    }
  }

  return { canClose: true };
}

/**
 * Update action statuses based on due dates
 * Property: Actions past due date become 'overdue'
 */
export function updateActionStatuses(
  actions: IncidentAction[],
  referenceDate: Date = new Date()
): IncidentAction[] {
  const refDate = new Date(referenceDate);
  refDate.setHours(0, 0, 0, 0);

  return actions.map((action) => {
    if (action.status === 'completed') {
      return action;
    }

    const dueDate = new Date(action.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    if (dueDate < refDate && action.status !== 'overdue') {
      return { ...action, status: 'overdue' as ActionStatus };
    }

    return action;
  });
}

/**
 * Calculate monthly trend data from incidents
 * Property: Returns array of monthly aggregations for the specified number of months
 */
export function calculateMonthlyTrend(
  incidents: Incident[],
  months: number = 6,
  referenceDate: Date = new Date()
): MonthlyTrendData[] {
  const result: MonthlyTrendData[] = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const monthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

    const monthIncidents = incidents.filter((inc) => {
      const incDate = new Date(inc.incidentDate);
      return incDate >= monthStart && incDate <= monthEnd;
    });

    const total = monthIncidents.length;
    const nearMisses = monthIncidents.filter((inc) => inc.incidentType === 'near_miss').length;
    const injuries = monthIncidents.filter(
      (inc) =>
        inc.incidentType === 'accident' &&
        inc.persons?.some((p) => p.personType === 'injured')
    ).length;

    result.push({
      month: monthDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
      total,
      nearMisses,
      injuries,
    });
  }

  return result;
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validate incident input
 * Property: All required fields must be present and valid
 */
export function validateIncidentInput(input: ReportIncidentInput): ValidationResult {
  // Required fields
  if (!input.categoryId) {
    return { valid: false, error: 'Kategori insiden wajib dipilih' };
  }

  if (!input.severity) {
    return { valid: false, error: 'Tingkat keparahan wajib dipilih' };
  }

  if (!input.incidentType) {
    return { valid: false, error: 'Jenis insiden wajib dipilih' };
  }

  if (!input.incidentDate) {
    return { valid: false, error: 'Tanggal insiden wajib diisi' };
  }

  // Validate date format and not in future
  const incidentDate = new Date(input.incidentDate);
  if (isNaN(incidentDate.getTime())) {
    return { valid: false, error: 'Format tanggal tidak valid' };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (incidentDate > today) {
    return { valid: false, error: 'Tanggal insiden tidak boleh di masa depan' };
  }

  if (!input.locationType) {
    return { valid: false, error: 'Tipe lokasi wajib dipilih' };
  }

  if (!input.title || input.title.trim().length === 0) {
    return { valid: false, error: 'Judul insiden wajib diisi' };
  }

  if (input.title.length > 200) {
    return { valid: false, error: 'Judul insiden maksimal 200 karakter' };
  }

  if (!input.description || input.description.trim().length === 0) {
    return { valid: false, error: 'Deskripsi insiden wajib diisi' };
  }

  if (input.description.length < 10) {
    return { valid: false, error: 'Deskripsi insiden minimal 10 karakter' };
  }

  return { valid: true };
}

/**
 * Validate severity value
 */
export function isValidSeverity(value: string): value is IncidentSeverity {
  return ['low', 'medium', 'high', 'critical'].includes(value);
}

/**
 * Validate status value
 */
export function isValidStatus(value: string): value is IncidentStatus {
  return ['reported', 'under_investigation', 'pending_actions', 'closed', 'rejected'].includes(value);
}

/**
 * Validate incident type value
 */
export function isValidIncidentType(value: string): value is IncidentType {
  return ['accident', 'near_miss', 'observation', 'violation'].includes(value);
}

/**
 * Validate location type value
 */
export function isValidLocationType(value: string): value is LocationType {
  return ['office', 'warehouse', 'road', 'customer_site', 'port', 'other'].includes(value);
}

// =====================================================
// FORMATTING FUNCTIONS
// =====================================================

/**
 * Format incident number for display
 */
export function formatIncidentNumber(number: string): string {
  return number; // Already formatted as INC-YYYY-NNNNN
}

/**
 * Format currency for display (Indonesian Rupiah)
 */
export function formatIncidentCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatIncidentDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format time for display
 */
export function formatIncidentTime(timeString: string): string {
  // Time comes as HH:MM:SS or HH:MM
  const parts = timeString.split(':');
  return `${parts[0]}:${parts[1]}`;
}

/**
 * Format datetime for display
 */
export function formatIncidentDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =====================================================
// STATISTICS HELPERS
// =====================================================

/**
 * Count incidents by severity
 */
export function countBySeverity(incidents: Incident[]): Record<IncidentSeverity, number> {
  const counts: Record<IncidentSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  incidents.forEach((inc) => {
    if (counts[inc.severity] !== undefined) {
      counts[inc.severity]++;
    }
  });

  return counts;
}

/**
 * Count incidents by category
 */
export function countByCategory(incidents: Incident[]): Record<string, number> {
  const counts: Record<string, number> = {};

  incidents.forEach((inc) => {
    const key = inc.categoryName || inc.categoryId;
    counts[key] = (counts[key] || 0) + 1;
  });

  return counts;
}

/**
 * Calculate total days lost from incidents
 */
export function calculateTotalDaysLost(incidents: Incident[]): number {
  return incidents.reduce((total, inc) => {
    const incidentDaysLost = (inc.persons || [])
      .filter((p) => p.personType === 'injured')
      .reduce((sum, p) => sum + (p.daysLost || 0), 0);
    return total + incidentDaysLost;
  }, 0);
}

/**
 * Get open investigations count
 */
export function getOpenInvestigationsCount(incidents: Incident[]): number {
  return incidents.filter(
    (inc) =>
      inc.investigationRequired &&
      inc.status === 'under_investigation'
  ).length;
}
