// Role-Based Access Control Types

export type UserRole = 'owner' | 'admin' | 'manager' | 'ops' | 'finance' | 'sales' | 'viewer'

export type DashboardType = 'owner' | 'admin' | 'manager' | 'ops' | 'finance' | 'sales' | 'viewer' | 'default'

export interface UserPermissions {
  can_see_revenue: boolean
  can_see_profit: boolean
  can_approve_pjo: boolean
  can_manage_invoices: boolean
  can_manage_users: boolean
  can_create_pjo: boolean
  can_fill_costs: boolean
}

export interface UserProfile {
  id: string
  user_id: string | null  // null for pre-registered users
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  custom_dashboard: DashboardType
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null  // track login activity
  // Permissions
  can_see_revenue: boolean
  can_see_profit: boolean
  can_approve_pjo: boolean
  can_manage_invoices: boolean
  can_manage_users: boolean
  can_create_pjo: boolean
  can_fill_costs: boolean
}

export type FeatureKey =
  | 'dashboard.full'
  | 'dashboard.ops'
  | 'dashboard.finance'
  | 'customers.crud'
  | 'customers.view'
  | 'projects.crud'
  | 'projects.view'
  | 'pjo.create'
  | 'pjo.view_revenue'
  | 'pjo.view_costs'
  | 'pjo.approve'
  | 'jo.view_full'
  | 'jo.view_costs'
  | 'jo.fill_costs'
  | 'invoices.crud'
  | 'invoices.view'
  | 'reports.pnl'
  | 'users.manage'
  // Vendor permissions
  | 'vendors.view'
  | 'vendors.create'
  | 'vendors.edit'
  | 'vendors.delete'
  | 'vendors.verify'
  | 'vendors.set_preferred'
  | 'vendors.add_equipment'
  | 'vendors.rate'
  | 'vendors.view_bank'
  | 'vendors.nav'
  // Vendor Invoice (AP) permissions
  | 'vendor_invoices.view'
  | 'vendor_invoices.create'
  | 'vendor_invoices.edit'
  | 'vendor_invoices.delete'
  | 'vendor_invoices.verify'
  | 'vendor_invoices.approve'
  | 'vendor_invoices.record_payment'
  | 'vendor_invoices.nav'
  // Employee/HR permissions
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'employees.view_salary'
  | 'employees.edit_salary'
  | 'employees.nav'
  // Attendance permissions
  | 'attendance.view_own'
  | 'attendance.clock'
  | 'attendance.view_all'
  | 'attendance.edit'
  | 'attendance.manage_schedules'
  | 'attendance.manage_holidays'
  | 'attendance.view_reports'
  | 'attendance.nav'
  // Finance Dashboard Enhanced permissions
  | 'finance_dashboard.view'
  | 'finance_dashboard.view_ar_ap'
  | 'finance_dashboard.view_cash_position'
  | 'finance_dashboard.view_profit_margins'
  | 'finance_dashboard.refresh'
  | 'finance_dashboard.view_bkk_pending'
  // Sales/Engineering Dashboard permissions
  | 'sales_engineering_dashboard.view'
  | 'sales_engineering_dashboard.view_pipeline'
  | 'sales_engineering_dashboard.view_engineering'
  | 'sales_engineering_dashboard.refresh'
  // Asset/Equipment permissions
  | 'assets.view'
  | 'assets.create'
  | 'assets.edit'
  | 'assets.change_status'
  | 'assets.view_financials'
  | 'assets.dispose'
  | 'assets.upload_documents'
  | 'assets.nav'
  // Training permissions
  | 'training.view'
  | 'training.view_own'
  | 'training.create_course'
  | 'training.edit_course'
  | 'training.create_record'
  | 'training.edit_record'
  | 'training.create_session'
  | 'training.manage_session'
  | 'training.view_compliance'
  | 'training.nav'

export interface PermissionContextType {
  profile: UserProfile | null
  isLoading: boolean
  hasPermission: (permission: keyof UserPermissions) => boolean
  isRole: (role: UserRole | UserRole[]) => boolean
  canAccess: (feature: FeatureKey) => boolean
  refresh: () => Promise<void>
}
