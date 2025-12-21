/**
 * Asset Permissions Tests
 * Property-based tests for asset role-based access control
 * 
 * Feature: equipment-asset-registry
 * Property 18: Role-Based Access Control
 * 
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  canViewAssets,
  canCreateAsset,
  canEditAsset,
  canChangeAssetStatus,
  canViewAssetFinancials,
  canDisposeAsset,
  canUploadAssetDocuments,
  canSeeAssetsNav,
} from '@/lib/permissions'
import type { UserRole } from '@/types/permissions'

// =====================================================
// Helper to create mock UserProfile
// =====================================================
function createMockProfile(role: UserRole) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    role: role,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// =====================================================
// Test Generators
// =====================================================

// All valid user roles
const allRolesArb = fc.constantFrom<UserRole>('owner', 'admin', 'manager', 'ops', 'finance', 'sales', 'viewer', 'engineer')

// Roles that can view assets
const viewableRolesArb = fc.constantFrom<UserRole>('owner', 'admin', 'manager', 'ops', 'finance')
const nonViewableRolesArb = fc.constantFrom<UserRole>('sales', 'viewer', 'engineer')

// Roles that can create assets
const createRolesArb = fc.constantFrom<UserRole>('owner', 'admin', 'manager')
const nonCreateRolesArb = fc.constantFrom<UserRole>('ops', 'finance', 'sales', 'viewer', 'engineer')

// Roles that can edit assets
const editRolesArb = fc.constantFrom<UserRole>('owner', 'admin', 'manager')
const nonEditRolesArb = fc.constantFrom<UserRole>('ops', 'finance', 'sales', 'viewer', 'engineer')

// Roles that can change asset status
const statusChangeRolesArb = fc.constantFrom<UserRole>('owner', 'admin', 'manager', 'ops')
const nonStatusChangeRolesArb = fc.constantFrom<UserRole>('finance', 'sales', 'viewer', 'engineer')

// Roles that can view asset financials
const financialViewRolesArb = fc.constantFrom<UserRole>('owner', 'admin', 'manager', 'finance')
const nonFinancialViewRolesArb = fc.constantFrom<UserRole>('ops', 'sales', 'viewer', 'engineer')

// Roles that can dispose assets
const disposeRolesArb = fc.constantFrom<UserRole>('owner', 'admin')
const nonDisposeRolesArb = fc.constantFrom<UserRole>('manager', 'ops', 'finance', 'sales', 'viewer', 'engineer')

// Roles that can upload documents
const uploadDocRolesArb = fc.constantFrom<UserRole>('owner', 'admin', 'manager', 'ops')
const nonUploadDocRolesArb = fc.constantFrom<UserRole>('finance', 'sales', 'viewer', 'engineer')

// Roles that can see assets in navigation
const navRolesArb = fc.constantFrom<UserRole>('owner', 'admin', 'manager', 'ops', 'finance')
const nonNavRolesArb = fc.constantFrom<UserRole>('sales', 'viewer', 'engineer')

describe('Asset Permissions Property Tests', () => {
  // =====================================================
  // Property 18: Role-Based Access Control
  // Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
  // =====================================================

  describe('Property 18.1: View Assets Permission', () => {
    it('should allow view access for owner, admin, manager, ops, finance roles', () => {
      fc.assert(
        fc.property(viewableRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canViewAssets(profile)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should deny view access for sales, viewer, engineer roles', () => {
      fc.assert(
        fc.property(nonViewableRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canViewAssets(profile)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.2: Create Asset Permission', () => {
    it('should allow create access for owner, admin, manager roles', () => {
      fc.assert(
        fc.property(createRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canCreateAsset(profile)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should deny create access for ops, finance, sales, viewer, engineer roles', () => {
      fc.assert(
        fc.property(nonCreateRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canCreateAsset(profile)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.3: Edit Asset Permission', () => {
    it('should allow edit access for owner, admin, manager roles', () => {
      fc.assert(
        fc.property(editRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canEditAsset(profile)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should deny edit access for ops, finance, sales, viewer, engineer roles', () => {
      fc.assert(
        fc.property(nonEditRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canEditAsset(profile)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.4: Change Asset Status Permission', () => {
    it('should allow status change for owner, admin, manager, ops roles', () => {
      fc.assert(
        fc.property(statusChangeRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canChangeAssetStatus(profile)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should deny status change for finance, sales, viewer, engineer roles', () => {
      fc.assert(
        fc.property(nonStatusChangeRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canChangeAssetStatus(profile)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.5: View Asset Financials Permission', () => {
    it('should allow financial view for owner, admin, manager, finance roles', () => {
      fc.assert(
        fc.property(financialViewRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canViewAssetFinancials(profile)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should deny financial view for ops, sales, viewer, engineer roles', () => {
      fc.assert(
        fc.property(nonFinancialViewRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canViewAssetFinancials(profile)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.6: Dispose Asset Permission', () => {
    it('should allow dispose for owner, admin roles only', () => {
      fc.assert(
        fc.property(disposeRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canDisposeAsset(profile)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should deny dispose for manager, ops, finance, sales, viewer, engineer roles', () => {
      fc.assert(
        fc.property(nonDisposeRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canDisposeAsset(profile)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 18.7: Upload Asset Documents Permission', () => {
    it('should allow document upload for owner, admin, manager, ops roles', () => {
      fc.assert(
        fc.property(uploadDocRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canUploadAssetDocuments(profile)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should deny document upload for finance, sales, viewer, engineer roles', () => {
      fc.assert(
        fc.property(nonUploadDocRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canUploadAssetDocuments(profile)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Navigation Visibility', () => {
    it('should show assets nav for owner, admin, manager, ops, finance roles', () => {
      fc.assert(
        fc.property(navRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canSeeAssetsNav(profile)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should hide assets nav for sales, viewer, engineer roles', () => {
      fc.assert(
        fc.property(nonNavRolesArb, (role) => {
          const profile = createMockProfile(role)
          expect(canSeeAssetsNav(profile)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Permission Hierarchy Tests
  // =====================================================
  describe('Permission Hierarchy', () => {
    it('owner should have all asset permissions', () => {
      const profile = createMockProfile('owner')
      expect(canViewAssets(profile)).toBe(true)
      expect(canCreateAsset(profile)).toBe(true)
      expect(canEditAsset(profile)).toBe(true)
      expect(canChangeAssetStatus(profile)).toBe(true)
      expect(canViewAssetFinancials(profile)).toBe(true)
      expect(canDisposeAsset(profile)).toBe(true)
      expect(canUploadAssetDocuments(profile)).toBe(true)
      expect(canSeeAssetsNav(profile)).toBe(true)
    })

    it('admin should have all asset permissions', () => {
      const profile = createMockProfile('admin')
      expect(canViewAssets(profile)).toBe(true)
      expect(canCreateAsset(profile)).toBe(true)
      expect(canEditAsset(profile)).toBe(true)
      expect(canChangeAssetStatus(profile)).toBe(true)
      expect(canViewAssetFinancials(profile)).toBe(true)
      expect(canDisposeAsset(profile)).toBe(true)
      expect(canUploadAssetDocuments(profile)).toBe(true)
      expect(canSeeAssetsNav(profile)).toBe(true)
    })

    it('manager should have most permissions except dispose', () => {
      const profile = createMockProfile('manager')
      expect(canViewAssets(profile)).toBe(true)
      expect(canCreateAsset(profile)).toBe(true)
      expect(canEditAsset(profile)).toBe(true)
      expect(canChangeAssetStatus(profile)).toBe(true)
      expect(canViewAssetFinancials(profile)).toBe(true)
      expect(canDisposeAsset(profile)).toBe(false)
      expect(canUploadAssetDocuments(profile)).toBe(true)
      expect(canSeeAssetsNav(profile)).toBe(true)
    })

    it('ops should have limited permissions (view, status change, upload)', () => {
      const profile = createMockProfile('ops')
      expect(canViewAssets(profile)).toBe(true)
      expect(canCreateAsset(profile)).toBe(false)
      expect(canEditAsset(profile)).toBe(false)
      expect(canChangeAssetStatus(profile)).toBe(true)
      expect(canViewAssetFinancials(profile)).toBe(false)
      expect(canDisposeAsset(profile)).toBe(false)
      expect(canUploadAssetDocuments(profile)).toBe(true)
      expect(canSeeAssetsNav(profile)).toBe(true)
    })

    it('finance should have view and financial permissions only', () => {
      const profile = createMockProfile('finance')
      expect(canViewAssets(profile)).toBe(true)
      expect(canCreateAsset(profile)).toBe(false)
      expect(canEditAsset(profile)).toBe(false)
      expect(canChangeAssetStatus(profile)).toBe(false)
      expect(canViewAssetFinancials(profile)).toBe(true)
      expect(canDisposeAsset(profile)).toBe(false)
      expect(canUploadAssetDocuments(profile)).toBe(false)
      expect(canSeeAssetsNav(profile)).toBe(true)
    })

    it('sales should have no asset permissions', () => {
      const profile = createMockProfile('sales')
      expect(canViewAssets(profile)).toBe(false)
      expect(canCreateAsset(profile)).toBe(false)
      expect(canEditAsset(profile)).toBe(false)
      expect(canChangeAssetStatus(profile)).toBe(false)
      expect(canViewAssetFinancials(profile)).toBe(false)
      expect(canDisposeAsset(profile)).toBe(false)
      expect(canUploadAssetDocuments(profile)).toBe(false)
      expect(canSeeAssetsNav(profile)).toBe(false)
    })

    it('viewer should have no asset permissions', () => {
      const profile = createMockProfile('viewer')
      expect(canViewAssets(profile)).toBe(false)
      expect(canCreateAsset(profile)).toBe(false)
      expect(canEditAsset(profile)).toBe(false)
      expect(canChangeAssetStatus(profile)).toBe(false)
      expect(canViewAssetFinancials(profile)).toBe(false)
      expect(canDisposeAsset(profile)).toBe(false)
      expect(canUploadAssetDocuments(profile)).toBe(false)
      expect(canSeeAssetsNav(profile)).toBe(false)
    })

    it('should return false for null profile', () => {
      expect(canViewAssets(null)).toBe(false)
      expect(canCreateAsset(null)).toBe(false)
      expect(canEditAsset(null)).toBe(false)
      expect(canChangeAssetStatus(null)).toBe(false)
      expect(canViewAssetFinancials(null)).toBe(false)
      expect(canDisposeAsset(null)).toBe(false)
      expect(canUploadAssetDocuments(null)).toBe(false)
      expect(canSeeAssetsNav(null)).toBe(false)
    })
  })
})
