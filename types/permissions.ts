// Role-Based Access Control Types - RBAC v0.9.11
// Inlined from @gama/erp-core/auth/types (core pkg not available on Vercel)

export type UserRole =
  | 'owner'
  | 'director'
  | 'marketing_manager'
  | 'finance_manager'
  | 'operations_manager'
  | 'sysadmin'
  | 'administration'
  | 'finance'
  | 'marketing'
  | 'ops'
  | 'engineer'
  | 'hr'
  | 'hse'
  | 'agency'
  | 'customs'

export type DepartmentScope =
  | 'marketing'
  | 'engineering'
  | 'administration'
  | 'finance'
  | 'operations'
  | 'assets'
  | 'hr'
  | 'hse'

export type DashboardType =
  | 'executive'
  | 'marketing_manager'
  | 'finance_manager'
  | 'operations_manager'
  | 'marketing'
  | 'admin_finance'
  | 'operations'
  | 'engineering'
  | 'hr'
  | 'hse'
  | 'sysadmin'
  | 'agency'
  | 'customs'
  | 'default'
  | 'owner'
  | 'admin'
  | 'manager'
  | 'ops'
  | 'finance'
  | 'sales'
  | 'viewer'

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

export interface UserProfile {
  id: string
  user_id: string | null
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  roles: UserRole[]
  department_scope: DepartmentScope[]
  custom_dashboard: DashboardType
  custom_homepage: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
  tc_accepted_at: string | null
  tc_version: string | null
  welcome_shown_at: string | null
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

export type FeatureKey =
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
  | 'workflow.pjo.create'
  | 'workflow.pjo.check'
  | 'workflow.pjo.approve'
  | 'workflow.jo.check'
  | 'workflow.jo.approve'
  | 'workflow.bkk.create'
  | 'workflow.bkk.check'
  | 'workflow.bkk.approve'
  | 'customers.crud'
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'customers.delete'
  | 'quotations.view'
  | 'quotations.create'
  | 'quotations.edit'
  | 'quotations.approve'
  | 'quotations.cost_estimation'
  | 'quotations.engineering_review'
  | 'projects.crud'
  | 'projects.view'
  | 'pjo.create'
  | 'pjo.view'
  | 'pjo.edit'
  | 'pjo.view_revenue'
  | 'pjo.view_costs'
  | 'pjo.check'
  | 'pjo.approve'
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
  | 'hse.incidents.view'
  | 'hse.incidents.create'
  | 'hse.incidents.investigate'
  | 'hse.permits.view'
  | 'hse.permits.create'
  | 'hse.documents.create'
  | 'hse.training.view'
  | 'hse.training.view_own'
  | 'hse.training.manage'
  | 'hse.medical_checkups.view'
  | 'hse.medical_checkups.manage'
  | 'hse.ppe.view'
  | 'hse.ppe.manage'
  | 'hse.nav'
  | 'engineering.surveys.view'
  | 'engineering.surveys.create'
  | 'engineering.jmp.view'
  | 'engineering.jmp.create'
  | 'engineering.drawings.view'
  | 'engineering.drawings.create'
  | 'engineering.assessments.view'
  | 'engineering.assessments.create'
  | 'engineering.resources.create'
  | 'engineering.resources.manage'
  | 'engineering.nav'
  | 'admin.users.view'
  | 'admin.users.create'
  | 'admin.users.edit'
  | 'admin.users.delete'
  | 'admin.settings'
  | 'admin.audit_logs'
  | 'users.manage'
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
  | 'vendor_invoices.view'
  | 'vendor_invoices.create'
  | 'vendor_invoices.edit'
  | 'vendor_invoices.delete'
  | 'vendor_invoices.verify'
  | 'vendor_invoices.approve'
  | 'vendor_invoices.record_payment'
  | 'vendor_invoices.nav'
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'employees.view_salary'
  | 'employees.edit_salary'
  | 'employees.nav'
  | 'attendance.view_own'
  | 'attendance.clock'
  | 'attendance.view_all'
  | 'attendance.edit'
  | 'attendance.manage_schedules'
  | 'attendance.manage_holidays'
  | 'attendance.view_reports'
  | 'attendance.nav'
  | 'finance_dashboard.view'
  | 'finance_dashboard.view_ar_ap'
  | 'finance_dashboard.view_cash_position'
  | 'finance_dashboard.view_profit_margins'
  | 'finance_dashboard.refresh'
  | 'finance_dashboard.view_bkk_pending'
  | 'sales_engineering_dashboard.view'
  | 'sales_engineering_dashboard.view_pipeline'
  | 'sales_engineering_dashboard.view_engineering'
  | 'sales_engineering_dashboard.refresh'
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
  | 'audits.view'
  | 'audits.create'
  | 'audits.conduct'
  | 'audits.complete'
  | 'audits.manage_types'
  | 'audits.create_finding'
  | 'audits.close_finding'
  | 'audits.verify_finding'
  | 'audits.nav'
  | 'pib.view'
  | 'pib.create'
  | 'pib.edit'
  | 'pib.delete'
  | 'pib.view_duties'
  | 'pib.update_status'
  | 'pib.nav'
  | 'peb.view'
  | 'peb.create'
  | 'peb.edit'
  | 'peb.delete'
  | 'peb.update_status'
  | 'peb.nav'
  | 'assets.certifications.view'
  | 'hse.training.request'
  | 'hr.reimbursement.view'
  | 'hr.reimbursement.create'
  | 'hr.reimbursement.approve'
  | 'finance.reimbursement.pay'
  | 'vendors.po.view'
  | 'vendors.po.create'
  | 'vendors.po.approve'
  | 'vendors.po.receive'

export interface PermissionContextType {
  profile: UserProfile | null
  isLoading: boolean
  hasPermission: (permission: keyof UserPermissions) => boolean
  isRole: (role: UserRole | UserRole[]) => boolean
  canAccess: (feature: FeatureKey) => boolean
  refresh: () => Promise<void>
}
