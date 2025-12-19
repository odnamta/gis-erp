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

export interface PermissionContextType {
  profile: UserProfile | null
  isLoading: boolean
  hasPermission: (permission: keyof UserPermissions) => boolean
  isRole: (role: UserRole | UserRole[]) => boolean
  canAccess: (feature: FeatureKey) => boolean
  refresh: () => Promise<void>
}
