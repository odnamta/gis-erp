/**
 * Property-based tests for asset utility functions
 * Feature: equipment-asset-registry
 * 
 * Tests validate correctness properties defined in the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidAssetStatus,
  isValidDepreciationMethod,
  isValidAssetDocumentType,
  calculateStraightLineDepreciation,
  getDocumentExpiryStatus,
  calculateAssetSummaryStats,
  filterAssetsBySearch,
  isValidAssetCode,
  calculateDaysUntilExpiry,
  isDocumentExpired,
  isDocumentExpiringSoon,
} from '@/lib/asset-utils';
import { Asset, AssetStatus, DepreciationMethod, AssetDocumentType } from '@/types/assets';

// Valid values for testing
const VALID_STATUSES: AssetStatus[] = ['active', 'maintenance', 'repair', 'idle', 'disposed', 'sold'];
const VALID_DEPRECIATION_METHODS: DepreciationMethod[] = ['straight_line', 'declining_balance', 'units_of_production'];
const VALID_DOCUMENT_TYPES: AssetDocumentType[] = ['registration', 'insurance', 'kir', 'permit', 'purchase', 'manual', 'photo', 'other'];

describe('Asset Utils Property Tests', () => {
  /**
   * Property 9: Valid Status Values
   * For any status value, isValidAssetStatus SHALL return true only for valid statuses
   */
  describe('Property 9: Valid Status Values', () => {
    it('should accept all valid asset statuses', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_STATUSES), (status) => {
          expect(isValidAssetStatus(status)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid status strings', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !VALID_STATUSES.includes(s as AssetStatus)),
          (invalidStatus) => {
            expect(isValidAssetStatus(invalidStatus)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 13: Valid Depreciation Methods
   * For any depreciation method value, isValidDepreciationMethod SHALL return true only for valid methods
   */
  describe('Property 13: Valid Depreciation Methods', () => {
    it('should accept all valid depreciation methods', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_DEPRECIATION_METHODS), (method) => {
          expect(isValidDepreciationMethod(method)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid depreciation method strings', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !VALID_DEPRECIATION_METHODS.includes(s as DepreciationMethod)),
          (invalidMethod) => {
            expect(isValidDepreciationMethod(invalidMethod)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 15: Valid Document Types
   * For any document type value, isValidAssetDocumentType SHALL return true only for valid types
   */
  describe('Property 15: Valid Document Types', () => {
    it('should accept all valid document types', () => {
      fc.assert(
        fc.property(fc.constantFrom(...VALID_DOCUMENT_TYPES), (type) => {
          expect(isValidAssetDocumentType(type)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid document type strings', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !VALID_DOCUMENT_TYPES.includes(s as AssetDocumentType)),
          (invalidType) => {
            expect(isValidAssetDocumentType(invalidType)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 14: Straight Line Depreciation Calculation
   * For any asset with valid financial values, depreciation SHALL be calculated correctly
   */
  describe('Property 14: Straight Line Depreciation Calculation', () => {
    it('should calculate annual depreciation as (purchasePrice - salvageValue) / usefulLifeYears', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10000000 }), // purchasePrice
          fc.integer({ min: 0, max: 500000 }), // salvageValue
          fc.integer({ min: 1, max: 50 }), // usefulLifeYears
          fc.integer({ min: 0, max: 50 }), // yearsElapsed
          (purchasePrice, salvageValue, usefulLifeYears, yearsElapsed) => {
            // Ensure salvage value is less than purchase price
            const adjustedSalvage = Math.min(salvageValue, purchasePrice - 1);
            
            const result = calculateStraightLineDepreciation(
              purchasePrice,
              adjustedSalvage,
              usefulLifeYears,
              yearsElapsed
            );

            const expectedAnnual = (purchasePrice - adjustedSalvage) / usefulLifeYears;
            expect(result.annualDepreciation).toBeCloseTo(expectedAnnual, 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should cap accumulated depreciation at depreciable amount', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10000000 }),
          fc.integer({ min: 0, max: 500000 }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 0, max: 100 }),
          (purchasePrice, salvageValue, usefulLifeYears, yearsElapsed) => {
            const adjustedSalvage = Math.min(salvageValue, purchasePrice - 1);
            
            const result = calculateStraightLineDepreciation(
              purchasePrice,
              adjustedSalvage,
              usefulLifeYears,
              yearsElapsed
            );

            const depreciableAmount = purchasePrice - adjustedSalvage;
            expect(result.accumulatedDepreciation).toBeLessThanOrEqual(depreciableAmount + 0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure book value equals purchasePrice - accumulatedDepreciation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10000000 }),
          fc.integer({ min: 0, max: 500000 }),
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 0, max: 50 }),
          (purchasePrice, salvageValue, usefulLifeYears, yearsElapsed) => {
            const adjustedSalvage = Math.min(salvageValue, purchasePrice - 1);
            
            const result = calculateStraightLineDepreciation(
              purchasePrice,
              adjustedSalvage,
              usefulLifeYears,
              yearsElapsed
            );

            expect(result.bookValue).toBeCloseTo(purchasePrice - result.accumulatedDepreciation, 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 16: Document Expiry Status Calculation
   * For any document with an expiry date, status SHALL be calculated correctly
   */
  describe('Property 16: Document Expiry Status Calculation', () => {
    it('should return expired for dates in the past', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }), // days in the past
          (daysAgo) => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - daysAgo);
            const dateStr = pastDate.toISOString().split('T')[0];
            
            expect(getDocumentExpiryStatus(dateStr)).toBe('expired');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return expiring_soon for dates within reminder period', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 29 }), // days until expiry (within default 30 days)
          (daysUntil) => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysUntil);
            const dateStr = futureDate.toISOString().split('T')[0];
            
            expect(getDocumentExpiryStatus(dateStr, 30)).toBe('expiring_soon');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid for dates beyond reminder period', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 31, max: 365 }), // days until expiry (beyond 30 days)
          (daysUntil) => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysUntil);
            const dateStr = futureDate.toISOString().split('T')[0];
            
            expect(getDocumentExpiryStatus(dateStr, 30)).toBe('valid');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return no_expiry for null dates', () => {
      expect(getDocumentExpiryStatus(null)).toBe('no_expiry');
    });
  });

  /**
   * Property 8: Asset Summary Calculation
   * For any set of assets, summary stats SHALL be calculated correctly
   */
  describe('Property 8: Asset Summary Calculation', () => {
    // Helper to create a minimal asset for testing
    const createTestAsset = (status: AssetStatus, bookValue: number): Asset => ({
      id: crypto.randomUUID(),
      asset_code: 'TEST-0001',
      asset_name: 'Test Asset',
      description: null,
      category_id: crypto.randomUUID(),
      registration_number: null,
      vin_number: null,
      engine_number: null,
      chassis_number: null,
      brand: null,
      model: null,
      year_manufactured: null,
      color: null,
      capacity_tons: null,
      capacity_cbm: null,
      axle_configuration: null,
      length_m: null,
      width_m: null,
      height_m: null,
      weight_kg: null,
      purchase_date: null,
      purchase_price: null,
      purchase_vendor: null,
      purchase_invoice: null,
      useful_life_years: null,
      salvage_value: 0,
      depreciation_method: 'straight_line',
      depreciation_start_date: null,
      total_expected_units: null,
      current_units: 0,
      accumulated_depreciation: 0,
      book_value: bookValue,
      current_location_id: null,
      status,
      assigned_to_employee_id: null,
      assigned_to_job_id: null,
      insurance_policy_number: null,
      insurance_provider: null,
      insurance_expiry_date: null,
      insurance_value: null,
      registration_expiry_date: null,
      kir_expiry_date: null,
      documents: [],
      photos: [],
      notes: null,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    it('should correctly count assets by status (excluding disposed/sold)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              status: fc.constantFrom(...VALID_STATUSES),
              bookValue: fc.integer({ min: 0, max: 1000000 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          fc.integer({ min: 0, max: 100 }),
          (assetData, expiringDocs) => {
            const assets = assetData.map((d) => createTestAsset(d.status, d.bookValue));
            const stats = calculateAssetSummaryStats(assets, expiringDocs);

            // Filter out disposed/sold for counting
            const activeAssets = assets.filter((a) => !['disposed', 'sold'].includes(a.status));
            
            expect(stats.total).toBe(activeAssets.length);
            expect(stats.active).toBe(activeAssets.filter((a) => a.status === 'active').length);
            expect(stats.maintenance).toBe(activeAssets.filter((a) => a.status === 'maintenance').length);
            expect(stats.idle).toBe(activeAssets.filter((a) => a.status === 'idle').length);
            expect(stats.expiringDocuments).toBe(expiringDocs);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly sum book values (excluding disposed/sold)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              status: fc.constantFrom(...VALID_STATUSES),
              bookValue: fc.integer({ min: 0, max: 1000000 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (assetData) => {
            const assets = assetData.map((d) => createTestAsset(d.status, d.bookValue));
            const stats = calculateAssetSummaryStats(assets, 0);

            const expectedTotal = assets
              .filter((a) => !['disposed', 'sold'].includes(a.status))
              .reduce((sum, a) => sum + (a.book_value || 0), 0);
            
            expect(stats.totalBookValue).toBe(expectedTotal);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Filter Correctness (search filter)
   * For any search term, filtered results SHALL contain only matching assets
   */
  describe('Property 6: Filter Correctness - Search', () => {
    const createSearchableAsset = (code: string, name: string, regNum: string | null) => ({
      asset_code: code,
      asset_name: name,
      registration_number: regNum,
    });

    it('should return all assets when search is empty', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              code: fc.string({ minLength: 1, maxLength: 20 }),
              name: fc.string({ minLength: 1, maxLength: 50 }),
              regNum: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (assetData) => {
            const assets = assetData.map((d) => createSearchableAsset(d.code, d.name, d.regNum));
            const filtered = filterAssetsBySearch(assets, '');
            expect(filtered.length).toBe(assets.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter assets by matching code, name, or registration number', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 10 }),
          (searchTerm) => {
            const matchingAsset = createSearchableAsset(
              `CODE-${searchTerm}`,
              'Some Name',
              null
            );
            const nonMatchingAsset = createSearchableAsset(
              'OTHER-001',
              'Other Name',
              'XYZ123'
            );
            
            const assets = [matchingAsset, nonMatchingAsset];
            const filtered = filterAssetsBySearch(assets, searchTerm);
            
            // Should include the matching asset
            expect(filtered.some((a) => a.asset_code.includes(searchTerm))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Asset Code Validation
   */
  describe('Asset Code Format Validation', () => {
    it('should accept valid asset codes in format CATEGORY-NNNN', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('TRUCK', 'CRANE', 'TRAILER', 'FORKLIFT'),
          fc.integer({ min: 1, max: 9999 }),
          (category, num) => {
            const code = `${category}-${String(num).padStart(4, '0')}`;
            expect(isValidAssetCode(code)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid asset code formats', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('invalid'),
            fc.constant('123-TRUCK'),
            fc.constant('TRUCK123'),
            fc.constant('truck-0001'),
            fc.constant('')
          ),
          (invalidCode) => {
            expect(isValidAssetCode(invalidCode)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Days Until Expiry Calculation
   */
  describe('Days Until Expiry Calculation', () => {
    it('should return positive days for future dates', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }),
          (daysAhead) => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);
            const dateStr = futureDate.toISOString().split('T')[0];
            
            const result = calculateDaysUntilExpiry(dateStr);
            expect(result).toBeGreaterThanOrEqual(daysAhead - 1); // Allow for timezone differences
            expect(result).toBeLessThanOrEqual(daysAhead + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return negative days for past dates', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }),
          (daysAgo) => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - daysAgo);
            const dateStr = pastDate.toISOString().split('T')[0];
            
            const result = calculateDaysUntilExpiry(dateStr);
            expect(result).toBeLessThanOrEqual(-daysAgo + 1);
            expect(result).toBeGreaterThanOrEqual(-daysAgo - 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Document Expired/Expiring Soon Consistency
   */
  describe('Document Status Consistency', () => {
    it('should have consistent expired status between functions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }),
          (daysAgo) => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - daysAgo);
            const dateStr = pastDate.toISOString().split('T')[0];
            
            expect(isDocumentExpired(dateStr)).toBe(true);
            expect(isDocumentExpiringSoon(dateStr)).toBe(false); // Expired is not "expiring soon"
            expect(getDocumentExpiryStatus(dateStr)).toBe('expired');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have consistent expiring_soon status between functions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 29 }),
          (daysUntil) => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysUntil);
            const dateStr = futureDate.toISOString().split('T')[0];
            
            expect(isDocumentExpired(dateStr)).toBe(false);
            expect(isDocumentExpiringSoon(dateStr, 30)).toBe(true);
            expect(getDocumentExpiryStatus(dateStr, 30)).toBe('expiring_soon');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
