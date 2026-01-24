// Role-Based Access Control Types - RBAC v0.9.11

/**
 * All supported user roles in the system
 * 13 roles total with hierarchical structure
 */
export type UserRole = 
  | 'owner'              // Full system access, final approver (Dio)
  | 'director'           // Executive oversight, can approve PJO/JO/BKK
  | 'marketing_manager'  // Marketing + Engineering departments (Hutami)
  | 'finance_manager'    // Administration + Finance departments (Feri)
  | 'operations_manager' // Operations + Assets departments (Reza)
  | 'sysadmin'          // IT administration, user management
  | 'administration'    // PJO preparation, invoices, document management
  | 'finance'           // Payments, AR/AP, payroll, BKK preparation
  | 'marketing'         // Customers, quotations, cost estimation
  | 'ops'               // Job execution, NO revenue visibility
  | 'engineer'          // Surveys, JMP, drawings, technical assessments
  | 'hr'                // Employee management, attendance, payroll
  | 'hse'               // Health, Safety, Environment modules
  | 'agency'            // Agency division: shipping, bookings, B/L operations
  | 'customs'           // Customs clearance: PIB, PEB, HS codes, duties

/**
 * Department scopes for managers
 * Managers can oversee multiple departments
 */
export type DepartmentScope = 
  | 'marketing'
  | 'engineering'
  | 'administration'
  | 'finance'
  | 'operations'
  | 'assets'
  | 'hr'
  | 'hse'

/**
 * Dashboard types based on role and department
 */
export type DashboardType = 
  | 'executive'          // owner, director
  | 'marketing_manager'  // marketing + engineering focus
  | 'finance_manager'    // administration + finance focus
  | 'operations_manager' // operations + assets focus
  | 'marketing'
  | 'admin_finance'
  | 'operations'
  | 'engineering'
  | 'hr'
  | 'hse'
  | 'sysadmin'
  | 'agency'             // agency division dashboard
  | 'customs'            // customs clearance dashboard
  | 'default'
  // Legacy values for backward compatibility
  | 'owner'
  | 'admin'
  | 'manager'
  | 'ops'
  | 'finance'
  | 'sales'
  | 'viewer'

/**
 * User permissions flags
 */
export interface UserPermissions {
  can_see_revenue: boolean
  can_see_profit: boolean
  can_see_actual_costs: boolean
  can_approve_pjo: boolean
  can_approve_jo: boolean
  can_approve_bkk: boolean
  can_check_pjo: boolean
  can_check_jo: boolean
  can_check_bkk: boolean
  can_manage_invoices: boolean
  can_manage_users: boolean
  can_create_pjo: boolean
  can_fill_costs: boolean
  can_estimate_costs: boolean
}

/**
 * User profile with role and permissions
 */
export interface UserProfile {
  id: string
  user_id: string | null  // null for pre-registered users
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  department_scope: DepartmentScope[]  // For managers
  custom_dashboard: DashboardType
  custom_homepage: string | null  // Custom homepage route override
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
  // Terms & Conditions acceptance (v0.85)
  tc_accepted_at: string | null  // ISO timestamp when T&C was accepted
  tc_version: string | null      // Version of T&C that was accepted
  // Permissions
  can_see_revenue: boolean
  can_see_profit: boolean
  can_see_actual_costs: boolean
  can_approve_pjo: boolean
  can_approve_jo: boolean
  can_approve_bkk: boolean
  can_check_pjo: boolean
  can_check_jo: boolean
  can_check_bkk: boolean
  can_manage_invoices: boolean
  can_manage_users: boolean
  can_create_pjo: boolean
  can_fill_costs: boolean
  can_estimate_costs: boolean
}


/**
 * Feature keys for granular permission checks
 */
export type FeatureKey =
  // Dashboard features
  | 'dashboard.executive'
  | 'dashboard.manager'
  | 'dashboard.marketing'
  | 'dashboard.operations'
  | 'dashboard.finance'
  | 'dashboard.hr'
  | 'dashboard.hse'
  | 'dashboard.engineering'
  | 'dashboard.full'
  | 'dashboard.ops'
  // Workflow features
  | 'workflow.pjo.create'
  | 'workflow.pjo.check'
  | 'workflow.pjo.approve'
  | 'workflow.jo.check'
  | 'workflow.jo.approve'
  | 'workflow.bkk.create'
  | 'workflow.bkk.check'
  | 'workflow.bkk.approve'
  // Customer & Marketing
  | 'customers.crud'
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'customers.delete'
  // Quotations
  | 'quotations.view'
  | 'quotations.create'
  | 'quotations.edit'
  | 'quotations.approve'
  | 'quotations.cost_estimation'
  | 'quotations.engineering_review'
  // Projects
  | 'projects.crud'
  | 'projects.view'
  // PJO
  | 'pjo.create'
  | 'pjo.view'
  | 'pjo.edit'
  | 'pjo.view_revenue'
  | 'pjo.view_costs'
  | 'pjo.check'
  | 'pjo.approve'
  // Job Orders
  | 'jo.view'
  | 'jo.view_full'
  | 'jo.view_revenue'
  | 'jo.view_costs'
  | 'jo.create'
  | 'jo.edit'
  | 'jo.add_expense'
  | 'jo.fill_costs'
  | 'jo.check'
  | 'jo.approve'
  | 'jo.create_ba'
  | 'jo.create_sj'
  // Finance
  | 'invoices.crud'
  | 'invoices.view'
  | 'invoices.create'
  | 'invoices.edit'
  | 'payments.view'
  | 'payments.create'
  | 'bkk.view'
  | 'bkk.create'
  | 'bkk.check'
  | 'bkk.approve'
  | 'reports.pnl'
  | 'reports.profit'
  | 'reports.revenue'
  // Equipment & Assets
  | 'assets.view'
  | 'assets.create'
  | 'assets.edit'
  | 'assets.change_status'
  | 'assets.view_financials'
  | 'assets.dispose'
  | 'assets.upload_documents'
  | 'assets.nav'
  | 'maintenance.view'
  | 'maintenance.create'
  // HR
  | 'hr.employees.view'
  | 'hr.employees.view_own'
  | 'hr.employees.create'
  | 'hr.employees.edit'
  | 'hr.employees.delete'
  | 'hr.employees.salary'
  | 'hr.attendance.view_all'
  | 'hr.attendance.view_own'
  | 'hr.leave.approve'
  | 'hr.payroll.view'
  | 'hr.payroll.run'
  | 'hr.nav'
  // HSE
  | 'hse.incidents.view'
  | 'hse.incidents.create'
  | 'hse.incidents.investigate'
  | 'hse.training.view'
  | 'hse.training.view_own'
  | 'hse.training.manage'
  | 'hse.ppe.view'
  | 'hse.ppe.manage'
  | 'hse.nav'
  // Engineering
  | 'engineering.surveys.view'
  | 'engineering.surveys.create'
  | 'engineering.jmp.view'
  | 'engineering.jmp.create'
  | 'engineering.drawings.view'
  | 'engineering.drawings.create'
  | 'engineering.assessments.view'
  | 'engineering.assessments.create'
  | 'engineering.nav'
  // System Administration
  | 'admin.users.view'
  | 'admin.users.create'
  | 'admin.users.edit'
  | 'admin.users.delete'
  | 'admin.settings'
  | 'admin.audit_logs'
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
  // Employee/HR permissions (legacy)
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
  // Audit permissions
  | 'audits.view'
  | 'audits.create'
  | 'audits.conduct'
  | 'audits.complete'
  | 'audits.manage_types'
  | 'audits.create_finding'
  | 'audits.close_finding'
  | 'audits.verify_finding'
  | 'audits.nav'
  // PIB (Customs Import) permissions
  | 'pib.view'
  | 'pib.create'
  | 'pib.edit'
  | 'pib.delete'
  | 'pib.view_duties'
  | 'pib.update_status'
  | 'pib.nav'
  // PEB (Customs Export) permissions
  | 'peb.view'
  | 'peb.create'
  | 'peb.edit'
  | 'peb.delete'
  | 'peb.update_status'
  | 'peb.nav'

export interface PermissionContextType {
  profile: UserProfile | null
  isLoading: boolean
  hasPermission: (permission: keyof UserPermissions) => boolean
  isRole: (role: UserRole | UserRole[]) => boolean
  canAccess: (feature: FeatureKey) => boolean
  refresh: () => Promise<void>
}
