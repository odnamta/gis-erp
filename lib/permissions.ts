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
