// Manager Dashboard Utilities - Department-scoped dashboard logic

import { UserProfile, DepartmentScope, UserRole } from '@/types/permissions'
import { DEPARTMENT_STAFF_ROLES } from '@/lib/permissions'

/**
 * Dashboard widget types available for managers
 */
export type ManagerWidgetType =
  | 'pending_approvals'
  | 'team_activity'
  | 'department_kpis'
  | 'quotation_pipeline'
  | 'engineering_workload'
  | 'pjo_status'
  | 'jo_status'
  | 'bkk_pending'
  | 'invoice_aging'
  | 'employee_attendance'
  | 'training_compliance'
  | 'incident_summary'
  | 'equipment_status'

/**
 * Widget configuration for each department
 */
export const DEPARTMENT_WIDGETS: Record<DepartmentScope, ManagerWidgetType[]> = {
  marketing: [
    'quotation_pipeline',
    'team_activity',
    'department_kpis',
  ],
  engineering: [
    'engineering_workload',
    'team_activity',
    'department_kpis',
  ],
  administration: [
    'pjo_status',
    'pending_approvals',
    'invoice_aging',
    'team_activity',
  ],
  finance: [
    'bkk_pending',
    'invoice_aging',
    'department_kpis',
    'team_activity',
  ],
  operations: [
    'jo_status',
    'equipment_status',
    'team_activity',
    'department_kpis',
  ],
  assets: [
    'equipment_status',
    'team_activity',
    'department_kpis',
  ],
  hr: [
    'employee_attendance',
    'training_compliance',
    'team_activity',
    'department_kpis',
  ],
  hse: [
    'incident_summary',
    'training_compliance',
    'team_activity',
    'department_kpis',
  ],
}

/**
 * Widget display configuration
 */
export const WIDGET_CONFIG: Record<ManagerWidgetType, {
  title: string
  description: string
  size: 'small' | 'medium' | 'large'
}> = {
  pending_approvals: {
    title: 'Pending Approvals',
    description: 'Documents waiting for your review',
    size: 'medium',
  },
  team_activity: {
    title: 'Team Activity',
    description: 'Recent actions by your team members',
    size: 'medium',
  },
  department_kpis: {
    title: 'Department KPIs',
    description: 'Key performance indicators for your department',
    size: 'large',
  },
  quotation_pipeline: {
    title: 'Quotation Pipeline',
    description: 'Active quotations and their status',
    size: 'large',
  },
  engineering_workload: {
    title: 'Engineering Workload',
    description: 'Surveys, JMPs, and assessments in progress',
    size: 'medium',
  },
  pjo_status: {
    title: 'PJO Status',
    description: 'Proforma Job Orders overview',
    size: 'medium',
  },
  jo_status: {
    title: 'Job Order Status',
    description: 'Active job orders and their progress',
    size: 'medium',
  },
  bkk_pending: {
    title: 'Pending Disbursements',
    description: 'BKKs awaiting approval',
    size: 'medium',
  },
  invoice_aging: {
    title: 'Invoice Aging',
    description: 'Outstanding invoices by age',
    size: 'medium',
  },
  employee_attendance: {
    title: 'Employee Attendance',
    description: 'Today\'s attendance summary',
    size: 'small',
  },
  training_compliance: {
    title: 'Training Compliance',
    description: 'Training completion status',
    size: 'small',
  },
  incident_summary: {
    title: 'Incident Summary',
    description: 'Recent HSE incidents',
    size: 'medium',
  },
  equipment_status: {
    title: 'Equipment Status',
    description: 'Fleet and equipment overview',
    size: 'medium',
  },
}

/**
 * Get dashboard widgets for a manager based on their department scope
 */
export function getManagerDashboardWidgets(profile: UserProfile): ManagerWidgetType[] {
  const isManager = profile.role === 'marketing_manager' || profile.role === 'finance_manager' || profile.role === 'operations_manager'
  if (!isManager || !profile.department_scope?.length) {
    return []
  }
  
  const widgets = new Set<ManagerWidgetType>()
  
  // Always include pending approvals for managers
  widgets.add('pending_approvals')
  
  // Add widgets for each department in scope
  for (const dept of profile.department_scope) {
    const deptWidgets = DEPARTMENT_WIDGETS[dept]
    if (deptWidgets) {
      deptWidgets.forEach(w => widgets.add(w))
    }
  }
  
  return Array.from(widgets)
}

/**
 * Get the primary department for a manager (first in scope)
 */
export function getPrimaryDepartment(profile: UserProfile): DepartmentScope | null {
  const isManager = profile.role === 'marketing_manager' || profile.role === 'finance_manager' || profile.role === 'operations_manager'
  if (!isManager || !profile.department_scope?.length) {
    return null
  }
  return profile.department_scope[0]
}

/**
 * Check if a role is a manager role
 */
function isManagerRole(role: UserRole): boolean {
  return ['marketing_manager', 'finance_manager', 'operations_manager'].includes(role)
}

/**
 * Check if a manager oversees a specific department
 */
export function managerOverseesDepartment(
  profile: UserProfile,
  department: DepartmentScope
): boolean {
  if (!isManagerRole(profile.role)) return false
  return profile.department_scope?.includes(department) ?? false
}

/**
 * Get staff roles that a manager can see based on their department scope
 */
export function getManagerVisibleRoles(profile: UserProfile): string[] {
  if (!isManagerRole(profile.role) || !profile.department_scope?.length) {
    return []
  }
  
  const roles = new Set<string>()
  
  for (const dept of profile.department_scope) {
    const staffRoles = DEPARTMENT_STAFF_ROLES[dept]
    if (staffRoles) {
      staffRoles.forEach(r => roles.add(r))
    }
  }
  
  return Array.from(roles)
}

/**
 * Manager scope configuration for known managers
 */
export const KNOWN_MANAGER_SCOPES: Record<string, DepartmentScope[]> = {
  'hutamiarini@gama-group.co': ['marketing', 'engineering'],
  'ferisupriono@gama-group.co': ['administration', 'finance'],
  'rezapramana@gama-group.co': ['operations', 'assets'],
}

/**
 * Get default department scope for a manager based on their email
 */
export function getDefaultManagerScope(email: string): DepartmentScope[] {
  return KNOWN_MANAGER_SCOPES[email.toLowerCase()] || []
}

/**
 * Dashboard section configuration for managers
 */
export interface ManagerDashboardSection {
  id: string
  title: string
  widgets: ManagerWidgetType[]
  department?: DepartmentScope
}

/**
 * Get organized dashboard sections for a manager
 */
export function getManagerDashboardSections(profile: UserProfile): ManagerDashboardSection[] {
  if (!isManagerRole(profile.role) || !profile.department_scope?.length) {
    return []
  }
  
  const sections: ManagerDashboardSection[] = [
    {
      id: 'overview',
      title: 'Overview',
      widgets: ['pending_approvals', 'team_activity'],
    },
  ]
  
  // Add section for each department
  for (const dept of profile.department_scope) {
    const deptWidgets = DEPARTMENT_WIDGETS[dept]
    if (deptWidgets) {
      sections.push({
        id: dept,
        title: formatDepartmentName(dept),
        widgets: deptWidgets.filter(w => w !== 'team_activity'),
        department: dept,
      })
    }
  }
  
  return sections
}

/**
 * Format department name for display
 */
export function formatDepartmentName(dept: DepartmentScope): string {
  const names: Record<DepartmentScope, string> = {
    marketing: 'Marketing',
    engineering: 'Engineering',
    administration: 'Administration',
    finance: 'Finance',
    operations: 'Operations',
    assets: 'Assets',
    hr: 'Human Resources',
    hse: 'Health, Safety & Environment',
  }
  return names[dept] || dept
}
