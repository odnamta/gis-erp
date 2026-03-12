// Permission utilities for Role-Based Access Control - RBAC v0.9.11
// Inlined from @gama/erp-core/auth/permissions (core pkg not available on Vercel)

import { UserRole, UserPermissions, UserProfile, FeatureKey, DepartmentScope } from '@/types/permissions'

// GIS-specific owner email
export const OWNER_EMAIL = 'dioatmando@gama-group.co'

let _ownerEmail = OWNER_EMAIL

export function configureOwnerEmail(email: string): void {
  _ownerEmail = email
}

export function getOwnerEmail(): string {
  return _ownerEmail
}

export function isOwnerEmail(email: string): boolean {
  return _ownerEmail !== '' && email.toLowerCase() === _ownerEmail.toLowerCase()
}

// =====================================================
// ROLE GROUP CONSTANTS
// =====================================================

export const ADMIN_ROLES: readonly UserRole[] = ['owner', 'director', 'sysadmin'] as const
export const EXECUTIVE_ROLES: readonly UserRole[] = ['owner', 'director'] as const
export const FINANCE_ADMIN_ROLES: readonly UserRole[] = ['owner', 'director', 'sysadmin', 'finance_manager', 'finance'] as const
export const ALL_MANAGER_ROLES: readonly UserRole[] = ['owner', 'director', 'sysadmin', 'marketing_manager', 'finance_manager', 'operations_manager'] as const

export const DEPARTMENT_STAFF_ROLES: Record<DepartmentScope, UserRole[]> = {
  marketing: ['marketing'],
  engineering: ['engineer'],
  administration: ['administration'],
  finance: ['finance'],
  operations: ['ops'],
  assets: ['ops'],
  hr: ['hr'],
  hse: ['hse'],
}

export const DEPARTMENT_ROLES: Record<string, UserRole[]> = {
  'Operations': ['ops', 'operations_manager'],
  'Finance': ['finance', 'finance_manager', 'administration'],
  'Marketing': ['marketing', 'marketing_manager'],
  'HR': ['hr'],
  'HSE': ['hse'],
  'Engineering': ['engineer'],
  'Agency': ['agency'],
  'Customs': ['customs'],
  'Administration': ['administration'],
}

export function getDepartmentRoles(department: string): UserRole[] {
  return DEPARTMENT_ROLES[department] || []
}

// =====================================================
// DEFAULT PERMISSIONS PER ROLE
// =====================================================

export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  owner: {
    can_see_revenue: true, can_see_profit: true, can_see_actual_costs: true,
    can_approve_pjo: true, can_approve_jo: true, can_approve_bkk: true,
    can_check_pjo: true, can_check_jo: true, can_check_bkk: true,
    can_manage_invoices: true, can_manage_users: true, can_create_pjo: true,
    can_fill_costs: true, can_estimate_costs: true,
  },
  director: {
    can_see_revenue: true, can_see_profit: true, can_see_actual_costs: true,
    can_approve_pjo: true, can_approve_jo: true, can_approve_bkk: true,
    can_check_pjo: true, can_check_jo: true, can_check_bkk: true,
    can_manage_invoices: true, can_manage_users: true, can_create_pjo: true,
    can_fill_costs: true, can_estimate_costs: true,
  },
  marketing_manager: {
    can_see_revenue: true, can_see_profit: true, can_see_actual_costs: true,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: true, can_check_jo: true, can_check_bkk: true,
    can_manage_invoices: false, can_manage_users: false, can_create_pjo: true,
    can_fill_costs: false, can_estimate_costs: true,
  },
  finance_manager: {
    can_see_revenue: true, can_see_profit: true, can_see_actual_costs: true,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: true, can_check_jo: true, can_check_bkk: true,
    can_manage_invoices: true, can_manage_users: false, can_create_pjo: true,
    can_fill_costs: false, can_estimate_costs: false,
  },
  operations_manager: {
    can_see_revenue: true, can_see_profit: true, can_see_actual_costs: true,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: true, can_check_jo: true, can_check_bkk: true,
    can_manage_invoices: false, can_manage_users: false, can_create_pjo: true,
    can_fill_costs: true, can_estimate_costs: false,
  },
  sysadmin: {
    can_see_revenue: false, can_see_profit: false, can_see_actual_costs: false,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: false, can_check_jo: false, can_check_bkk: false,
    can_manage_invoices: false, can_manage_users: true, can_create_pjo: false,
    can_fill_costs: false, can_estimate_costs: false,
  },
  administration: {
    can_see_revenue: true, can_see_profit: false, can_see_actual_costs: true,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: false, can_check_jo: false, can_check_bkk: false,
    can_manage_invoices: true, can_manage_users: false, can_create_pjo: true,
    can_fill_costs: false, can_estimate_costs: false,
  },
  finance: {
    can_see_revenue: true, can_see_profit: true, can_see_actual_costs: true,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: false, can_check_jo: false, can_check_bkk: false,
    can_manage_invoices: true, can_manage_users: false, can_create_pjo: false,
    can_fill_costs: false, can_estimate_costs: false,
  },
  marketing: {
    can_see_revenue: true, can_see_profit: false, can_see_actual_costs: false,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: false, can_check_jo: false, can_check_bkk: false,
    can_manage_invoices: false, can_manage_users: false, can_create_pjo: true,
    can_fill_costs: false, can_estimate_costs: true,
  },
  ops: {
    can_see_revenue: false, can_see_profit: false, can_see_actual_costs: true,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: false, can_check_jo: false, can_check_bkk: false,
    can_manage_invoices: false, can_manage_users: false, can_create_pjo: false,
    can_fill_costs: true, can_estimate_costs: false,
  },
  engineer: {
    can_see_revenue: false, can_see_profit: false, can_see_actual_costs: false,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: false, can_check_jo: false, can_check_bkk: false,
    can_manage_invoices: false, can_manage_users: false, can_create_pjo: false,
    can_fill_costs: false, can_estimate_costs: false,
  },
  hr: {
    can_see_revenue: false, can_see_profit: false, can_see_actual_costs: false,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: false, can_check_jo: false, can_check_bkk: false,
    can_manage_invoices: false, can_manage_users: false, can_create_pjo: false,
    can_fill_costs: false, can_estimate_costs: false,
  },
  hse: {
    can_see_revenue: false, can_see_profit: false, can_see_actual_costs: false,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: false, can_check_jo: false, can_check_bkk: false,
    can_manage_invoices: false, can_manage_users: false, can_create_pjo: false,
    can_fill_costs: false, can_estimate_costs: false,
  },
  agency: {
    can_see_revenue: false, can_see_profit: false, can_see_actual_costs: false,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: false, can_check_jo: false, can_check_bkk: false,
    can_manage_invoices: false, can_manage_users: false, can_create_pjo: false,
    can_fill_costs: false, can_estimate_costs: false,
  },
  customs: {
    can_see_revenue: false, can_see_profit: false, can_see_actual_costs: false,
    can_approve_pjo: false, can_approve_jo: false, can_approve_bkk: false,
    can_check_pjo: false, can_check_jo: false, can_check_bkk: false,
    can_manage_invoices: false, can_manage_users: false, can_create_pjo: false,
    can_fill_costs: false, can_estimate_costs: false,
  },
}

export function getDefaultPermissions(role: UserRole): UserPermissions {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.ops
}

export function getInheritedRoles(profile: UserProfile): UserRole[] {
  if (!['marketing_manager', 'finance_manager', 'operations_manager'].includes(profile.role) || !profile.department_scope?.length) {
    return []
  }
  const inheritedRoles: UserRole[] = []
  for (const dept of profile.department_scope) {
    const staffRoles = DEPARTMENT_STAFF_ROLES[dept]
    if (staffRoles) inheritedRoles.push(...staffRoles)
  }
  return [...new Set(inheritedRoles)]
}

// =====================================================
// FEATURE PERMISSION MAP
// =====================================================

const FEATURE_PERMISSION_MAP: Record<FeatureKey, (profile: UserProfile) => boolean> = {
  'dashboard.executive': (p) => ['owner', 'director'].includes(p.role),
  'dashboard.manager': (p) => ['marketing_manager', 'finance_manager', 'operations_manager'].includes(p.role),
  'dashboard.marketing': (p) => ['owner', 'director', 'marketing_manager', 'marketing'].includes(p.role),
  'dashboard.operations': (p) => ['owner', 'director', 'operations_manager', 'ops'].includes(p.role),
  'dashboard.finance': (p) => ['owner', 'director', 'finance_manager', 'finance', 'administration'].includes(p.role),
  'dashboard.hr': (p) => ['owner', 'director', 'hr'].includes(p.role),
  'dashboard.hse': (p) => ['owner', 'director', 'hse'].includes(p.role),
  'dashboard.engineering': (p) => ['owner', 'director', 'marketing_manager', 'engineer', 'hse'].includes(p.role),
  'dashboard.full': (p) => p.role === 'owner' || p.role === 'director' || (p.can_see_revenue && p.can_see_profit),
  'dashboard.ops': (p) => p.can_fill_costs,
  'workflow.pjo.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'administration'].includes(p.role),
  'workflow.pjo.check': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager'].includes(p.role),
  'workflow.pjo.approve': (p) => ['owner', 'director'].includes(p.role),
  'workflow.jo.check': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager'].includes(p.role),
  'workflow.jo.approve': (p) => ['owner', 'director'].includes(p.role),
  'workflow.bkk.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance'].includes(p.role),
  'workflow.bkk.check': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager'].includes(p.role),
  'workflow.bkk.approve': (p) => ['owner', 'director'].includes(p.role),
  'customers.crud': (p) => ['owner', 'director', 'marketing_manager', 'marketing', 'operations_manager', 'administration'].includes(p.role),
  'customers.view': (p) => !['sysadmin'].includes(p.role),
  'customers.create': (p) => ['owner', 'director', 'marketing_manager', 'marketing', 'operations_manager', 'administration'].includes(p.role),
  'customers.edit': (p) => ['owner', 'director', 'marketing_manager', 'marketing', 'operations_manager', 'administration'].includes(p.role),
  'customers.delete': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'quotations.view': (p) => ['owner', 'director', 'marketing_manager', 'marketing', 'engineer', 'administration'].includes(p.role),
  'quotations.create': (p) => ['owner', 'director', 'marketing_manager', 'marketing'].includes(p.role),
  'quotations.edit': (p) => ['owner', 'director', 'marketing_manager', 'marketing'].includes(p.role),
  'quotations.approve': (p) => ['owner', 'director', 'marketing_manager'].includes(p.role),
  'quotations.cost_estimation': (p) => ['owner', 'director', 'marketing_manager', 'marketing'].includes(p.role),
  'quotations.engineering_review': (p) => ['owner', 'director', 'marketing_manager', 'engineer'].includes(p.role),
  'projects.crud': (p) => ['owner', 'director', 'marketing_manager', 'marketing', 'engineer', 'operations_manager', 'administration'].includes(p.role),
  'projects.view': (p) => !['sysadmin'].includes(p.role),
  'pjo.create': (p) => p.can_create_pjo,
  'pjo.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance', 'ops'].includes(p.role),
  'pjo.edit': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'administration'].includes(p.role),
  'pjo.view_revenue': (p) => p.can_see_revenue,
  'pjo.view_costs': (p) => p.can_fill_costs || p.can_see_revenue,
  'pjo.check': (p) => p.can_check_pjo,
  'pjo.approve': (p) => p.can_approve_pjo,
  'jo.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance', 'ops', 'marketing', 'engineer', 'customs'].includes(p.role),
  'jo.view_full': (p) => p.can_see_revenue,
  'jo.view_revenue': (p) => p.can_see_revenue,
  'jo.view_costs': (p) => p.can_fill_costs || p.can_see_revenue,
  'jo.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager'].includes(p.role),
  'jo.edit': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops'].includes(p.role),
  'jo.add_expense': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops'].includes(p.role),
  'jo.fill_costs': (p) => p.can_fill_costs,
  'jo.check': (p) => p.can_check_jo,
  'jo.approve': (p) => p.can_approve_jo,
  'jo.create_ba': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops'].includes(p.role),
  'jo.create_sj': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops'].includes(p.role),
  'invoices.crud': (p) => p.can_manage_invoices,
  'invoices.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'administration', 'finance'].includes(p.role),
  'invoices.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'administration', 'finance'].includes(p.role),
  'invoices.edit': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'administration', 'finance'].includes(p.role),
  'payments.view': (p) => ['owner', 'director', 'finance_manager', 'finance'].includes(p.role),
  'payments.create': (p) => ['owner', 'director', 'finance_manager', 'finance'].includes(p.role),
  'bkk.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance'].includes(p.role),
  'bkk.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance'].includes(p.role),
  'bkk.check': (p) => p.can_check_bkk,
  'bkk.approve': (p) => p.can_approve_bkk,
  'reports.pnl': (p) => p.can_see_revenue && p.can_see_profit,
  'reports.profit': (p) => ['owner', 'director', 'finance_manager', 'finance'].includes(p.role),
  'reports.revenue': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'finance', 'marketing'].includes(p.role),
  'assets.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'administration', 'finance', 'hse', 'engineer'].includes(p.role),
  'assets.create': (p) => ['owner', 'director', 'operations_manager'].includes(p.role),
  'assets.edit': (p) => ['owner', 'director', 'operations_manager', 'ops'].includes(p.role),
  'assets.change_status': (p) => ['owner', 'director', 'operations_manager', 'ops'].includes(p.role),
  'assets.view_financials': (p) => ['owner', 'director', 'finance_manager', 'finance'].includes(p.role),
  'assets.dispose': (p) => ['owner', 'director'].includes(p.role),
  'assets.upload_documents': (p) => ['owner', 'director', 'operations_manager', 'ops'].includes(p.role),
  'assets.nav': (p) => ['owner', 'director', 'operations_manager', 'ops', 'finance'].includes(p.role),
  'maintenance.view': (p) => ['owner', 'director', 'operations_manager', 'ops'].includes(p.role),
  'maintenance.create': (p) => ['owner', 'director', 'operations_manager', 'ops'].includes(p.role),
  'hr.employees.view': (p) => ['owner', 'director', 'hr'].includes(p.role),
  'hr.employees.view_own': () => true,
  'hr.employees.create': (p) => ['owner', 'director', 'sysadmin', 'hr'].includes(p.role),
  'hr.employees.edit': (p) => ['owner', 'director', 'hr'].includes(p.role),
  'hr.employees.delete': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'hr.employees.salary': (p) => ['owner', 'director', 'hr', 'finance'].includes(p.role),
  'hr.attendance.view_all': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr'].includes(p.role),
  'hr.attendance.view_own': () => true,
  'hr.leave.approve': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr'].includes(p.role),
  'hr.payroll.view': (p) => ['owner', 'director', 'hr', 'finance'].includes(p.role),
  'hr.payroll.run': (p) => ['owner', 'director', 'hr', 'finance'].includes(p.role),
  'hr.nav': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr'].includes(p.role),
  'hse.incidents.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'hse', 'engineer'].includes(p.role),
  'hse.incidents.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'hse'].includes(p.role),
  'hse.incidents.investigate': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hse'].includes(p.role),
  'hse.permits.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'hse', 'engineer'].includes(p.role),
  'hse.permits.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hse'].includes(p.role),
  'hse.documents.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hse', 'administration', 'hr'].includes(p.role),
  'hse.training.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr', 'hse'].includes(p.role),
  'hse.training.view_own': () => true,
  'hse.training.manage': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr', 'hse'].includes(p.role),
  'hse.medical_checkups.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hse', 'hr'].includes(p.role),
  'hse.medical_checkups.manage': (p) => ['owner', 'director', 'sysadmin', 'hse', 'hr'].includes(p.role),
  'hse.ppe.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hse', 'ops'].includes(p.role),
  'hse.ppe.manage': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hse'].includes(p.role),
  'hse.nav': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'ops', 'hse', 'engineer'].includes(p.role),
  'engineering.surveys.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer', 'ops', 'marketing', 'hse'].includes(p.role),
  'engineering.surveys.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer', 'hse'].includes(p.role),
  'engineering.jmp.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer', 'ops', 'marketing', 'hse'].includes(p.role),
  'engineering.jmp.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer', 'hse'].includes(p.role),
  'engineering.drawings.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer', 'ops', 'hse'].includes(p.role),
  'engineering.drawings.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer', 'hse', 'marketing'].includes(p.role),
  'engineering.assessments.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer', 'hse'].includes(p.role),
  'engineering.assessments.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer', 'hse'].includes(p.role),
  'engineering.resources.create': (p) => ['owner', 'director', 'sysadmin', 'operations_manager', 'engineer', 'hse', 'marketing_manager', 'marketing'].includes(p.role),
  'engineering.resources.manage': (p) => ['owner', 'director', 'sysadmin', 'operations_manager', 'engineer', 'hse', 'marketing_manager', 'marketing'].includes(p.role),
  'engineering.nav': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer', 'ops', 'hse', 'marketing'].includes(p.role),
  'admin.users.view': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'admin.users.create': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'admin.users.edit': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'admin.users.delete': (p) => ['owner', 'sysadmin'].includes(p.role),
  'admin.settings': (p) => ['owner', 'sysadmin'].includes(p.role),
  'admin.audit_logs': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'users.manage': (p) => p.can_manage_users,
  'vendors.view': () => true,
  'vendors.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'ops'].includes(p.role),
  'vendors.edit': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager'].includes(p.role),
  'vendors.delete': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'vendors.verify': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'vendors.set_preferred': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager'].includes(p.role),
  'vendors.add_equipment': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops'].includes(p.role),
  'vendors.rate': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'finance', 'ops'].includes(p.role),
  'vendors.view_bank': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'finance'].includes(p.role),
  'vendors.nav': (p) => !['sysadmin', 'hr'].includes(p.role),
  'vendor_invoices.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance'].includes(p.role),
  'vendor_invoices.create': (p) => ['owner', 'director', 'administration', 'finance'].includes(p.role),
  'vendor_invoices.edit': (p) => ['owner', 'director', 'administration', 'finance'].includes(p.role),
  'vendor_invoices.delete': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'vendor_invoices.verify': (p) => ['owner', 'director', 'administration', 'finance'].includes(p.role),
  'vendor_invoices.approve': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager'].includes(p.role),
  'vendor_invoices.record_payment': (p) => ['owner', 'director', 'administration', 'finance'].includes(p.role),
  'vendor_invoices.nav': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance'].includes(p.role),
  'employees.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr'].includes(p.role),
  'employees.create': (p) => ['owner', 'director', 'sysadmin', 'hr'].includes(p.role),
  'employees.edit': (p) => ['owner', 'director', 'hr'].includes(p.role),
  'employees.delete': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'employees.view_salary': (p) => ['owner', 'director', 'hr', 'finance'].includes(p.role),
  'employees.edit_salary': (p) => ['owner', 'director', 'hr'].includes(p.role),
  'employees.nav': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr'].includes(p.role),
  'attendance.view_own': () => true,
  'attendance.clock': () => true,
  'attendance.view_all': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr'].includes(p.role),
  'attendance.edit': (p) => ['owner', 'director', 'hr'].includes(p.role),
  'attendance.manage_schedules': (p) => ['owner', 'director', 'hr'].includes(p.role),
  'attendance.manage_holidays': (p) => ['owner', 'director', 'hr'].includes(p.role),
  'attendance.view_reports': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr', 'finance'].includes(p.role),
  'attendance.nav': () => true,
  'finance_dashboard.view': (p) => ['finance', 'owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration'].includes(p.role),
  'finance_dashboard.view_ar_ap': (p) => ['finance', 'owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration'].includes(p.role),
  'finance_dashboard.view_cash_position': (p) => ['finance', 'owner', 'director'].includes(p.role),
  'finance_dashboard.view_profit_margins': (p) => ['finance', 'owner', 'director'].includes(p.role),
  'finance_dashboard.refresh': (p) => ['finance', 'owner', 'director'].includes(p.role),
  'finance_dashboard.view_bkk_pending': (p) => ['finance', 'owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration'].includes(p.role),
  'sales_engineering_dashboard.view': (p) => ['marketing', 'owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer'].includes(p.role),
  'sales_engineering_dashboard.view_pipeline': (p) => ['marketing', 'owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager'].includes(p.role),
  'sales_engineering_dashboard.view_engineering': (p) => ['marketing', 'owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'engineer'].includes(p.role),
  'sales_engineering_dashboard.refresh': (p) => ['marketing', 'owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager'].includes(p.role),
  'training.view': () => true,
  'training.view_own': () => true,
  'training.create_course': (p) => ['owner', 'director', 'hr', 'hse'].includes(p.role),
  'training.edit_course': (p) => ['owner', 'director', 'hr', 'hse'].includes(p.role),
  'training.create_record': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr', 'hse'].includes(p.role),
  'training.edit_record': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr', 'hse'].includes(p.role),
  'training.create_session': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr', 'hse'].includes(p.role),
  'training.manage_session': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr', 'hse'].includes(p.role),
  'training.view_compliance': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hr', 'hse'].includes(p.role),
  'training.nav': () => true,
  'audits.view': () => true,
  'audits.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'hse'].includes(p.role),
  'audits.conduct': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'hse'].includes(p.role),
  'audits.complete': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'hse'].includes(p.role),
  'audits.manage_types': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'audits.create_finding': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'hse'].includes(p.role),
  'audits.close_finding': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'hse'].includes(p.role),
  'audits.verify_finding': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'hse'].includes(p.role),
  'audits.nav': () => true,
  'pib.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'finance', 'administration', 'customs', 'marketing'].includes(p.role),
  'pib.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'customs'].includes(p.role),
  'pib.edit': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'customs'].includes(p.role),
  'pib.delete': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'pib.view_duties': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'finance', 'administration', 'customs'].includes(p.role),
  'pib.update_status': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'customs'].includes(p.role),
  'pib.nav': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'finance', 'administration', 'customs'].includes(p.role),
  'peb.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'finance', 'administration', 'customs', 'marketing'].includes(p.role),
  'peb.create': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'customs'].includes(p.role),
  'peb.edit': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'customs'].includes(p.role),
  'peb.delete': (p) => ['owner', 'director', 'sysadmin'].includes(p.role),
  'peb.update_status': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'customs'].includes(p.role),
  'peb.nav': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'ops', 'finance', 'administration', 'customs', 'marketing'].includes(p.role),
  'assets.certifications.view': (p) => ['owner', 'director', 'operations_manager', 'ops', 'hse', 'administration', 'finance'].includes(p.role),
  'hse.training.request': () => true,
  'hr.reimbursement.view': () => true,
  'hr.reimbursement.create': () => true,
  'hr.reimbursement.approve': (p) => ['owner', 'director', 'operations_manager', 'finance_manager', 'hr'].includes(p.role),
  'finance.reimbursement.pay': (p) => ['owner', 'director', 'finance_manager', 'finance'].includes(p.role),
  'vendors.po.view': (p) => ['owner', 'director', 'marketing_manager', 'finance_manager', 'operations_manager', 'administration', 'finance', 'ops'].includes(p.role),
  'vendors.po.create': (p) => ['owner', 'director', 'operations_manager', 'administration', 'finance'].includes(p.role),
  'vendors.po.approve': (p) => ['owner', 'director', 'finance_manager'].includes(p.role),
  'vendors.po.receive': (p) => ['owner', 'director', 'operations_manager', 'ops', 'administration'].includes(p.role),
}

export function canAccessFeature(profile: UserProfile | null, feature: FeatureKey): boolean {
  if (!profile) return false
  const checker = FEATURE_PERMISSION_MAP[feature]
  if (!checker) return false
  const userRoles = profile.roles?.length ? profile.roles : [profile.role]
  for (const userRole of userRoles) {
    const virtualProfile = { ...profile, role: userRole }
    if (checker(virtualProfile)) return true
  }
  const managerRoles = userRoles.filter(r =>
    ['marketing_manager', 'finance_manager', 'operations_manager'].includes(r)
  )
  if (managerRoles.length > 0 && profile.department_scope?.length) {
    const inherited = getInheritedRoles(profile)
    for (const inheritedRole of inherited) {
      const virtualProfile = { ...profile, role: inheritedRole }
      if (checker(virtualProfile)) return true
    }
  }
  return false
}

export function hasPermission(profile: UserProfile | null, permission: keyof UserPermissions): boolean {
  if (!profile) return false
  return profile[permission] ?? false
}

export function isRole(profile: UserProfile | null, role: UserRole | UserRole[]): boolean {
  if (!profile) return false
  const requiredRoles = Array.isArray(role) ? role : [role]
  const userRoles = profile.roles?.length ? profile.roles : [profile.role]
  return requiredRoles.some(r => userRoles.includes(r))
}

export function getDashboardType(profile: UserProfile | null): string {
  if (!profile) return 'default'
  if (profile.custom_dashboard && profile.custom_dashboard !== 'default') return profile.custom_dashboard
  const roleDashboardMap: Record<UserRole, string> = {
    owner: 'executive', director: 'executive',
    marketing_manager: 'marketing_manager', finance_manager: 'finance_manager',
    operations_manager: 'operations_manager', sysadmin: 'sysadmin',
    administration: 'admin_finance', finance: 'admin_finance',
    marketing: 'marketing', ops: 'operations', engineer: 'engineering',
    hr: 'hr', hse: 'hse', agency: 'agency', customs: 'customs',
  }
  return roleDashboardMap[profile.role] || 'default'
}

export function getAssignableRoles(): UserRole[] {
  return ['director', 'marketing_manager', 'finance_manager', 'operations_manager', 'sysadmin', 'administration', 'finance', 'marketing', 'ops', 'engineer', 'hr', 'hse', 'agency', 'customs']
}

export function canModifyUser(actorRole: UserRole, targetRole: UserRole): boolean {
  if (targetRole === 'owner') return false
  return ['owner', 'director', 'sysadmin'].includes(actorRole)
}

export function isPendingUser(profile: UserProfile): boolean {
  return profile.user_id === null
}

export function canViewEmployees(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'hr.employees.view') }
export function canCreateEmployee(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'hr.employees.create') }
export function canEditEmployee(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'hr.employees.edit') }
export function canViewEmployeeSalary(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'hr.employees.salary') }
export function canEditEmployeeSalary(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'hr.employees.salary') }
export function canViewAssets(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'assets.view') }
export function canCreateAsset(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'assets.create') }
export function canEditAsset(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'assets.edit') }
export function canChangeAssetStatus(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'assets.change_status') }
export function canViewAssetFinancials(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'assets.view_financials') }
export function canDisposeAsset(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'assets.dispose') }
export function canUploadAssetDocuments(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'assets.upload_documents') }
export function canViewPEB(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'peb.view') }
export function canCreatePEB(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'peb.create') }
export function canEditPEB(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'peb.edit') }
export function canDeletePEB(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'peb.delete') }
export function canViewPIB(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'pib.view') }
export function canCreatePIB(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'pib.create') }
export function canEditPIB(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'pib.edit') }
export function canDeletePIB(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'pib.delete') }
export function canViewPIBDuties(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'pib.view_duties') }
export function canUpdatePIBStatus(profile: UserProfile | null): boolean { return canAccessFeature(profile, 'pib.update_status') }
export function getUserRole(profile: UserProfile | null): UserRole | null { return profile?.role || null }
export function getUserId(profile: UserProfile | null): string | null { return profile?.user_id || null }
