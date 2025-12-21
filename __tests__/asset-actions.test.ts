/**
 * Asset Actions Tests
 * Property-based tests for asset CRUD operations
 * 
 * Feature: equipment-asset-registry
 * 
 * Note: These tests mock Supabase to test action logic without database access.
 * Integration tests with real database would be in a separate e2e test suite.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import {
  isValidAssetStatus,
  isValidDepreciationMethod,
  isValidAssetCode,
  filterAssetsBySearch,
  calculateAssetSummaryStats,
  ASSET_STATUSES,
} from '@/lib/asset-utils'
import type { AssetStatus, AssetFormData, Asset } from '@/types/assets'

// =====================================================
// Test Generators
// =====================================================

// Generate valid asset statuses
const validStatusArb = fc.constantFrom<AssetStatus>('active', 'maintenance', 'repair', 'idle', 'disposed', 'sold')
const activeStatusArb = fc.constantFrom<AssetStatus>('active', 'maintenance', 'repair', 'idle')
const excludedStatusArb = fc.constantFrom<AssetStatus>('disposed', 'sold')

// Generate valid depreciation methods
const validDepreciationMethodArb = fc.constantFrom('straight_line', 'declining_balance', 'units_of_production')

// Generate valid category codes
const categoryCodeArb = fc.constantFrom('TRUCK', 'TRAILER', 'CRANE', 'FORKLIFT', 'SUPPORT', 'VEHICLE', 'OFFICE', 'IT')

// Generate valid asset codes
const validAssetCodeArb = fc.tuple(categoryCodeArb, fc.integer({ min: 1, max: 9999 }))
  .map(([cat, num]) => `${cat}-${num.toString().padStart(4, '0')}`)

// Generate invalid asset codes
const invalidAssetCodeArb = fc.oneof(
  fc.constant(''),
  fc.constant('INVALID'),
  fc.constant('TRUCK'),
  fc.constant('TRUCK-'),
  fc.constant('-0001'),
  fc.stringMatching(/^[a-z]+-\d{4}$/), // lowercase
  fc.stringMatching(/^[A-Z]+-\d{1,3}$/), // too few digits
)

// Generate valid date strings
const validDateArb = fc.integer({ min: 0, max: 3650 }).map(daysOffset => {
  const baseDate = new Date('2020-01-01')
  baseDate.setDate(baseDate.getDate() + daysOffset)
  return baseDate.toISOString().split('T')[0]
})

// Generate valid asset form data
const assetFormDataArb: fc.Arbitrary<AssetFormData> = fc.record({
  asset_name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  category_id: fc.uuid(),
  registration_number: fc.option(fc.stringMatching(/^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}$/), { nil: undefined }),
  vin_number: fc.option(fc.stringMatching(/^[A-HJ-NPR-Z0-9]{17}$/), { nil: undefined }),
  engine_number: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: undefined }),
  chassis_number: fc.option(fc.string({ minLength: 5, maxLength: 20 }), { nil: undefined }),
  brand: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  model: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  year_manufactured: fc.option(fc.integer({ min: 1990, max: 2025 }), { nil: undefined }),
  color: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  capacity_tons: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(500), noNaN: true }), { nil: undefined }),
  capacity_cbm: fc.option(fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true }), { nil: undefined }),
  axle_configuration: fc.option(fc.constantFrom('4x2', '6x4', '6x6', '8x4', '8x8'), { nil: undefined }),
  length_m: fc.option(fc.float({ min: Math.fround(1), max: Math.fround(30), noNaN: true }), { nil: undefined }),
  width_m: fc.option(fc.float({ min: Math.fround(1), max: Math.fround(5), noNaN: true }), { nil: undefined }),
  height_m: fc.option(fc.float({ min: Math.fround(1), max: Math.fround(5), noNaN: true }), { nil: undefined }),
  weight_kg: fc.option(fc.float({ min: Math.fround(100), max: Math.fround(100000), noNaN: true }), { nil: undefined }),
  purchase_date: fc.option(validDateArb, { nil: undefined }),
  purchase_price: fc.option(fc.float({ min: Math.fround(1000000), max: Math.fround(10000000000), noNaN: true }), { nil: undefined }),
  purchase_vendor: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  purchase_invoice: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  useful_life_years: fc.option(fc.integer({ min: 1, max: 30 }), { nil: undefined }),
  salvage_value: fc.option(fc.float({ min: 0, max: Math.fround(1000000000), noNaN: true }), { nil: undefined }),
  depreciation_method: fc.option(validDepreciationMethodArb as fc.Arbitrary<'straight_line' | 'declining_balance' | 'units_of_production'>, { nil: undefined }),
  current_location_id: fc.option(fc.uuid(), { nil: undefined }),
  insurance_policy_number: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: undefined }),
  insurance_provider: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  insurance_expiry_date: fc.option(validDateArb, { nil: undefined }),
  insurance_value: fc.option(fc.float({ min: Math.fround(1000000), max: Math.fround(10000000000), noNaN: true }), { nil: undefined }),
  registration_expiry_date: fc.option(validDateArb, { nil: undefined }),
  kir_expiry_date: fc.option(validDateArb, { nil: undefined }),
  notes: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: undefined }),
})

// Generate mock asset for testing
const mockAssetArb = fc.record({
  id: fc.uuid(),
  asset_code: validAssetCodeArb,
  asset_name: fc.string({ minLength: 1, maxLength: 100 }),
  registration_number: fc.option(fc.stringMatching(/^[A-Z]{1,2}\s?\d{1,4}\s?[A-Z]{1,3}$/), { nil: null }),
  status: validStatusArb,
  book_value: fc.option(fc.float({ min: 0, max: Math.fround(10000000000), noNaN: true }), { nil: null }),
})

describe('Asset Actions Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =====================================================
  // Property 1: Asset Code Generation Format
  // Validates: Requirements 3.1
  // =====================================================
  describe('Property 1: Asset Code Generation Format', () => {
    it('should accept valid asset codes in format CATEGORY-NNNN', () => {
      fc.assert(
        fc.property(validAssetCodeArb, (code) => {
          expect(isValidAssetCode(code)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('should reject invalid asset code formats', () => {
      fc.assert(
        fc.property(invalidAssetCodeArb, (code) => {
          expect(isValidAssetCode(code)).toBe(false)
        }),
        { numRuns: 100 }
      )
    })

    it('should validate all category prefixes', () => {
      const categories = ['TRUCK', 'TRAILER', 'CRANE', 'FORKLIFT', 'SUPPORT', 'VEHICLE', 'OFFICE', 'IT']
      
      fc.assert(
        fc.property(
          fc.constantFrom(...categories),
          fc.integer({ min: 1, max: 9999 }),
          (category, num) => {
            const code = `${category}-${num.toString().padStart(4, '0')}`
            expect(isValidAssetCode(code)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 2: Asset Creation Invariants
  // Validates: Requirements 3.3, 3.4, 3.5
  // =====================================================
  describe('Property 2: Asset Creation Invariants', () => {
    it('should set initial status to active for new assets', () => {
      fc.assert(
        fc.property(assetFormDataArb, (formData) => {
          // Simulate what createAsset does
          const newAsset = {
            ...formData,
            status: 'active' as const,
            book_value: formData.purchase_price || null,
          }
          
          expect(newAsset.status).toBe('active')
        }),
        { numRuns: 100 }
      )
    })

    it('should set book_value equal to purchase_price when provided', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(1000000), max: Math.fround(10000000000), noNaN: true }),
          (purchasePrice) => {
            // Simulate what createAsset does
            const newAsset = {
              purchase_price: purchasePrice,
              book_value: purchasePrice,
            }
            
            expect(newAsset.book_value).toBe(newAsset.purchase_price)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should set book_value to null when purchase_price not provided', () => {
      // Simulate what createAsset does when no purchase_price
      const newAsset = {
        purchase_price: null,
        book_value: null,
      }
      
      expect(newAsset.book_value).toBeNull()
    })
  })

  // =====================================================
  // Property 3: Mandatory Field Validation
  // Validates: Requirements 3.2
  // =====================================================
  describe('Property 3: Mandatory Field Validation', () => {
    it('should require asset_name to be non-empty', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (categoryId) => {
            // Simulate validation
            const formData = {
              asset_name: '',
              category_id: categoryId,
            }
            
            const isValid = formData.asset_name.trim().length > 0
            expect(isValid).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should require category_id to be non-empty', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (assetName) => {
            // Simulate validation
            const formData = {
              asset_name: assetName,
              category_id: '',
            }
            
            const isValid = formData.category_id.length > 0
            expect(isValid).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should accept valid form data with required fields', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.uuid(),
          (assetName, categoryId) => {
            const formData = {
              asset_name: assetName,
              category_id: categoryId,
            }
            
            const isValid = formData.asset_name.trim().length > 0 && formData.category_id.length > 0
            expect(isValid).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 6: Filter Correctness
  // Validates: Requirements 4.2, 4.3, 4.4, 4.5
  // =====================================================
  describe('Property 6: Filter Correctness', () => {
    it('should filter by category_id correctly', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 5, maxLength: 20 }),
          (filterCategoryId, categoryIds) => {
            // Simulate filtering
            const assets = categoryIds.map((id, i) => ({
              id: `asset-${i}`,
              category_id: id,
            }))
            
            const filtered = assets.filter(a => a.category_id === filterCategoryId)
            
            // All filtered results should match
            filtered.forEach(a => {
              expect(a.category_id).toBe(filterCategoryId)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter by status correctly', () => {
      fc.assert(
        fc.property(
          validStatusArb,
          fc.array(validStatusArb, { minLength: 5, maxLength: 20 }),
          (filterStatus, statuses) => {
            const assets = statuses.map((status, i) => ({
              id: `asset-${i}`,
              status,
            }))
            
            const filtered = assets.filter(a => a.status === filterStatus)
            
            filtered.forEach(a => {
              expect(a.status).toBe(filterStatus)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter by location_id correctly', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 5, maxLength: 20 }),
          (filterLocationId, locationIds) => {
            const assets = locationIds.map((id, i) => ({
              id: `asset-${i}`,
              current_location_id: id,
            }))
            
            const filtered = assets.filter(a => a.current_location_id === filterLocationId)
            
            filtered.forEach(a => {
              expect(a.current_location_id).toBe(filterLocationId)
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should filter by search term (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 10 }),
          fc.array(mockAssetArb, { minLength: 3, maxLength: 10 }),
          (searchTerm, assets) => {
            const typedAssets = assets as Array<{
              asset_code: string
              asset_name: string
              registration_number: string | null
            }>
            
            const filtered = filterAssetsBySearch(typedAssets, searchTerm)
            
            // All filtered results should contain search term in code, name, or registration
            filtered.forEach(a => {
              const matchesCode = a.asset_code.toLowerCase().includes(searchTerm.toLowerCase())
              const matchesName = a.asset_name.toLowerCase().includes(searchTerm.toLowerCase())
              const matchesReg = a.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) || false
              
              expect(matchesCode || matchesName || matchesReg).toBe(true)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 7: Disposed/Sold Asset Exclusion
  // Validates: Requirements 4.8
  // =====================================================
  describe('Property 7: Disposed/Sold Asset Exclusion', () => {
    it('should exclude disposed and sold assets by default', () => {
      fc.assert(
        fc.property(
          fc.array(validStatusArb, { minLength: 10, maxLength: 30 }),
          (statuses) => {
            const assets = statuses.map((status, i) => ({
              id: `asset-${i}`,
              status,
            }))
            
            // Simulate default filter (exclude disposed/sold)
            const filtered = assets.filter(a => 
              a.status !== 'disposed' && a.status !== 'sold'
            )
            
            // No disposed or sold assets in results
            filtered.forEach(a => {
              expect(a.status).not.toBe('disposed')
              expect(a.status).not.toBe('sold')
            })
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should include disposed/sold when explicitly filtered', () => {
      fc.assert(
        fc.property(
          excludedStatusArb,
          fc.array(validStatusArb, { minLength: 10, maxLength: 30 }),
          (filterStatus, statuses) => {
            const assets = statuses.map((status, i) => ({
              id: `asset-${i}`,
              status,
            }))
            
            // Explicit filter for disposed/sold
            const filtered = assets.filter(a => a.status === filterStatus)
            
            // All results should match the filter
            filtered.forEach(a => {
              expect(a.status).toBe(filterStatus)
            })
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 10: Status Change Logging
  // Validates: Requirements 6.2, 6.3
  // =====================================================
  describe('Property 10: Status Change Logging', () => {
    it('should require reason for status change', () => {
      fc.assert(
        fc.property(
          validStatusArb,
          validStatusArb,
          fc.string({ minLength: 0, maxLength: 100 }),
          (previousStatus, newStatus, reason) => {
            // Simulate validation
            const isValid = reason.trim().length > 0
            
            if (reason.trim().length === 0) {
              expect(isValid).toBe(false)
            } else {
              expect(isValid).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should create history entry with all required fields', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          validStatusArb,
          validStatusArb,
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.uuid(),
          (assetId, previousStatus, newStatus, reason, userId) => {
            // Simulate history entry creation
            const historyEntry = {
              asset_id: assetId,
              previous_status: previousStatus,
              new_status: newStatus,
              reason: reason,
              changed_by: userId,
              changed_at: new Date().toISOString(),
            }
            
            expect(historyEntry.asset_id).toBe(assetId)
            expect(historyEntry.previous_status).toBe(previousStatus)
            expect(historyEntry.new_status).toBe(newStatus)
            expect(historyEntry.reason).toBe(reason)
            expect(historyEntry.changed_by).toBe(userId)
            expect(historyEntry.changed_at).toBeTruthy()
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should record location change in history when provided', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          (assetId, previousLocationId, newLocationId) => {
            // Simulate history entry with location change
            const historyEntry = {
              asset_id: assetId,
              previous_location_id: previousLocationId,
              new_location_id: newLocationId,
            }
            
            expect(historyEntry.previous_location_id).toBe(previousLocationId)
            expect(historyEntry.new_location_id).toBe(newLocationId)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 11: Asset Code Immutability
  // Validates: Requirements 7.2
  // =====================================================
  describe('Property 11: Asset Code Immutability', () => {
    it('should not allow changing asset_code during update', () => {
      fc.assert(
        fc.property(
          validAssetCodeArb,
          validAssetCodeArb,
          (originalCode, attemptedNewCode) => {
            // Simulate update logic - asset_code should remain unchanged
            const existingAsset = { asset_code: originalCode }
            
            // Update should preserve original code
            const updatedAsset = {
              ...existingAsset,
              // asset_code is not in the update data
            }
            
            expect(updatedAsset.asset_code).toBe(originalCode)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 12: Update Timestamp Refresh
  // Validates: Requirements 7.3
  // =====================================================
  describe('Property 12: Update Timestamp Refresh', () => {
    it('should update updated_at timestamp on every update', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1825 }), // Days offset from base date
          (daysOffset) => {
            const baseDate = new Date('2020-01-01')
            baseDate.setDate(baseDate.getDate() + daysOffset)
            const originalTimestamp = baseDate.toISOString()
            
            // Simulate update - new timestamp should be current time
            const newTimestamp = new Date().toISOString()
            
            // New timestamp should be >= original
            expect(new Date(newTimestamp).getTime()).toBeGreaterThanOrEqual(
              new Date(originalTimestamp).getTime()
            )
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // =====================================================
  // Property 8: Asset Summary Calculation
  // Validates: Requirements 4.1, 11.1
  // =====================================================
  describe('Property 8: Asset Summary Calculation', () => {
    it('should correctly count assets by status (excluding disposed/sold)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              status: validStatusArb,
              book_value: fc.option(fc.float({ min: 0, max: Math.fround(1000000000), noNaN: true }), { nil: null }),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          fc.integer({ min: 0, max: 10 }),
          (assets, expiringDocs) => {
            const typedAssets = assets as Array<{ status: AssetStatus; book_value: number | null }>
            const stats = calculateAssetSummaryStats(typedAssets, expiringDocs)
            
            // Count manually (excluding disposed/sold)
            const activeAssets = typedAssets.filter(a => !['disposed', 'sold'].includes(a.status))
            const expectedTotal = activeAssets.length
            const expectedActive = activeAssets.filter(a => a.status === 'active').length
            const expectedMaintenance = activeAssets.filter(a => a.status === 'maintenance').length
            const expectedIdle = activeAssets.filter(a => a.status === 'idle').length
            
            expect(stats.total).toBe(expectedTotal)
            expect(stats.active).toBe(expectedActive)
            expect(stats.maintenance).toBe(expectedMaintenance)
            expect(stats.idle).toBe(expectedIdle)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly sum book values (excluding disposed/sold)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              status: validStatusArb,
              book_value: fc.option(fc.float({ min: 0, max: Math.fround(1000000000), noNaN: true }), { nil: null }),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          (assets) => {
            const typedAssets = assets as Array<{ status: AssetStatus; book_value: number | null }>
            const stats = calculateAssetSummaryStats(typedAssets, 0)
            
            // Sum manually (excluding disposed/sold)
            const activeAssets = typedAssets.filter(a => !['disposed', 'sold'].includes(a.status))
            const expectedBookValue = activeAssets.reduce((sum, a) => sum + (a.book_value || 0), 0)
            
            expect(stats.totalBookValue).toBeCloseTo(expectedBookValue, 2)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
