import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  canViewVendors,
  canCreateVendor,
  canEditVendor,
  canDeleteVendor,
  canVerifyVendor,
  canSetPreferredVendor,
  canAddVendorEquipment,
  canRateVendor,
  canViewVendorBankDetails,
  canSeeVendorsNav,
  canAccessFeature,
} from '@/lib/permissions';
import { UserProfile, UserRole } from '@/types/permissions';

// Helper to create a mock user profile
function createMockProfile(role: UserRole): UserProfile {
  return {
    id: 'test-id',
    user_id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: null,
    role,
    custom_dashboard: 'default',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login_at: null,
    can_see_revenue: ['owner', 'admin', 'manager', 'finance', 'sales'].includes(role),
    can_see_profit: ['owner', 'admin', 'manager', 'finance'].includes(role),
    can_approve_pjo: ['owner', 'admin', 'manager'].includes(role),
    can_manage_invoices: ['owner', 'admin', 'finance'].includes(role),
    can_manage_users: ['owner', 'admin'].includes(role),
    can_create_pjo: ['owner', 'admin', 'manager', 'finance', 'sales'].includes(role),
    can_fill_costs: ['owner', 'admin', 'manager', 'ops'].includes(role),
  };
}

const ALL_ROLES: UserRole[] = ['owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer'];

describe('Vendor Permissions', () => {
  // ============================================
  // Property 18: Role-Based Permission Enforcement
  // Validates: Requirements 10.1-10.9
  // ============================================
  describe('Property 18: Role-Based Permission Enforcement', () => {
    /**
     * Feature: vendor-management, Property 18: Role-Based Permission Enforcement
     * For any user action on vendors, the system SHALL enforce permissions based on user role.
     */

    // 10.1: View - allowed for all roles
    it('should allow all roles to view vendors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_ROLES),
          (role) => {
            const profile = createMockProfile(role);
            expect(canViewVendors(profile)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    // 10.2: Create - allowed only for owner, admin, ops
    it('should allow only owner, admin, ops to create vendors', () => {
      const allowedRoles: UserRole[] = ['owner', 'admin', 'ops'];
      const deniedRoles: UserRole[] = ['manager', 'finance', 'sales', 'viewer'];

      // Test allowed roles
      for (const role of allowedRoles) {
        const profile = createMockProfile(role);
        expect(canCreateVendor(profile)).toBe(true);
      }

      // Test denied roles
      for (const role of deniedRoles) {
        const profile = createMockProfile(role);
        expect(canCreateVendor(profile)).toBe(false);
      }
    });

    // 10.3: Edit - allowed only for owner, admin, manager
    it('should allow only owner, admin, manager to edit vendors', () => {
      const allowedRoles: UserRole[] = ['owner', 'admin', 'manager'];
      const deniedRoles: UserRole[] = ['ops', 'finance', 'sales', 'viewer'];

      for (const role of allowedRoles) {
        const profile = createMockProfile(role);
        expect(canEditVendor(profile)).toBe(true);
      }

      for (const role of deniedRoles) {
        const profile = createMockProfile(role);
        expect(canEditVendor(profile)).toBe(false);
      }
    });

    // 10.4: Delete - allowed only for owner, admin
    it('should allow only owner, admin to delete vendors', () => {
      const allowedRoles: UserRole[] = ['owner', 'admin'];
      const deniedRoles: UserRole[] = ['manager', 'ops', 'finance', 'sales', 'viewer'];

      for (const role of allowedRoles) {
        const profile = createMockProfile(role);
        expect(canDeleteVendor(profile)).toBe(true);
      }

      for (const role of deniedRoles) {
        const profile = createMockProfile(role);
        expect(canDeleteVendor(profile)).toBe(false);
      }
    });

    // 10.5: Verify - allowed only for owner, admin
    it('should allow only owner, admin to verify vendors', () => {
      const allowedRoles: UserRole[] = ['owner', 'admin'];
      const deniedRoles: UserRole[] = ['manager', 'ops', 'finance', 'sales', 'viewer'];

      for (const role of allowedRoles) {
        const profile = createMockProfile(role);
        expect(canVerifyVendor(profile)).toBe(true);
      }

      for (const role of deniedRoles) {
        const profile = createMockProfile(role);
        expect(canVerifyVendor(profile)).toBe(false);
      }
    });

    // 10.6: Set preferred - allowed only for owner, admin, manager
    it('should allow only owner, admin, manager to set preferred status', () => {
      const allowedRoles: UserRole[] = ['owner', 'admin', 'manager'];
      const deniedRoles: UserRole[] = ['ops', 'finance', 'sales', 'viewer'];

      for (const role of allowedRoles) {
        const profile = createMockProfile(role);
        expect(canSetPreferredVendor(profile)).toBe(true);
      }

      for (const role of deniedRoles) {
        const profile = createMockProfile(role);
        expect(canSetPreferredVendor(profile)).toBe(false);
      }
    });

    // 10.7: Add equipment - allowed only for owner, admin, manager, ops
    it('should allow only owner, admin, manager, ops to add equipment', () => {
      const allowedRoles: UserRole[] = ['owner', 'admin', 'manager', 'ops'];
      const deniedRoles: UserRole[] = ['finance', 'sales', 'viewer'];

      for (const role of allowedRoles) {
        const profile = createMockProfile(role);
        expect(canAddVendorEquipment(profile)).toBe(true);
      }

      for (const role of deniedRoles) {
        const profile = createMockProfile(role);
        expect(canAddVendorEquipment(profile)).toBe(false);
      }
    });

    // 10.8: Rate vendor - allowed only for owner, admin, manager, finance, ops
    it('should allow only owner, admin, manager, finance, ops to rate vendors', () => {
      const allowedRoles: UserRole[] = ['owner', 'admin', 'manager', 'finance', 'ops'];
      const deniedRoles: UserRole[] = ['sales', 'viewer'];

      for (const role of allowedRoles) {
        const profile = createMockProfile(role);
        expect(canRateVendor(profile)).toBe(true);
      }

      for (const role of deniedRoles) {
        const profile = createMockProfile(role);
        expect(canRateVendor(profile)).toBe(false);
      }
    });

    // 10.9: View bank details - allowed only for owner, admin, manager, finance
    it('should allow only owner, admin, manager, finance to view bank details', () => {
      const allowedRoles: UserRole[] = ['owner', 'admin', 'manager', 'finance'];
      const deniedRoles: UserRole[] = ['ops', 'sales', 'viewer'];

      for (const role of allowedRoles) {
        const profile = createMockProfile(role);
        expect(canViewVendorBankDetails(profile)).toBe(true);
      }

      for (const role of deniedRoles) {
        const profile = createMockProfile(role);
        expect(canViewVendorBankDetails(profile)).toBe(false);
      }
    });

    // Property test: For any role, permissions should be consistent
    it('should enforce consistent permissions for any role', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_ROLES),
          (role) => {
            const profile = createMockProfile(role);
            
            // View is always allowed
            expect(canViewVendors(profile)).toBe(true);
            
            // Create permissions
            const canCreate = ['owner', 'admin', 'ops'].includes(role);
            expect(canCreateVendor(profile)).toBe(canCreate);
            
            // Edit permissions
            const canEdit = ['owner', 'admin', 'manager'].includes(role);
            expect(canEditVendor(profile)).toBe(canEdit);
            
            // Delete permissions
            const canDelete = ['owner', 'admin'].includes(role);
            expect(canDeleteVendor(profile)).toBe(canDelete);
            
            // Verify permissions
            const canVerify = ['owner', 'admin'].includes(role);
            expect(canVerifyVendor(profile)).toBe(canVerify);
            
            // Set preferred permissions
            const canSetPref = ['owner', 'admin', 'manager'].includes(role);
            expect(canSetPreferredVendor(profile)).toBe(canSetPref);
            
            // Add equipment permissions
            const canAddEquip = ['owner', 'admin', 'manager', 'ops'].includes(role);
            expect(canAddVendorEquipment(profile)).toBe(canAddEquip);
            
            // Rate permissions
            const canRate = ['owner', 'admin', 'manager', 'finance', 'ops'].includes(role);
            expect(canRateVendor(profile)).toBe(canRate);
            
            // View bank details permissions
            const canViewBank = ['owner', 'admin', 'manager', 'finance'].includes(role);
            expect(canViewVendorBankDetails(profile)).toBe(canViewBank);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================
  // Property 19: Navigation Visibility by Role
  // Validates: Requirements 11.2, 11.3
  // ============================================
  describe('Property 19: Navigation Visibility by Role', () => {
    /**
     * Feature: vendor-management, Property 19: Navigation Visibility by Role
     * For any user with role owner, admin, manager, finance, ops, or sales,
     * the Vendors menu item SHALL be visible. For users with role viewer,
     * the Vendors menu item SHALL NOT be visible.
     */
    it('should show vendors nav for all roles except viewer', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...ALL_ROLES),
          (role) => {
            const profile = createMockProfile(role);
            const shouldBeVisible = role !== 'viewer';
            expect(canSeeVendorsNav(profile)).toBe(shouldBeVisible);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should hide vendors nav for viewer role', () => {
      const profile = createMockProfile('viewer');
      expect(canSeeVendorsNav(profile)).toBe(false);
    });

    it('should show vendors nav for non-viewer roles', () => {
      const nonViewerRoles: UserRole[] = ['owner', 'admin', 'manager', 'ops', 'finance', 'sales'];
      for (const role of nonViewerRoles) {
        const profile = createMockProfile(role);
        expect(canSeeVendorsNav(profile)).toBe(true);
      }
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should return false for null profile', () => {
      expect(canViewVendors(null)).toBe(false);
      expect(canCreateVendor(null)).toBe(false);
      expect(canEditVendor(null)).toBe(false);
      expect(canDeleteVendor(null)).toBe(false);
      expect(canVerifyVendor(null)).toBe(false);
      expect(canSetPreferredVendor(null)).toBe(false);
      expect(canAddVendorEquipment(null)).toBe(false);
      expect(canRateVendor(null)).toBe(false);
      expect(canViewVendorBankDetails(null)).toBe(false);
      expect(canSeeVendorsNav(null)).toBe(false);
    });

    it('should use canAccessFeature for all vendor permissions', () => {
      const profile = createMockProfile('owner');
      
      // All vendor features should be accessible via canAccessFeature
      expect(canAccessFeature(profile, 'vendors.view')).toBe(true);
      expect(canAccessFeature(profile, 'vendors.create')).toBe(true);
      expect(canAccessFeature(profile, 'vendors.edit')).toBe(true);
      expect(canAccessFeature(profile, 'vendors.delete')).toBe(true);
      expect(canAccessFeature(profile, 'vendors.verify')).toBe(true);
      expect(canAccessFeature(profile, 'vendors.set_preferred')).toBe(true);
      expect(canAccessFeature(profile, 'vendors.add_equipment')).toBe(true);
      expect(canAccessFeature(profile, 'vendors.rate')).toBe(true);
      expect(canAccessFeature(profile, 'vendors.view_bank')).toBe(true);
      expect(canAccessFeature(profile, 'vendors.nav')).toBe(true);
    });
  });
});
