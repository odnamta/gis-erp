// =====================================================
// v0.60: ENGINEERING - RESOURCE SCHEDULING UTILITIES
// =====================================================

import {
  ResourceType,
  AssignmentStatus,
  UnavailabilityType,
  AssignmentTargetType,
  EngineeringResource,
  ResourceAssignment,
  ResourceAvailability,
  ResourceSkill,
  ResourceInput,
  AssignmentInput,
  UnavailabilityInput,
  ResourceFilters,
  CalendarFilters,
  CalendarCell,
  DayAvailability,
  WeeklyUtilization,
  UtilizationReport,
  TypeUtilization,
  ConflictResult,
  ConflictDetail,
  OverAllocationResult,
  AvailabilityStatus,
  ValidationResult,
  ValidationError,
  Certification,
  CertificationStatus,
  RESOURCE_TYPES,
  ASSIGNMENT_STATUSES,
  UNAVAILABILITY_TYPES,
  ASSIGNMENT_TARGET_TYPES,
  RESOURCE_TYPE_PREFIXES,
} from '@/types/resource-scheduling';

// =====================================================
// RESOURCE CODE GENERATION
// =====================================================

/**
 * Generates a unique resource code based on type
 * Format: {PREFIX}-{YEAR}-{SEQUENCE}
 * Example: PER-2025-0001, EQP-2025-0002
 */
export function generateResourceCode(type: ResourceType, sequence: number): string {
  const prefix = RESOURCE_TYPE_PREFIXES[type];
  const year = new Date().getFullYear();
  const paddedSequence = String(sequence).padStart(4, '0');
  return `${prefix}-${year}-${paddedSequence}`;
}

/**
 * Extracts the sequence number from a resource code
 */
export function extractSequenceFromCode(code: string): number {
  const parts = code.split('-');
  if (parts.length !== 3) return 0;
  return parseInt(parts[2], 10) || 0;
}

/**
 * Gets the next sequence number for a resource type
 */
export function getNextSequence(existingCodes: string[], type: ResourceType): number {
  const prefix = RESOURCE_TYPE_PREFIXES[type];
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-`;
  
  const sequences = existingCodes
    .filter(code => code.startsWith(pattern))
    .map(extractSequenceFromCode)
    .filter(seq => seq > 0);
  
  return sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

/**
 * Validates resource input
 */
export function validateResourceInput(input: ResourceInput): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.resource_type) {
    errors.push({ field: 'resource_type', message: 'Resource type is required' });
  } else if (!RESOURCE_TYPES.includes(input.resource_type)) {
    errors.push({ field: 'resource_type', message: 'Invalid resource type' });
  }

  if (!input.resource_name || input.resource_name.trim() === '') {
    errors.push({ field: 'resource_name', message: 'Resource name is required' });
  }

  if (input.daily_capacity !== undefined && input.daily_capacity <= 0) {
    errors.push({ field: 'daily_capacity', message: 'Daily capacity must be positive' });
  }

  if (input.hourly_rate !== undefined && input.hourly_rate < 0) {
    errors.push({ field: 'hourly_rate', message: 'Hourly rate cannot be negative' });
  }

  if (input.daily_rate !== undefined && input.daily_rate < 0) {
    errors.push({ field: 'daily_rate', message: 'Daily rate cannot be negative' });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates assignment input
 */
export function validateAssignmentInput(input: AssignmentInput): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.resource_id) {
    errors.push({ field: 'resource_id', message: 'Resource is required' });
  }

  if (!input.target_type) {
    errors.push({ field: 'target_type', message: 'Target type is required' });
  } else if (!ASSIGNMENT_TARGET_TYPES.includes(input.target_type)) {
    errors.push({ field: 'target_type', message: 'Invalid target type' });
  }

  if (!input.target_id) {
    errors.push({ field: 'target_id', message: 'Target is required' });
  }

  if (!input.start_date) {
    errors.push({ field: 'start_date', message: 'Start date is required' });
  }

  if (!input.end_date) {
    errors.push({ field: 'end_date', message: 'End date is required' });
  }

  if (input.start_date && input.end_date) {
    const start = new Date(input.start_date);
    const end = new Date(input.end_date);
    if (end < start) {
      errors.push({ field: 'end_date', message: 'End date must be after start date' });
    }
  }

  if (input.planned_hours !== undefined && input.planned_hours < 0) {
    errors.push({ field: 'planned_hours', message: 'Planned hours cannot be negative' });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates unavailability input
 */
export function validateUnavailabilityInput(input: UnavailabilityInput): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.resource_id) {
    errors.push({ field: 'resource_id', message: 'Resource is required' });
  }

  if (!input.dates || input.dates.length === 0) {
    errors.push({ field: 'dates', message: 'At least one date is required' });
  }

  if (!input.unavailability_type) {
    errors.push({ field: 'unavailability_type', message: 'Unavailability type is required' });
  } else if (!UNAVAILABILITY_TYPES.includes(input.unavailability_type)) {
    errors.push({ field: 'unavailability_type', message: 'Invalid unavailability type' });
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validates assignment status
 */
export function isValidAssignmentStatus(status: string): status is AssignmentStatus {
  return ASSIGNMENT_STATUSES.includes(status as AssignmentStatus);
}

/**
 * Validates unavailability type
 */
export function isValidUnavailabilityType(type: string): type is UnavailabilityType {
  return UNAVAILABILITY_TYPES.includes(type as UnavailabilityType);
}


// =====================================================
// DATE UTILITIES
// =====================================================

/**
 * Formats a date to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parses a date string to Date object
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Gets all dates in a range (inclusive)
 */
export function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateString(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Checks if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Counts working days between two dates (excludes weekends)
 */
export function countWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  const current = new Date(start);
  while (current <= end) {
    if (!isWeekend(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Gets the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Checks if two date ranges overlap
 */
export function dateRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);
  
  return s1 <= e2 && s2 <= e1;
}

// =====================================================
// PLANNED HOURS CALCULATION
// =====================================================

/**
 * Calculates planned hours based on date range and daily capacity
 */
export function calculatePlannedHours(
  startDate: string,
  endDate: string,
  dailyCapacity: number
): number {
  const workingDays = countWorkingDays(startDate, endDate);
  return workingDays * dailyCapacity;
}

// =====================================================
// CONFLICT DETECTION
// =====================================================

/**
 * Detects conflicts for a new assignment
 */
export function detectConflicts(
  resourceId: string,
  startDate: string,
  endDate: string,
  existingAssignments: ResourceAssignment[],
  unavailabilityRecords: ResourceAvailability[],
  excludeAssignmentId?: string
): ConflictResult {
  const conflicts: ConflictDetail[] = [];
  const dates = getDatesInRange(startDate, endDate);

  // Check for assignment overlaps
  for (const assignment of existingAssignments) {
    if (excludeAssignmentId && assignment.id === excludeAssignmentId) continue;
    if (assignment.resource_id !== resourceId) continue;
    if (assignment.status === 'cancelled') continue;

    if (dateRangesOverlap(startDate, endDate, assignment.start_date, assignment.end_date)) {
      const overlapDates = dates.filter(d => {
        const date = new Date(d);
        const aStart = new Date(assignment.start_date);
        const aEnd = new Date(assignment.end_date);
        return date >= aStart && date <= aEnd;
      });

      for (const date of overlapDates) {
        conflicts.push({
          type: 'assignment',
          date,
          assignment,
          message: `Resource already assigned to ${assignment.task_description || 'another task'} on ${date}`
        });
      }
    }
  }

  // Check for unavailability
  for (const unavail of unavailabilityRecords) {
    if (unavail.resource_id !== resourceId) continue;
    if (!unavail.is_available && dates.includes(unavail.date)) {
      conflicts.push({
        type: 'unavailability',
        date: unavail.date,
        unavailability_type: unavail.unavailability_type,
        message: `Resource unavailable on ${unavail.date}: ${unavail.unavailability_type || 'unavailable'}`
      });
    }
  }

  return {
    has_conflict: conflicts.length > 0,
    conflicts
  };
}

/**
 * Checks availability for a specific date
 */
export function checkAvailability(
  resourceId: string,
  date: string,
  resource: EngineeringResource,
  assignments: ResourceAssignment[],
  unavailabilityRecords: ResourceAvailability[]
): AvailabilityStatus {
  // Check unavailability records
  const unavail = unavailabilityRecords.find(
    u => u.resource_id === resourceId && u.date === date && !u.is_available
  );

  if (unavail) {
    return {
      is_available: false,
      available_hours: 0,
      assigned_hours: 0,
      remaining_hours: 0,
      unavailability_type: unavail.unavailability_type,
      unavailability_notes: unavail.notes
    };
  }

  // Calculate assigned hours for the date
  const dateObj = new Date(date);
  const assignedHours = assignments
    .filter(a => {
      if (a.resource_id !== resourceId) return false;
      if (a.status === 'cancelled') return false;
      const start = new Date(a.start_date);
      const end = new Date(a.end_date);
      return dateObj >= start && dateObj <= end;
    })
    .reduce((sum, a) => {
      // Distribute planned hours across assignment days
      const days = countWorkingDays(a.start_date, a.end_date);
      const dailyHours = days > 0 ? (a.planned_hours || 0) / days : 0;
      return sum + dailyHours;
    }, 0);

  const availableHours = resource.daily_capacity;
  const remainingHours = availableHours - assignedHours;

  return {
    is_available: true,
    available_hours: availableHours,
    assigned_hours: assignedHours,
    remaining_hours: Math.max(0, remainingHours)
  };
}

/**
 * Detects over-allocation for a date
 */
export function detectOverAllocation(
  resourceId: string,
  date: string,
  additionalHours: number,
  resource: EngineeringResource,
  assignments: ResourceAssignment[],
  unavailabilityRecords: ResourceAvailability[]
): OverAllocationResult {
  const status = checkAvailability(resourceId, date, resource, assignments, unavailabilityRecords);
  
  const totalAssigned = status.assigned_hours + additionalHours;
  const isOverAllocated = totalAssigned > status.available_hours;

  return {
    is_over_allocated: isOverAllocated,
    date,
    available_hours: status.available_hours,
    assigned_hours: status.assigned_hours,
    requested_hours: additionalHours,
    excess_hours: isOverAllocated ? totalAssigned - status.available_hours : 0
  };
}


// =====================================================
// AVAILABILITY FUNCTIONS
// =====================================================

/**
 * Generates availability calendar for a resource
 */
export function generateAvailabilityCalendar(
  resource: EngineeringResource,
  startDate: string,
  endDate: string,
  assignments: ResourceAssignment[],
  unavailabilityRecords: ResourceAvailability[]
): DayAvailability[] {
  const dates = getDatesInRange(startDate, endDate);
  
  return dates.map(date => {
    const status = checkAvailability(
      resource.id,
      date,
      resource,
      assignments,
      unavailabilityRecords
    );

    const dayAssignments = assignments.filter(a => {
      if (a.resource_id !== resource.id) return false;
      if (a.status === 'cancelled') return false;
      const d = new Date(date);
      const start = new Date(a.start_date);
      const end = new Date(a.end_date);
      return d >= start && d <= end;
    });

    return {
      date,
      is_available: status.is_available,
      available_hours: status.available_hours,
      assigned_hours: status.assigned_hours,
      remaining_hours: status.remaining_hours,
      unavailability_type: status.unavailability_type,
      assignments: dayAssignments
    };
  });
}

/**
 * Gets remaining hours for a resource on a date
 */
export function getRemainingHours(
  resourceId: string,
  date: string,
  resource: EngineeringResource,
  assignments: ResourceAssignment[],
  unavailabilityRecords: ResourceAvailability[]
): number {
  const status = checkAvailability(resourceId, date, resource, assignments, unavailabilityRecords);
  return status.remaining_hours;
}

/**
 * Creates unavailability records for a date range
 */
export function createUnavailabilityRecords(
  resourceId: string,
  dates: string[],
  type: UnavailabilityType,
  notes?: string
): Omit<ResourceAvailability, 'id'>[] {
  return dates.map(date => ({
    resource_id: resourceId,
    date,
    is_available: false,
    available_hours: 0,
    unavailability_type: type,
    notes
  }));
}

/**
 * Detects assignments affected by unavailability
 */
export function detectUnavailabilityConflicts(
  resourceId: string,
  dates: string[],
  assignments: ResourceAssignment[]
): ResourceAssignment[] {
  return assignments.filter(a => {
    if (a.resource_id !== resourceId) return false;
    if (a.status === 'cancelled' || a.status === 'completed') return false;
    
    return dates.some(date => {
      const d = new Date(date);
      const start = new Date(a.start_date);
      const end = new Date(a.end_date);
      return d >= start && d <= end;
    });
  });
}

// =====================================================
// UTILIZATION CALCULATIONS
// =====================================================

/**
 * Calculates utilization percentage
 */
export function calculateUtilization(assignedHours: number, availableHours: number): number {
  if (availableHours <= 0) return 0;
  return (assignedHours / availableHours) * 100;
}

/**
 * Checks if utilization indicates over-allocation
 */
export function isOverAllocated(utilizationPercentage: number): boolean {
  return utilizationPercentage > 100;
}

/**
 * Calculates weekly utilization for a resource
 */
export function calculateWeeklyUtilization(
  resource: EngineeringResource,
  weekStart: Date,
  assignments: ResourceAssignment[],
  unavailabilityRecords: ResourceAvailability[]
): WeeklyUtilization {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const startStr = formatDateString(weekStart);
  const endStr = formatDateString(weekEnd);
  
  // Calculate available hours (5 working days * daily capacity, minus unavailable days)
  const dates = getDatesInRange(startStr, endStr);
  let availableHours = 0;
  
  for (const date of dates) {
    if (isWeekend(new Date(date))) continue;
    
    const unavail = unavailabilityRecords.find(
      u => u.resource_id === resource.id && u.date === date && !u.is_available
    );
    
    if (!unavail) {
      availableHours += resource.daily_capacity;
    }
  }

  // Calculate planned and actual hours from assignments
  let plannedHours = 0;
  let actualHours = 0;

  for (const assignment of assignments) {
    if (assignment.resource_id !== resource.id) continue;
    if (assignment.status === 'cancelled') continue;
    
    // Check if assignment overlaps with this week
    if (!dateRangesOverlap(startStr, endStr, assignment.start_date, assignment.end_date)) continue;

    // Calculate overlap days
    const overlapStart = new Date(Math.max(new Date(startStr).getTime(), new Date(assignment.start_date).getTime()));
    const overlapEnd = new Date(Math.min(new Date(endStr).getTime(), new Date(assignment.end_date).getTime()));
    
    const totalDays = countWorkingDays(assignment.start_date, assignment.end_date);
    const overlapDays = countWorkingDays(formatDateString(overlapStart), formatDateString(overlapEnd));
    
    if (totalDays > 0) {
      const ratio = overlapDays / totalDays;
      plannedHours += (assignment.planned_hours || 0) * ratio;
      actualHours += (assignment.actual_hours || 0) * ratio;
    }
  }

  const utilizationPercentage = calculateUtilization(plannedHours, availableHours);

  return {
    week_start: startStr,
    planned_hours: Math.round(plannedHours * 100) / 100,
    actual_hours: Math.round(actualHours * 100) / 100,
    available_hours: availableHours,
    utilization_percentage: Math.round(utilizationPercentage * 10) / 10
  };
}

/**
 * Aggregates utilization by resource type
 */
export function aggregateUtilizationByType(
  resources: EngineeringResource[],
  assignments: ResourceAssignment[],
  unavailabilityRecords: ResourceAvailability[],
  startDate: string,
  endDate: string
): TypeUtilization[] {
  const typeMap = new Map<ResourceType, {
    count: number;
    plannedHours: number;
    availableHours: number;
  }>();

  for (const resource of resources) {
    if (!resource.is_active) continue;

    const current = typeMap.get(resource.resource_type) || {
      count: 0,
      plannedHours: 0,
      availableHours: 0
    };

    current.count++;

    // Calculate available hours
    const dates = getDatesInRange(startDate, endDate);
    for (const date of dates) {
      if (isWeekend(new Date(date))) continue;
      
      const unavail = unavailabilityRecords.find(
        u => u.resource_id === resource.id && u.date === date && !u.is_available
      );
      
      if (!unavail) {
        current.availableHours += resource.daily_capacity;
      }
    }

    // Calculate planned hours
    for (const assignment of assignments) {
      if (assignment.resource_id !== resource.id) continue;
      if (assignment.status === 'cancelled') continue;
      
      if (dateRangesOverlap(startDate, endDate, assignment.start_date, assignment.end_date)) {
        const overlapStart = new Date(Math.max(new Date(startDate).getTime(), new Date(assignment.start_date).getTime()));
        const overlapEnd = new Date(Math.min(new Date(endDate).getTime(), new Date(assignment.end_date).getTime()));
        
        const totalDays = countWorkingDays(assignment.start_date, assignment.end_date);
        const overlapDays = countWorkingDays(formatDateString(overlapStart), formatDateString(overlapEnd));
        
        if (totalDays > 0) {
          current.plannedHours += (assignment.planned_hours || 0) * (overlapDays / totalDays);
        }
      }
    }

    typeMap.set(resource.resource_type, current);
  }

  return Array.from(typeMap.entries()).map(([type, data]) => ({
    resource_type: type,
    resource_count: data.count,
    total_planned_hours: Math.round(data.plannedHours * 100) / 100,
    total_available_hours: data.availableHours,
    average_utilization: Math.round(calculateUtilization(data.plannedHours, data.availableHours) * 10) / 10
  }));
}


// =====================================================
// FILTERING AND SORTING
// =====================================================

/**
 * Filters resources based on criteria
 */
export function filterResources(
  resources: EngineeringResource[],
  filters: ResourceFilters
): EngineeringResource[] {
  return resources.filter(resource => {
    // Filter by type
    if (filters.resource_type && resource.resource_type !== filters.resource_type) {
      return false;
    }

    // Filter by availability
    if (filters.is_available !== undefined && resource.is_available !== filters.is_available) {
      return false;
    }

    // Filter by skills (resource must have ALL specified skills)
    if (filters.skills && filters.skills.length > 0) {
      const resourceSkills = resource.skills || [];
      const hasAllSkills = filters.skills.every(skill => resourceSkills.includes(skill));
      if (!hasAllSkills) {
        return false;
      }
    }

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = resource.resource_name.toLowerCase().includes(searchLower);
      const matchesCode = resource.resource_code.toLowerCase().includes(searchLower);
      const matchesDescription = resource.description?.toLowerCase().includes(searchLower) || false;
      if (!matchesName && !matchesCode && !matchesDescription) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filters calendar resources based on criteria
 */
export function filterCalendarResources(
  resources: EngineeringResource[],
  filters: CalendarFilters
): EngineeringResource[] {
  return resources.filter(resource => {
    // Filter by resource types
    if (filters.resource_types && filters.resource_types.length > 0) {
      if (!filters.resource_types.includes(resource.resource_type)) {
        return false;
      }
    }

    // Filter by skills
    if (filters.skills && filters.skills.length > 0) {
      const resourceSkills = resource.skills || [];
      const hasAllSkills = filters.skills.every(skill => resourceSkills.includes(skill));
      if (!hasAllSkills) {
        return false;
      }
    }

    // Filter by specific resource IDs
    if (filters.resource_ids && filters.resource_ids.length > 0) {
      if (!filters.resource_ids.includes(resource.id)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts resources by field
 */
export function sortResources(
  resources: EngineeringResource[],
  sortBy: 'name' | 'code' | 'type' | 'created_at',
  ascending: boolean = true
): EngineeringResource[] {
  const sorted = [...resources].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.resource_name.localeCompare(b.resource_name);
        break;
      case 'code':
        comparison = a.resource_code.localeCompare(b.resource_code);
        break;
      case 'type':
        comparison = a.resource_type.localeCompare(b.resource_type);
        break;
      case 'created_at':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    
    return ascending ? comparison : -comparison;
  });
  
  return sorted;
}

// =====================================================
// CALENDAR CELL GENERATION
// =====================================================

/**
 * Generates a calendar cell for a resource and date
 */
export function generateCalendarCell(
  resource: EngineeringResource,
  date: string,
  assignments: ResourceAssignment[],
  unavailabilityRecords: ResourceAvailability[]
): CalendarCell {
  const status = checkAvailability(
    resource.id,
    date,
    resource,
    assignments,
    unavailabilityRecords
  );

  const dayAssignments = assignments.filter(a => {
    if (a.resource_id !== resource.id) return false;
    if (a.status === 'cancelled') return false;
    const d = new Date(date);
    const start = new Date(a.start_date);
    const end = new Date(a.end_date);
    return d >= start && d <= end;
  });

  return {
    resource_id: resource.id,
    date,
    is_available: status.is_available,
    available_hours: status.available_hours,
    assigned_hours: status.assigned_hours,
    remaining_hours: status.remaining_hours,
    assignments: dayAssignments,
    unavailability_type: status.unavailability_type
  };
}

// =====================================================
// CERTIFICATION EXPIRY
// =====================================================

/**
 * Gets certification expiry status
 */
export function getCertificationStatus(certification: Certification): CertificationStatus {
  if (!certification.expiry_date) {
    return 'valid';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiryDate = new Date(certification.expiry_date);
  expiryDate.setHours(0, 0, 0, 0);

  if (expiryDate < today) {
    return 'expired';
  }

  // Check if expiring within 30 days
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (expiryDate <= thirtyDaysFromNow) {
    return 'expiring_soon';
  }

  return 'valid';
}

/**
 * Gets days until certification expiry
 */
export function getDaysUntilExpiry(certification: Certification): number | null {
  if (!certification.expiry_date) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiryDate = new Date(certification.expiry_date);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

// =====================================================
// SKILL UTILITIES
// =====================================================

/**
 * Validates skill data structure
 */
export function validateSkillStructure(skill: ResourceSkill): boolean {
  return !!(skill.skill_code && skill.skill_name && skill.skill_category);
}

/**
 * Filters resources by required skills
 */
export function filterResourcesBySkills(
  resources: EngineeringResource[],
  requiredSkills: string[]
): EngineeringResource[] {
  if (!requiredSkills || requiredSkills.length === 0) {
    return resources;
  }

  return resources.filter(resource => {
    const resourceSkills = resource.skills || [];
    return requiredSkills.every(skill => resourceSkills.includes(skill));
  });
}

// =====================================================
// DISPLAY HELPERS
// =====================================================

/**
 * Gets display label for resource type
 */
export function getResourceTypeLabel(type: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    personnel: 'Personnel',
    equipment: 'Equipment',
    tool: 'Tool',
    vehicle: 'Vehicle'
  };
  return labels[type] || type;
}

/**
 * Gets display label for assignment status
 */
export function getAssignmentStatusLabel(status: AssignmentStatus): string {
  const labels: Record<AssignmentStatus, string> = {
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return labels[status] || status;
}

/**
 * Gets display label for unavailability type
 */
export function getUnavailabilityTypeLabel(type: UnavailabilityType): string {
  const labels: Record<UnavailabilityType, string> = {
    leave: 'Leave',
    training: 'Training',
    maintenance: 'Maintenance',
    holiday: 'Holiday',
    other: 'Other'
  };
  return labels[type] || type;
}

/**
 * Gets color class for utilization percentage
 */
export function getUtilizationColorClass(percentage: number): string {
  if (percentage > 100) return 'text-red-600 bg-red-50';
  if (percentage >= 80) return 'text-orange-600 bg-orange-50';
  if (percentage >= 50) return 'text-green-600 bg-green-50';
  return 'text-gray-600 bg-gray-50';
}

/**
 * Gets color class for assignment status
 */
export function getAssignmentStatusColorClass(status: AssignmentStatus): string {
  const colors: Record<AssignmentStatus, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
