// =====================================================
// v0.60: ENGINEERING - RESOURCE SCHEDULING TYPES
// =====================================================

// Enums
export type ResourceType = 'personnel' | 'equipment' | 'tool' | 'vehicle';
export type AssignmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type UnavailabilityType = 'leave' | 'training' | 'maintenance' | 'holiday' | 'other';
export type AssignmentTargetType = 'project' | 'job_order' | 'assessment' | 'route_survey' | 'jmp';
export type CapacityUnit = 'hours' | 'days';
export type SkillCategory = 'engineering' | 'design' | 'field' | 'operation';
export type CertificationStatus = 'valid' | 'expiring_soon' | 'expired';

export const RESOURCE_TYPES: ResourceType[] = ['personnel', 'equipment', 'tool', 'vehicle'];
export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled'];
export const UNAVAILABILITY_TYPES: UnavailabilityType[] = ['leave', 'training', 'maintenance', 'holiday', 'other'];
export const ASSIGNMENT_TARGET_TYPES: AssignmentTargetType[] = ['project', 'job_order', 'assessment', 'route_survey', 'jmp'];
export const SKILL_CATEGORIES: SkillCategory[] = ['engineering', 'design', 'field', 'operation'];

// Resource type prefixes for code generation
export const RESOURCE_TYPE_PREFIXES: Record<ResourceType, string> = {
  personnel: 'PER',
  equipment: 'EQP',
  tool: 'TL',
  vehicle: 'VEH'
};

// Labels for UI display
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  personnel: 'Personnel',
  equipment: 'Equipment',
  tool: 'Tool',
  vehicle: 'Vehicle'
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

export const UNAVAILABILITY_TYPE_LABELS: Record<UnavailabilityType, string> = {
  leave: 'Leave',
  training: 'Training',
  maintenance: 'Maintenance',
  holiday: 'Holiday',
  other: 'Other'
};

export const ASSIGNMENT_TARGET_LABELS: Record<AssignmentTargetType, string> = {
  project: 'Project',
  job_order: 'Job Order',
  assessment: 'Technical Assessment',
  route_survey: 'Route Survey',
  jmp: 'Journey Management Plan'
};

// Certification interface
export interface Certification {
  name: string;
  issued_date?: string;
  expiry_date?: string;
  issuing_body?: string;
}

// Core Types
export interface EngineeringResource {
  id: string;
  resource_type: ResourceType;
  resource_code: string;
  resource_name: string;
  description?: string;
  employee_id?: string;
  asset_id?: string;
  skills: string[];
  certifications: Certification[];
  capacity_unit?: CapacityUnit;
  daily_capacity: number;
  hourly_rate?: number;
  daily_rate?: number;
  is_available: boolean;
  unavailable_reason?: string;
  unavailable_until?: string;
  base_location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


export interface ResourceWithDetails extends EngineeringResource {
  employee?: {
    id: string;
    full_name: string;
    position?: string;
  };
  asset?: {
    id: string;
    asset_code: string;
    asset_name: string;
  };
  skill_details?: ResourceSkill[];
  current_assignments?: ResourceAssignment[];
}

export interface ResourceAssignment {
  id: string;
  resource_id: string;
  project_id?: string;
  job_order_id?: string;
  assessment_id?: string;
  route_survey_id?: string;
  jmp_id?: string;
  task_description?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  planned_hours?: number;
  actual_hours?: number;
  work_location?: string;
  status: AssignmentStatus;
  notes?: string;
  assigned_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentWithDetails extends ResourceAssignment {
  resource?: EngineeringResource;
  project?: { id: string; name: string; project_number?: string };
  job_order?: { id: string; jo_number: string };
  assessment?: { id: string; assessment_number: string };
  route_survey?: { id: string; survey_number: string };
  jmp?: { id: string; jmp_number: string };
  assigned_by_user?: { id: string; full_name: string };
}

export interface ResourceAvailability {
  id: string;
  resource_id: string;
  date: string;
  is_available: boolean;
  available_hours: number;
  unavailability_type?: UnavailabilityType;
  notes?: string;
}

export interface ResourceSkill {
  id: string;
  skill_code: string;
  skill_name: string;
  skill_category?: SkillCategory;
  is_active: boolean;
  created_at: string;
}

// Input Types
export interface ResourceInput {
  resource_type: ResourceType;
  resource_name: string;
  description?: string;
  employee_id?: string;
  asset_id?: string;
  skills?: string[];
  certifications?: Certification[];
  capacity_unit?: CapacityUnit;
  daily_capacity?: number;
  hourly_rate?: number;
  daily_rate?: number;
  base_location?: string;
  is_available?: boolean;
  unavailable_reason?: string;
  unavailable_until?: string;
}

export interface AssignmentInput {
  resource_id: string;
  target_type: AssignmentTargetType;
  target_id: string;
  task_description?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  planned_hours?: number;
  work_location?: string;
  notes?: string;
}

export interface UnavailabilityInput {
  resource_id: string;
  dates: string[];
  unavailability_type: UnavailabilityType;
  notes?: string;
}

export interface SkillInput {
  skill_code: string;
  skill_name: string;
  skill_category?: SkillCategory;
}

// Filter Types
export interface ResourceFilters {
  resource_type?: ResourceType;
  is_available?: boolean;
  skills?: string[];
  search?: string;
}

export interface AssignmentFilters {
  resource_id?: string;
  target_type?: AssignmentTargetType;
  target_id?: string;
  status?: AssignmentStatus;
  date_from?: string;
  date_to?: string;
}

export interface CalendarFilters {
  resource_types?: ResourceType[];
  skills?: string[];
  resource_ids?: string[];
}

export interface UtilizationFilters {
  date_from: string;
  date_to: string;
  resource_type?: ResourceType;
  resource_ids?: string[];
}

// Calendar Types
export interface CalendarData {
  resources: ResourceWithDetails[];
  dates: string[];
  cells: Map<string, CalendarCell>; // key: `${resource_id}_${date}`
}

export interface CalendarCell {
  resource_id: string;
  date: string;
  is_available: boolean;
  available_hours: number;
  assigned_hours: number;
  remaining_hours: number;
  assignments: ResourceAssignment[];
  unavailability_type?: UnavailabilityType;
}

export interface DayAvailability {
  date: string;
  is_available: boolean;
  available_hours: number;
  assigned_hours: number;
  remaining_hours: number;
  unavailability_type?: UnavailabilityType;
  assignments: ResourceAssignment[];
}

// Utilization Types
export interface WeeklyUtilization {
  week_start: string;
  planned_hours: number;
  actual_hours: number;
  available_hours: number;
  utilization_percentage: number;
}

export interface UtilizationReport {
  resource_id: string;
  resource_code: string;
  resource_name: string;
  resource_type: ResourceType;
  total_planned_hours: number;
  total_actual_hours: number;
  total_available_hours: number;
  utilization_percentage: number;
  is_over_allocated: boolean;
  weekly_breakdown: WeeklyUtilization[];
}

export interface TypeUtilization {
  resource_type: ResourceType;
  resource_count: number;
  total_planned_hours: number;
  total_available_hours: number;
  average_utilization: number;
}

// Conflict Types
export interface ConflictResult {
  has_conflict: boolean;
  conflicts: ConflictDetail[];
}

export interface ConflictDetail {
  type: 'assignment' | 'unavailability';
  date: string;
  assignment?: ResourceAssignment;
  unavailability_type?: UnavailabilityType;
  message: string;
}

export interface OverAllocationResult {
  is_over_allocated: boolean;
  date: string;
  available_hours: number;
  assigned_hours: number;
  requested_hours: number;
  excess_hours: number;
}

export interface AvailabilityStatus {
  is_available: boolean;
  available_hours: number;
  assigned_hours: number;
  remaining_hours: number;
  unavailability_type?: UnavailabilityType;
  unavailability_notes?: string;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// Date Range Type
export interface DateRange {
  start: string;
  end: string;
}
