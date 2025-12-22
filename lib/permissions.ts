// Permission utilities for Role-Based Access Control

import { UserRole, UserPermissions, UserProfile, FeatureKey } from '@/types/permissions'

/**
 * Owner email - auto-assigned owner role on login
 */
export const OWNER_EMAIL = 'dioatmando@gama-group.co'

/**
 * Default permissions for each role
 * CRITICAL: ops role has can_see_revenue and can_see_profit set to false
 */
export const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  owner: {
    can_see_revenue: true,
    can_see_profit: true,
    can_approve_pjo: true,
    can_manage_invoices: true,
    can_manage_users: true,
    can_create_pjo: true,
    can_fill_costs: true,
  },
  admin: {
    can_see_revenue: true,
    can_see_profit: true,
    can_approve_pjo: true,
    can_manage_invoices: true,
    can_manage_users: true,
    can_create_pjo: true,
    can_fill_costs: true,
  },
  manager: {
    can_see_revenue: true,
    can_see_profit: true,
    can_approve_pjo: true,
    can_manage_invoices: false,
    can_manage_users: false,
    can_create_pjo: true,
    can_fill_costs: true,
  },
  ops: {
    can_see_revenue: false, // CRITICAL: Hidden from ops
    can_see_profit: false, // CRITICAL: Hidden from ops
    can_approve_pjo: false,
    can_manage_invoices: false,
    can_manage_users: false,
    can_create_pjo: false,
    can_fill_costs: true,
  },
  finance: {
    can_see_revenue: true,
    can_see_profit: true,
    can_approve_pjo: false,
    can_manage_invoices: true,
    can_manage_users: false,
    can_create_pjo: true,
    can_fill_costs: false,
  },
  sales: {
    can_see_revenue: true,
    can_see_profit: false, // Sales sees revenue but not profit margins
    can_approve_pjo: false,
    can_manage_invoices: false,
    can_manage_users: false,
    can_create_pjo: true,
    can_fill_costs: false,
  },
  viewer: {
    can_see_revenue: false,
    can_see_profit: false,
    can_approve_pjo: false,
    can_manage_invoices: false,
    can_manage_users: false,
    can_create_pjo: false,
    can_fill_costs: false,
  },
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: UserRole): UserPermissions {
  return DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.viewer
}

/**
 * Feature access mapping based on permissions
 */
const FEATURE_PERMISSION_MAP: Record<FeatureKey, (profile: UserProfile) => boolean> = {
  'dashboard.full': (p) => p.role === 'owner' || (p.can_see_revenue && p.can_see_profit),
  'dashboard.ops': (p) => p.can_fill_costs,
  'dashboard.finance': (p) => p.can_manage_invoices || p.can_see_revenue,
  'customers.crud': (p) => p.role === 'owner' || p.role === 'admin' || p.role === 'manager',
  'customers.view': (p) => p.role !== 'ops',
  'projects.crud': (p) => p.role === 'owner' || p.role === 'admin' || p.role === 'manager',
  'projects.view': () => true,
  'pjo.create': (p) => p.can_create_pjo,
  'pjo.view_revenue': (p) => p.can_see_revenue,
  'pjo.view_costs': (p) => p.can_fill_costs || p.can_see_revenue,
  'pjo.approve': (p) => p.can_approve_pjo,
  'jo.view_full': (p) => p.can_see_revenue,
  'jo.view_costs': (p) => p.can_fill_costs || p.can_see_revenue,
  'jo.fill_costs': (p) => p.can_fill_costs,
  'invoices.crud': (p) => p.can_manage_invoices,
  'invoices.view': (p) => p.can_manage_invoices || p.can_see_revenue,
  'reports.pnl': (p) => p.can_see_revenue && p.can_see_profit,
  'users.manage': (p) => p.can_manage_users,
  // Vendor permissions
  'vendors.view': () => true, // All authenticated users can view
  'vendors.create': (p) => ['owner', 'admin', 'ops'].includes(p.role),
  'vendors.edit': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'vendors.delete': (p) => ['owner', 'admin'].includes(p.role),
  'vendors.verify': (p) => ['owner', 'admin'].includes(p.role),
  'vendors.set_preferred': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'vendors.add_equipment': (p) => ['owner', 'admin', 'manager', 'ops'].includes(p.role),
  'vendors.rate': (p) => ['owner', 'admin', 'manager', 'finance', 'ops'].includes(p.role),
  'vendors.view_bank': (p) => ['owner', 'admin', 'manager', 'finance'].includes(p.role),
  'vendors.nav': (p) => p.role !== 'viewer', // Show in nav for all except viewer
  // Vendor Invoice (AP) permissions
  'vendor_invoices.view': (p) => ['owner', 'admin', 'manager', 'finance'].includes(p.role),
  'vendor_invoices.create': (p) => ['owner', 'admin', 'finance'].includes(p.role),
  'vendor_invoices.edit': (p) => ['owner', 'admin', 'finance'].includes(p.role),
  'vendor_invoices.delete': (p) => ['owner', 'admin'].includes(p.role),
  'vendor_invoices.verify': (p) => ['owner', 'admin', 'finance'].includes(p.role),
  'vendor_invoices.approve': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'vendor_invoices.record_payment': (p) => ['owner', 'admin', 'finance'].includes(p.role),
  'vendor_invoices.nav': (p) => ['owner', 'admin', 'manager', 'finance'].includes(p.role),
  // Employee/HR permissions
  'employees.view': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'employees.create': (p) => ['owner', 'admin'].includes(p.role),
  'employees.edit': (p) => ['owner', 'admin'].includes(p.role),
  'employees.delete': (p) => ['owner', 'admin'].includes(p.role),
  'employees.view_salary': (p) => ['owner', 'admin', 'finance'].includes(p.role),
  'employees.edit_salary': (p) => ['owner', 'admin'].includes(p.role),
  'employees.nav': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  // Attendance permissions
  'attendance.view_own': () => true, // All authenticated users can view their own
  'attendance.clock': () => true, // All authenticated users can clock in/out
  'attendance.view_all': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'attendance.edit': (p) => ['owner', 'admin'].includes(p.role),
  'attendance.manage_schedules': (p) => ['owner', 'admin'].includes(p.role),
  'attendance.manage_holidays': (p) => ['owner', 'admin'].includes(p.role),
  'attendance.view_reports': (p) => ['owner', 'admin', 'manager', 'finance'].includes(p.role),
  'attendance.nav': () => true, // All authenticated users can see attendance nav
  // Finance Dashboard Enhanced permissions
  'finance_dashboard.view': (p) => ['finance', 'owner', 'admin', 'manager'].includes(p.role),
  'finance_dashboard.view_ar_ap': (p) => ['finance', 'owner', 'admin', 'manager'].includes(p.role),
  'finance_dashboard.view_cash_position': (p) => ['finance', 'owner', 'admin'].includes(p.role),
  'finance_dashboard.view_profit_margins': (p) => ['finance', 'owner', 'admin'].includes(p.role),
  'finance_dashboard.refresh': (p) => ['finance', 'owner', 'admin'].includes(p.role),
  'finance_dashboard.view_bkk_pending': (p) => ['finance', 'owner', 'admin', 'manager'].includes(p.role),
  // Sales/Engineering Dashboard permissions
  'sales_engineering_dashboard.view': (p) => ['sales', 'owner', 'admin', 'manager'].includes(p.role),
  'sales_engineering_dashboard.view_pipeline': (p) => ['sales', 'owner', 'admin', 'manager'].includes(p.role),
  'sales_engineering_dashboard.view_engineering': (p) => ['sales', 'owner', 'admin', 'manager'].includes(p.role),
  'sales_engineering_dashboard.refresh': (p) => ['sales', 'owner', 'admin', 'manager'].includes(p.role),
  // Asset/Equipment permissions
  'assets.view': (p) => ['owner', 'admin', 'manager', 'ops', 'finance'].includes(p.role),
  'assets.create': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'assets.edit': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'assets.change_status': (p) => ['owner', 'admin', 'manager', 'ops'].includes(p.role),
  'assets.view_financials': (p) => ['owner', 'admin', 'manager', 'finance'].includes(p.role),
  'assets.dispose': (p) => ['owner', 'admin'].includes(p.role),
  'assets.upload_documents': (p) => ['owner', 'admin', 'manager', 'ops'].includes(p.role),
  'assets.nav': (p) => ['owner', 'admin', 'manager', 'ops', 'finance'].includes(p.role),
  // Training permissions
  'training.view': (p) => ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer'].includes(p.role),
  'training.view_own': () => true, // All authenticated users can view their own training records
  'training.create_course': (p) => ['owner', 'admin'].includes(p.role),
  'training.edit_course': (p) => ['owner', 'admin'].includes(p.role),
  'training.create_record': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'training.edit_record': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'training.create_session': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'training.manage_session': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'training.view_compliance': (p) => ['owner', 'admin', 'manager'].includes(p.role),
  'training.nav': () => true, // All authenticated users can see training nav
}

/**
 * Check if a user profile can access a specific feature
 */
export function canAccessFeature(profile: UserProfile | null, feature: FeatureKey): boolean {
  if (!profile) return false
  const checker = FEATURE_PERMISSION_MAP[feature]
  return checker ? checker(profile) : false
}

/**
 * Check if profile has a specific permission
 */
export function hasPermission(
  profile: UserProfile | null,
  permission: keyof UserPermissions
): boolean {
  if (!profile) return false
  return profile[permission] ?? false
}

/**
 * Check if profile has one of the specified roles
 */
export function isRole(profile: UserProfile | null, role: UserRole | UserRole[]): boolean {
  if (!profile) return false
  const roles = Array.isArray(role) ? role : [role]
  return roles.includes(profile.role)
}

/**
 * Get dashboard type for a user based on their role and custom setting
 */
export function getDashboardType(profile: UserProfile | null): string {
  if (!profile) return 'viewer'
  if (profile.custom_dashboard !== 'default') {
    return profile.custom_dashboard
  }
  return profile.role
}

/**
 * Validate that at least one admin exists before removing admin permissions
 */
export function canRemoveAdminPermission(
  currentAdminCount: number,
  targetUserId: string,
  currentUserId: string
): { allowed: boolean; reason?: string } {
  if (currentAdminCount <= 1 && targetUserId === currentUserId) {
    return {
      allowed: false,
      reason: 'Cannot remove admin permissions from the last admin user',
    }
  }
  return { allowed: true }
}

/**
 * Get roles that can be assigned through the UI
 * Owner role cannot be assigned - it's auto-assigned based on email
 */
export function getAssignableRoles(): UserRole[] {
  return ['admin', 'manager', 'ops', 'finance', 'sales', 'viewer']
}

/**
 * Check if a user can modify another user's role/permissions
 * Owner cannot be modified by anyone
 */
export function canModifyUser(actorRole: UserRole, targetRole: UserRole): boolean {
  // Owner cannot be modified by anyone
  if (targetRole === 'owner') return false
  // Only owner and admin with can_manage_users can modify users
  return actorRole === 'owner' || actorRole === 'admin'
}

/**
 * Check if email matches the owner email (case-insensitive)
 */
export function isOwnerEmail(email: string): boolean {
  return email.toLowerCase() === OWNER_EMAIL.toLowerCase()
}

/**
 * Check if a user profile is pending (pre-registered but not logged in)
 */
export function isPendingUser(profile: UserProfile): boolean {
  return profile.user_id === null
}

// ============================================
// Vendor Permission Helpers
// ============================================

/**
 * Check if user can view vendors
 */
export function canViewVendors(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendors.view')
}

/**
 * Check if user can create vendors
 */
export function canCreateVendor(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendors.create')
}

/**
 * Check if user can edit vendors
 */
export function canEditVendor(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendors.edit')
}

/**
 * Check if user can delete vendors
 */
export function canDeleteVendor(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendors.delete')
}

/**
 * Check if user can verify vendors
 */
export function canVerifyVendor(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendors.verify')
}

/**
 * Check if user can set vendor as preferred
 */
export function canSetPreferredVendor(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendors.set_preferred')
}

/**
 * Check if user can add equipment to vendors
 */
export function canAddVendorEquipment(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendors.add_equipment')
}

/**
 * Check if user can rate vendors
 */
export function canRateVendor(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendors.rate')
}

/**
 * Check if user can view vendor bank details
 */
export function canViewVendorBankDetails(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendors.view_bank')
}

/**
 * Check if vendors should be shown in navigation
 */
export function canSeeVendorsNav(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendors.nav')
}

// ============================================
// Vendor Invoice (AP) Permission Helpers
// ============================================

/**
 * Check if user can view vendor invoices
 */
export function canViewVendorInvoices(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendor_invoices.view')
}

/**
 * Check if user can create vendor invoices
 */
export function canCreateVendorInvoice(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendor_invoices.create')
}

/**
 * Check if user can edit vendor invoices
 */
export function canEditVendorInvoice(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendor_invoices.edit')
}

/**
 * Check if user can delete vendor invoices
 */
export function canDeleteVendorInvoice(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendor_invoices.delete')
}

/**
 * Check if user can verify vendor invoices (3-way match)
 */
export function canVerifyVendorInvoice(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendor_invoices.verify')
}

/**
 * Check if user can approve vendor invoices for payment
 */
export function canApproveVendorInvoice(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendor_invoices.approve')
}

/**
 * Check if user can record payments for vendor invoices
 */
export function canRecordVendorPayment(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendor_invoices.record_payment')
}

/**
 * Check if vendor invoices should be shown in navigation
 */
export function canSeeVendorInvoicesNav(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'vendor_invoices.nav')
}


// ============================================
// Employee/HR Permission Helpers
// ============================================

/**
 * Check if user can view employees
 */
export function canViewEmployees(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'employees.view')
}

/**
 * Check if user can create employees
 */
export function canCreateEmployee(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'employees.create')
}

/**
 * Check if user can edit employees
 */
export function canEditEmployee(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'employees.edit')
}

/**
 * Check if user can delete employees
 */
export function canDeleteEmployee(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'employees.delete')
}

/**
 * Check if user can view employee salary information
 */
export function canViewEmployeeSalary(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'employees.view_salary')
}

/**
 * Check if user can edit employee salary information
 */
export function canEditEmployeeSalary(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'employees.edit_salary')
}

/**
 * Check if employees/HR should be shown in navigation
 */
export function canSeeEmployeesNav(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'employees.nav')
}

// ============================================
// Attendance Permission Helpers
// ============================================

/**
 * Check if user can view their own attendance
 */
export function canViewOwnAttendance(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'attendance.view_own')
}

/**
 * Check if user can clock in/out
 */
export function canClockAttendance(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'attendance.clock')
}

/**
 * Check if user can view all attendance records
 */
export function canViewAllAttendance(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'attendance.view_all')
}

/**
 * Check if user can edit attendance records
 */
export function canEditAttendance(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'attendance.edit')
}

/**
 * Check if user can manage work schedules
 */
export function canManageSchedules(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'attendance.manage_schedules')
}

/**
 * Check if user can manage holidays
 */
export function canManageHolidays(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'attendance.manage_holidays')
}

/**
 * Check if user can view attendance reports
 */
export function canViewAttendanceReports(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'attendance.view_reports')
}

/**
 * Check if attendance should be shown in navigation
 */
export function canSeeAttendanceNav(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'attendance.nav')
}


// ============================================
// Finance Dashboard Enhanced Permission Helpers
// ============================================

/**
 * Check if user can view the finance dashboard
 * Property 10: Role-Based Access Control - Finance role SHALL have access
 */
export function canViewFinanceDashboard(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'finance_dashboard.view')
}

/**
 * Check if user can view AR/AP totals
 * Property 10: Roles in ['finance', 'owner', 'admin', 'manager'] SHALL have access
 */
export function canViewARAPTotals(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'finance_dashboard.view_ar_ap')
}

/**
 * Check if user can view cash position details
 * Property 10: Roles in ['finance', 'owner', 'admin'] SHALL have access
 */
export function canViewCashPosition(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'finance_dashboard.view_cash_position')
}

/**
 * Check if user can view profit margins
 * Property 10: Roles in ['finance', 'owner', 'admin'] SHALL have access
 */
export function canViewProfitMargins(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'finance_dashboard.view_profit_margins')
}

/**
 * Check if user can refresh the finance dashboard data
 */
export function canRefreshFinanceDashboard(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'finance_dashboard.refresh')
}

/**
 * Check if user can view pending BKK approvals
 */
export function canViewPendingBKK(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'finance_dashboard.view_bkk_pending')
}


// ============================================
// Sales/Engineering Dashboard Permission Helpers
// ============================================

/**
 * Check if user can view the sales/engineering dashboard
 * Property 11: Dashboard Routing - sales role and Hutami SHALL have access
 */
export function canViewSalesEngineeringDashboard(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'sales_engineering_dashboard.view')
}

/**
 * Check if user can view sales pipeline data
 */
export function canViewSalesPipeline(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'sales_engineering_dashboard.view_pipeline')
}

/**
 * Check if user can view engineering workload data
 */
export function canViewEngineeringWorkload(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'sales_engineering_dashboard.view_engineering')
}

/**
 * Check if user can refresh the sales/engineering dashboard data
 */
export function canRefreshSalesEngineeringDashboard(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'sales_engineering_dashboard.refresh')
}


// ============================================
// Asset/Equipment Permission Helpers
// ============================================

/**
 * Check if user can view assets
 * Property 18: Owner, Admin, Manager, Ops, Finance roles SHALL have access
 */
export function canViewAssets(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'assets.view')
}

/**
 * Check if user can create assets
 * Property 18: Only Owner, Admin, Manager roles SHALL have access
 */
export function canCreateAsset(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'assets.create')
}

/**
 * Check if user can edit assets
 * Property 18: Only Owner, Admin, Manager roles SHALL have access
 */
export function canEditAsset(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'assets.edit')
}

/**
 * Check if user can change asset status
 * Property 18: Owner, Admin, Manager, Ops roles SHALL have access
 */
export function canChangeAssetStatus(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'assets.change_status')
}

/**
 * Check if user can view asset financial information
 * Property 18: Only Owner, Admin, Manager, Finance roles SHALL have access
 */
export function canViewAssetFinancials(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'assets.view_financials')
}

/**
 * Check if user can dispose/delete assets
 * Property 18: Only Owner, Admin roles SHALL have access
 */
export function canDisposeAsset(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'assets.dispose')
}

/**
 * Check if user can upload asset documents
 * Property 18: Owner, Admin, Manager, Ops roles SHALL have access
 */
export function canUploadAssetDocuments(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'assets.upload_documents')
}

/**
 * Check if assets/equipment should be shown in navigation
 */
export function canSeeAssetsNav(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'assets.nav')
}


// ============================================
// Training Permission Helpers
// ============================================

/**
 * Check if user can view training module
 * Property 10: All authenticated users SHALL have view access
 */
export function canViewTraining(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'training.view')
}

/**
 * Check if user can view their own training records
 * Property 10: All authenticated users SHALL have access to their own records
 */
export function canViewOwnTraining(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'training.view_own')
}

/**
 * Check if user can create training courses
 * Property 10: Only Owner, Admin roles SHALL have access
 */
export function canCreateTrainingCourse(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'training.create_course')
}

/**
 * Check if user can edit training courses
 * Property 10: Only Owner, Admin roles SHALL have access
 */
export function canEditTrainingCourse(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'training.edit_course')
}

/**
 * Check if user can create training records
 * Property 10: Owner, Admin, Manager roles SHALL have access
 */
export function canCreateTrainingRecord(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'training.create_record')
}

/**
 * Check if user can edit training records
 * Property 10: Owner, Admin, Manager roles SHALL have access
 */
export function canEditTrainingRecord(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'training.edit_record')
}

/**
 * Check if user can create training sessions
 * Property 10: Owner, Admin, Manager roles SHALL have access
 */
export function canCreateTrainingSession(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'training.create_session')
}

/**
 * Check if user can manage training sessions (complete, cancel, add participants)
 * Property 10: Owner, Admin, Manager roles SHALL have access
 */
export function canManageTrainingSession(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'training.manage_session')
}

/**
 * Check if user can view compliance matrix and reports
 * Property 10: Owner, Admin, Manager roles SHALL have access
 */
export function canViewTrainingCompliance(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'training.view_compliance')
}

/**
 * Check if training should be shown in navigation
 */
export function canSeeTrainingNav(profile: UserProfile | null): boolean {
  return canAccessFeature(profile, 'training.nav')
}
