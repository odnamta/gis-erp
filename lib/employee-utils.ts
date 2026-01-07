import {
  EmploymentType,
  EmployeeStatus,
  Gender,
  MaritalStatus,
  PositionLevel,
  Employee,
  EmployeeSummaryStats,
} from '@/types/employees';

// Employment type options for dropdowns
export const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'probation', label: 'Probation' },
  { value: 'intern', label: 'Intern' },
  { value: 'outsource', label: 'Outsource' },
];

// Employee status options for dropdowns
export const EMPLOYEE_STATUSES: { value: EmployeeStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
];

// Gender options for dropdowns
export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

// Marital status options for dropdowns
export const MARITAL_STATUSES: { value: MaritalStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

// Position level labels
export const POSITION_LEVELS: { value: PositionLevel; label: string }[] = [
  { value: 1, label: 'Staff' },
  { value: 2, label: 'Senior' },
  { value: 3, label: 'Lead' },
  { value: 4, label: 'Manager' },
  { value: 5, label: 'Director' },
];

/**
 * Generate employee code based on count
 * Format: EMP-XXX (e.g., EMP-001, EMP-002)
 */
export function generateEmployeeCode(count: number): string {
  const nextNumber = count + 1;
  return `EMP-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Get employment type label
 */
export function getEmploymentTypeLabel(type: EmploymentType): string {
  return EMPLOYMENT_TYPES.find((t) => t.value === type)?.label || type;
}

/**
 * Get employee status label
 */
export function getEmployeeStatusLabel(status: EmployeeStatus): string {
  return EMPLOYEE_STATUSES.find((s) => s.value === status)?.label || status;
}

/**
 * Get gender label
 */
export function getGenderLabel(gender: Gender): string {
  return GENDERS.find((g) => g.value === gender)?.label || gender;
}

/**
 * Get marital status label
 */
export function getMaritalStatusLabel(status: MaritalStatus): string {
  return MARITAL_STATUSES.find((s) => s.value === status)?.label || status;
}

/**
 * Get position level label
 */
export function getPositionLevelLabel(level: PositionLevel): string {
  return POSITION_LEVELS.find((l) => l.value === level)?.label || `Level ${level}`;
}


/**
 * Calculate employee summary statistics
 */
export function calculateEmployeeSummaryStats(employees: Employee[]): EmployeeSummaryStats {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return {
    total: employees.length,
    active: employees.filter((e) => e.status === 'active').length,
    onLeave: employees.filter((e) => e.status === 'on_leave').length,
    newThisMonth: employees.filter((e) => {
      const joinDate = new Date(e.join_date);
      return joinDate >= startOfMonth;
    }).length,
  };
}

/**
 * Filter employees by search term (name or code)
 */
export function filterEmployeesBySearch<T extends { full_name: string; employee_code: string }>(
  employees: T[],
  search: string
): T[] {
  if (!search.trim()) return employees;
  const searchLower = search.toLowerCase();
  return employees.filter(
    (e) =>
      e.full_name.toLowerCase().includes(searchLower) ||
      e.employee_code.toLowerCase().includes(searchLower)
  );
}

/**
 * Validate employee code format
 */
export function isValidEmployeeCode(code: string): boolean {
  return /^EMP-\d{3,}$/.test(code);
}

/**
 * Check if employee can be linked to user
 */
export function canLinkToUser(employee: Employee): boolean {
  return employee.user_id === null && employee.email !== null && employee.email.trim() !== '';
}

/**
 * Format salary for display (Indonesian Rupiah)
 */
export function formatSalary(amount: number | null, currency: string = 'IDR'): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Detect circular reporting relationships
 * Returns true if setting reportingTo would create a cycle
 */
export function hasCircularReporting(
  employeeId: string,
  reportingTo: string | null,
  employees: Employee[]
): boolean {
  if (!reportingTo) return false;
  if (employeeId === reportingTo) return true;
  
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const visited = new Set<string>();
  let current: string | null = reportingTo;
  
  while (current) {
    if (visited.has(current)) return true;
    if (current === employeeId) return true;
    visited.add(current);
    
    const manager = employeeMap.get(current);
    current = manager?.reporting_to || null;
  }
  
  return false;
}

/**
 * Validate employment type
 */
export function isValidEmploymentType(type: string): type is EmploymentType {
  return ['permanent', 'contract', 'probation', 'intern', 'outsource'].includes(type);
}

/**
 * Validate employee status
 */
export function isValidEmployeeStatus(status: string): status is EmployeeStatus {
  return ['active', 'on_leave', 'suspended', 'resigned', 'terminated'].includes(status);
}

/**
 * Validate position level (1-5)
 */
export function isValidPositionLevel(level: number): level is PositionLevel {
  return Number.isInteger(level) && level >= 1 && level <= 5;
}

/**
 * Format date for display (DD/MM/YYYY)
 */
export function formatEmployeeDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Calculate years of service
 */
export function calculateYearsOfService(joinDate: string): number {
  const join = new Date(joinDate);
  const now = new Date();
  const years = (now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(years * 10) / 10; // Round to 1 decimal
}
