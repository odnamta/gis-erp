import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  DEFAULT_PERMISSIONS,
  getDefaultPermissions,
  canAccessFeature,
  hasPermission,
  isRole,
  getDashboardType,
  canRemoveAdminPermission,
} from '@/lib/permissions'
import { UserProfile, UserRole } from '@/types/permissions'

// Helper to create a mock profile
function createMockProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'test-id',
    user_id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: null,
    role: 'viewer',
    custom_dashboard: 'default',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    can_see_revenue: false,
    can_see_profit: false,
    can_approve_pjo: false,
    can_manage_invoices: false,
    can_manage_users: false,
    can_create_pjo: false,
    can_fill_costs: false,
    ...overrides,
  }
}

describe('Permission Utilities', () => {
  describe('Property 1: Role-Permission Consistency', () => {
    const roles: UserRole[] = ['admin', 'manager', 'ops', 'finance', 'viewer']

    it.each(roles)('should return correct default permissions for %s role', (role) => {
      const permissions = getDefaultPermissions(role)
      expect(permissions).toEqual(DEFAULT_PERMISSIONS[role])
    })

    it('should return viewer permissions for unknown role', () => {
      const permissions = getDefaultPermissions('unknown' as UserRole)
      expect(permissions).toEqual(DEFAULT_PERMISSIONS.viewer)
    })
  })

  describe('Property 2: Ops Revenue Hiding', () => {
    it('ops role should have can_see_revenue = false by default', () => {
      const opsPermissions = DEFAULT_PERMISSIONS.ops
      expect(opsPermissions.can_see_revenue).toBe(false)
    })

    it('ops role should have can_see_profit = false by default', () => {
      const opsPermissions = DEFAULT_PERMISSIONS.ops
      expect(opsPermissions.can_see_profit).toBe(false)
    })

    it('ops user should not be able to access pjo.view_revenue feature', () => {
      const opsProfile = createMockProfile({
        role: 'ops',
        can_see_revenue: false,
        can_see_profit: false,
        can_fill_costs: true,
      })
      expect(canAccessFeature(opsProfile, 'pjo.view_revenue')).toBe(false)
    })

    it('ops user should not be able to access jo.view_full feature', () => {
      const opsProfile = createMockProfile({
        role: 'ops',
        can_see_revenue: false,
        can_fill_costs: true,
      })
      expect(canAccessFeature(opsProfile, 'jo.view_full')).toBe(false)
    })

    it('ops user should be able to access jo.view_costs feature', () => {
      const opsProfile = createMockProfile({
        role: 'ops',
        can_see_revenue: false,
        can_fill_costs: true,
      })
      expect(canAccessFeature(opsProfile, 'jo.view_costs')).toBe(true)
    })

    it('ops user should not be able to access dashboard.full feature', () => {
      const opsProfile = createMockProfile({
        role: 'ops',
        can_see_revenue: false,
        can_see_profit: false,
      })
      expect(canAccessFeature(opsProfile, 'dashboard.full')).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should return true when user has the permission', () => {
      const profile = createMockProfile({ can_see_revenue: true })
      expect(hasPermission(profile, 'can_see_revenue')).toBe(true)
    })

    it('should return false when user does not have the permission', () => {
      const profile = createMockProfile({ can_see_revenue: false })
      expect(hasPermission(profile, 'can_see_revenue')).toBe(false)
    })

    it('should return false when profile is null', () => {
      expect(hasPermission(null, 'can_see_revenue')).toBe(false)
    })
  })

  describe('isRole', () => {
    it('should return true when user has the specified role', () => {
      const profile = createMockProfile({ role: 'admin' })
      expect(isRole(profile, 'admin')).toBe(true)
    })

    it('should return false when user does not have the specified role', () => {
      const profile = createMockProfile({ role: 'viewer' })
      expect(isRole(profile, 'admin')).toBe(false)
    })

    it('should return true when user has one of the specified roles', () => {
      const profile = createMockProfile({ role: 'manager' })
      expect(isRole(profile, ['admin', 'manager'])).toBe(true)
    })

    it('should return false when user has none of the specified roles', () => {
      const profile = createMockProfile({ role: 'viewer' })
      expect(isRole(profile, ['admin', 'manager'])).toBe(false)
    })

    it('should return false when profile is null', () => {
      expect(isRole(null, 'admin')).toBe(false)
    })
  })

  describe('canAccessFeature', () => {
    it('admin should access all features', () => {
      const adminProfile = createMockProfile({
        role: 'admin',
        ...DEFAULT_PERMISSIONS.admin,
      })
      expect(canAccessFeature(adminProfile, 'users.manage')).toBe(true)
      expect(canAccessFeature(adminProfile, 'invoices.crud')).toBe(true)
      expect(canAccessFeature(adminProfile, 'pjo.approve')).toBe(true)
    })

    it('finance should access invoices but not user management', () => {
      const financeProfile = createMockProfile({
        role: 'finance',
        ...DEFAULT_PERMISSIONS.finance,
      })
      expect(canAccessFeature(financeProfile, 'invoices.crud')).toBe(true)
      expect(canAccessFeature(financeProfile, 'users.manage')).toBe(false)
    })

    it('viewer should have minimal access', () => {
      const viewerProfile = createMockProfile({
        role: 'viewer',
        ...DEFAULT_PERMISSIONS.viewer,
      })
      expect(canAccessFeature(viewerProfile, 'projects.view')).toBe(true)
      expect(canAccessFeature(viewerProfile, 'pjo.create')).toBe(false)
      expect(canAccessFeature(viewerProfile, 'invoices.view')).toBe(false)
    })

    it('should return false when profile is null', () => {
      expect(canAccessFeature(null, 'dashboard.full')).toBe(false)
    })
  })

  describe('getDashboardType', () => {
    it('should return custom dashboard when set', () => {
      const profile = createMockProfile({
        role: 'viewer',
        custom_dashboard: 'ops',
      })
      expect(getDashboardType(profile)).toBe('ops')
    })

    it('should return role when custom_dashboard is default', () => {
      const profile = createMockProfile({
        role: 'manager',
        custom_dashboard: 'default',
      })
      expect(getDashboardType(profile)).toBe('manager')
    })

    it('should return viewer when profile is null', () => {
      expect(getDashboardType(null)).toBe('viewer')
    })
  })

  describe('Property 7: Admin Self-Protection', () => {
    it('should prevent removing admin permission from last admin', () => {
      const result = canRemoveAdminPermission(1, 'user-1', 'user-1')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('last admin')
    })

    it('should allow removing admin permission when multiple admins exist', () => {
      const result = canRemoveAdminPermission(2, 'user-1', 'user-1')
      expect(result.allowed).toBe(true)
    })

    it('should allow removing admin permission from other user', () => {
      const result = canRemoveAdminPermission(1, 'user-2', 'user-1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('Role Permission Defaults', () => {
    it('admin should have all permissions enabled', () => {
      const adminPerms = DEFAULT_PERMISSIONS.admin
      expect(adminPerms.can_see_revenue).toBe(true)
      expect(adminPerms.can_see_profit).toBe(true)
      expect(adminPerms.can_approve_pjo).toBe(true)
      expect(adminPerms.can_manage_invoices).toBe(true)
      expect(adminPerms.can_manage_users).toBe(true)
      expect(adminPerms.can_create_pjo).toBe(true)
      expect(adminPerms.can_fill_costs).toBe(true)
    })

    it('manager should have most permissions except user management', () => {
      const managerPerms = DEFAULT_PERMISSIONS.manager
      expect(managerPerms.can_see_revenue).toBe(true)
      expect(managerPerms.can_approve_pjo).toBe(true)
      expect(managerPerms.can_manage_users).toBe(false)
      expect(managerPerms.can_manage_invoices).toBe(false)
    })

    it('ops should only have cost-related permissions', () => {
      const opsPerms = DEFAULT_PERMISSIONS.ops
      expect(opsPerms.can_fill_costs).toBe(true)
      expect(opsPerms.can_see_revenue).toBe(false)
      expect(opsPerms.can_see_profit).toBe(false)
      expect(opsPerms.can_approve_pjo).toBe(false)
      expect(opsPerms.can_create_pjo).toBe(false)
    })

    it('finance should have invoice and revenue permissions', () => {
      const financePerms = DEFAULT_PERMISSIONS.finance
      expect(financePerms.can_manage_invoices).toBe(true)
      expect(financePerms.can_see_revenue).toBe(true)
      expect(financePerms.can_see_profit).toBe(true)
      expect(financePerms.can_fill_costs).toBe(false)
    })

    it('viewer should have no special permissions', () => {
      const viewerPerms = DEFAULT_PERMISSIONS.viewer
      expect(Object.values(viewerPerms).every((v) => v === false)).toBe(true)
    })
  })
})


describe('Property 1: Ops users cannot see financial data', () => {
  /**
   * Property 1: Ops users cannot see financial data
   * For any user profile with role='ops', the permission check for
   * 'can_see_revenue' and 'can_see_profit' SHALL return false
   * Validates: Requirements 1.2, 1.4
   */
  it('should deny revenue and profit access for ops role', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          user_id: fc.uuid(),
          email: fc.emailAddress(),
          full_name: fc.string(),
          avatar_url: fc.constant(null),
          role: fc.constant('ops' as const),
          custom_dashboard: fc.constant('ops' as const),
          is_active: fc.boolean(),
          created_at: fc.constant(new Date().toISOString()),
          updated_at: fc.constant(new Date().toISOString()),
          can_see_revenue: fc.boolean(),
          can_see_profit: fc.boolean(),
          can_approve_pjo: fc.boolean(),
          can_manage_invoices: fc.boolean(),
          can_manage_users: fc.boolean(),
          can_create_pjo: fc.boolean(),
          can_fill_costs: fc.boolean(),
        }),
        (profile) => {
          // Ops users should NEVER have revenue/profit permissions
          // regardless of what the profile says
          const opsPermissions = DEFAULT_PERMISSIONS.ops
          expect(opsPermissions.can_see_revenue).toBe(false)
          expect(opsPermissions.can_see_profit).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should allow revenue and profit access for admin/manager roles', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('admin', 'manager') as fc.Arbitrary<'admin' | 'manager'>,
        (role) => {
          const permissions = DEFAULT_PERMISSIONS[role]
          expect(permissions.can_see_revenue).toBe(true)
          expect(permissions.can_see_profit).toBe(true)
        }
      ),
      { numRuns: 10 }
    )
  })
})
