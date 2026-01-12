/**
 * Preview utilities for Role Preview Feature
 * Allows Owner to temporarily view the system as another role
 */

import { UserRole, UserPermissions } from '@/types/permissions'
import { getDefaultPermissions } from './permissions'

/**
 * All roles available for preview
 */
export const PREVIEW_ROLES: UserRole[] = [
  'owner',
  'director',
  'marketing_manager',
  'finance_manager',
  'operations_manager',
  'sysadmin',
  'administration',
  'finance',
  'marketing',
  'ops',
  'engineer',
  'hr',
  'hse',
  'agency',
  'customs',
]

/**
 * Check if a user can use the preview feature
 * Only Owner role can use preview
 */
export function canUsePreviewFeature(actualRole: UserRole): boolean {
  return actualRole === 'owner'
}

/**
 * Get the effective role (preview if active, otherwise actual)
 */
export function getEffectiveRole(
  actualRole: UserRole,
  previewRole: UserRole | null
): UserRole {
  // Only owner can use preview, and preview must be set
  if (actualRole === 'owner' && previewRole !== null) {
    return previewRole
  }
  return actualRole
}

/**
 * Get effective permissions for a role (actual or preview)
 * When previewing, returns the default permissions for the preview role
 */
export function getEffectivePermissions(
  actualRole: UserRole,
  actualPermissions: UserPermissions,
  previewRole: UserRole | null
): UserPermissions {
  // Only owner can use preview
  if (actualRole !== 'owner' || previewRole === null) {
    return actualPermissions
  }
  // Return default permissions for the preview role
  return getDefaultPermissions(previewRole)
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    owner: 'Owner',
    director: 'Director',
    marketing_manager: 'Marketing Manager',
    finance_manager: 'Finance Manager',
    operations_manager: 'Operations Manager',
    sysadmin: 'System Admin',
    administration: 'Administration',
    finance: 'Finance',
    marketing: 'Marketing',
    ops: 'Operations',
    engineer: 'Engineer',
    hr: 'Human Resources',
    hse: 'Health & Safety',
    agency: 'Agency',
    customs: 'Customs',
  }
  return displayNames[role] || role
}
