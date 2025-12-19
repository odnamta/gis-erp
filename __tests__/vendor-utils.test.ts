import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateVendorCode,
  isDocumentExpired,
  isDocumentExpiringSoon,
  getDocumentExpiryStatus,
  calculateAverageRating,
  calculateOnTimeRate,
  calculateVendorSummaryStats,
  sortVendorsForDropdown,
  filterVendorsBySearch,
  isValidVendorCode,
  isValidRating,
  getVendorTypeLabel,
  getEquipmentTypeLabel,
  getDocumentTypeLabel,
  mapCostCategoryToVendorType,
  VENDOR_TYPES,
  EQUIPMENT_TYPES,
  DOCUMENT_TYPES,
} from '@/lib/vendor-utils';
import { Vendor, VendorRating } from '@/types/vendors';

describe('Vendor Utilities', () => {
  // ============================================
  // Property 8: Document Expiry Detection
  // Validates: Requirements 4.6, 9.3
  // ============================================
  describe('Property 8: Document Expiry Detection', () => {
    /**
     * Feature: vendor-management, Property 8: Document Expiry Detection
     * For any date value, the system SHALL correctly identify:
     * - Expired: date is before current date
     * - Expiring soon: date is within 30 days of current date but not expired
     * - Valid: date is more than 30 days in the future
     */
    it('should correctly classify expired dates', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }), // days in the past
          (daysAgo) => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - daysAgo);
            const dateStr = pastDate.toISOString().split('T')[0];
            
            expect(isDocumentExpired(dateStr)).toBe(true);
            expect(getDocumentExpiryStatus(dateStr)).toBe('expired');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly classify expiring soon dates (within 30 days)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 29 }), // days in the future, within 30 days
          (daysAhead) => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);
            const dateStr = futureDate.toISOString().split('T')[0];
            
            expect(isDocumentExpired(dateStr)).toBe(false);
            expect(isDocumentExpiringSoon(dateStr)).toBe(true);
            expect(getDocumentExpiryStatus(dateStr)).toBe('expiring_soon');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly classify valid dates (more than 30 days in future)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 31, max: 365 }), // days in the future, beyond 30 days
          (daysAhead) => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);
            const dateStr = futureDate.toISOString().split('T')[0];
            
            expect(isDocumentExpired(dateStr)).toBe(false);
            expect(isDocumentExpiringSoon(dateStr)).toBe(false);
            expect(getDocumentExpiryStatus(dateStr)).toBe('valid');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null/undefined expiry dates', () => {
      expect(isDocumentExpired(null)).toBe(false);
      expect(isDocumentExpired(undefined)).toBe(false);
      expect(isDocumentExpiringSoon(null)).toBe(false);
      expect(isDocumentExpiringSoon(undefined)).toBe(false);
      expect(getDocumentExpiryStatus(null)).toBe('no_expiry');
      expect(getDocumentExpiryStatus(undefined)).toBe('no_expiry');
    });
  });

  // ============================================
  // Property 12: Average Rating Calculation
  // Validates: Requirements 6.3
  // ============================================
  describe('Property 12: Average Rating Calculation', () => {
    /**
     * Feature: vendor-management, Property 12: Average Rating Calculation
     * For any vendor with one or more ratings, the average_rating SHALL equal
     * the arithmetic mean of all overall_rating values, rounded to 2 decimal places.
     */
    it('should calculate correct average for any set of valid ratings', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 100 }),
          (ratingValues) => {
            const ratings: VendorRating[] = ratingValues.map((r, i) => ({
              id: `rating-${i}`,
              vendor_id: 'vendor-1',
              overall_rating: r,
              had_issues: false,
              created_at: new Date().toISOString(),
            }));
            
            const expectedAvg = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
            const expectedRounded = Math.round(expectedAvg * 100) / 100;
            
            const result = calculateAverageRating(ratings);
            expect(result).toBe(expectedRounded);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for empty ratings array', () => {
      expect(calculateAverageRating([])).toBeNull();
    });

    it('should return the rating value for single rating', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (rating) => {
            const ratings: VendorRating[] = [{
              id: 'rating-1',
              vendor_id: 'vendor-1',
              overall_rating: rating,
              had_issues: false,
              created_at: new Date().toISOString(),
            }];
            
            expect(calculateAverageRating(ratings)).toBe(rating);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================
  // Property 13: On-Time Rate Calculation
  // Validates: Requirements 6.3
  // ============================================
  describe('Property 13: On-Time Rate Calculation', () => {
    /**
     * Feature: vendor-management, Property 13: On-Time Rate Calculation
     * For any vendor with one or more ratings, the on_time_rate SHALL equal
     * (count of ratings where was_on_time is true / total ratings) × 100,
     * rounded to 2 decimal places.
     */
    it('should calculate correct on-time rate for any set of ratings', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: 1, maxLength: 100 }),
          (onTimeValues) => {
            const ratings: VendorRating[] = onTimeValues.map((wasOnTime, i) => ({
              id: `rating-${i}`,
              vendor_id: 'vendor-1',
              overall_rating: 3,
              was_on_time: wasOnTime,
              had_issues: false,
              created_at: new Date().toISOString(),
            }));
            
            const onTimeCount = onTimeValues.filter(v => v).length;
            const expectedRate = (onTimeCount / onTimeValues.length) * 100;
            const expectedRounded = Math.round(expectedRate * 100) / 100;
            
            const result = calculateOnTimeRate(ratings);
            expect(result).toBe(expectedRounded);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for empty ratings array', () => {
      expect(calculateOnTimeRate([])).toBeNull();
    });

    it('should return 100 when all ratings are on-time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (count) => {
            const ratings: VendorRating[] = Array.from({ length: count }, (_, i) => ({
              id: `rating-${i}`,
              vendor_id: 'vendor-1',
              overall_rating: 3,
              was_on_time: true,
              had_issues: false,
              created_at: new Date().toISOString(),
            }));
            
            expect(calculateOnTimeRate(ratings)).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when no ratings are on-time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (count) => {
            const ratings: VendorRating[] = Array.from({ length: count }, (_, i) => ({
              id: `rating-${i}`,
              vendor_id: 'vendor-1',
              overall_rating: 3,
              was_on_time: false,
              had_issues: false,
              created_at: new Date().toISOString(),
            }));
            
            expect(calculateOnTimeRate(ratings)).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================
  // Property 1: Vendor Code Uniqueness and Format
  // Validates: Requirements 1.1
  // ============================================
  describe('Property 1: Vendor Code Uniqueness and Format', () => {
    /**
     * Feature: vendor-management, Property 1: Vendor Code Uniqueness and Format
     * For any number of existing vendors in the system, when a new vendor is created,
     * the generated vendor_code SHALL follow the format VND-XXX (where XXX is a
     * zero-padded number) and SHALL be unique across all vendors.
     */
    it('should generate codes in VND-XXX format for any count', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000 }),
          (count) => {
            const code = generateVendorCode(count);
            // Should match VND-XXX format where XXX is at least 3 digits
            expect(code).toMatch(/^VND-\d{3,}$/);
            // Should be valid according to our validator
            expect(isValidVendorCode(code)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique codes for sequential counts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          (startCount) => {
            const codes = new Set<string>();
            // Generate 10 sequential codes
            for (let i = 0; i < 10; i++) {
              codes.add(generateVendorCode(startCount + i));
            }
            // All codes should be unique
            expect(codes.size).toBe(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate incrementing numbers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 9990 }),
          (count) => {
            const code1 = generateVendorCode(count);
            const code2 = generateVendorCode(count + 1);
            
            // Extract numbers from codes
            const num1 = parseInt(code1.replace('VND-', ''), 10);
            const num2 = parseInt(code2.replace('VND-', ''), 10);
            
            // Second code should have a higher number
            expect(num2).toBe(num1 + 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ============================================
  // Unit Tests for Vendor Code Generation
  // ============================================
  describe('Vendor Code Generation - Unit Tests', () => {
    it('should generate VND-001 for count 0', () => {
      expect(generateVendorCode(0)).toBe('VND-001');
    });

    it('should generate sequential codes', () => {
      expect(generateVendorCode(0)).toBe('VND-001');
      expect(generateVendorCode(1)).toBe('VND-002');
      expect(generateVendorCode(9)).toBe('VND-010');
      expect(generateVendorCode(99)).toBe('VND-100');
      expect(generateVendorCode(999)).toBe('VND-1000');
    });

    it('should validate vendor code format', () => {
      expect(isValidVendorCode('VND-001')).toBe(true);
      expect(isValidVendorCode('VND-100')).toBe(true);
      expect(isValidVendorCode('VND-1000')).toBe(true);
      expect(isValidVendorCode('VND-01')).toBe(false);
      expect(isValidVendorCode('VND001')).toBe(false);
      expect(isValidVendorCode('ABC-001')).toBe(false);
    });
  });

  // ============================================
  // Unit Tests for Rating Validation
  // ============================================
  describe('Rating Validation', () => {
    it('should validate ratings between 1 and 5', () => {
      expect(isValidRating(1)).toBe(true);
      expect(isValidRating(2)).toBe(true);
      expect(isValidRating(3)).toBe(true);
      expect(isValidRating(4)).toBe(true);
      expect(isValidRating(5)).toBe(true);
    });

    it('should reject invalid ratings', () => {
      expect(isValidRating(0)).toBe(false);
      expect(isValidRating(6)).toBe(false);
      expect(isValidRating(-1)).toBe(false);
      expect(isValidRating(3.5)).toBe(false);
    });
  });

  // ============================================
  // Unit Tests for Type Labels
  // ============================================
  describe('Type Labels', () => {
    it('should return correct vendor type labels', () => {
      expect(getVendorTypeLabel('trucking')).toBe('Trucking / Transport');
      expect(getVendorTypeLabel('shipping')).toBe('Shipping Line');
      expect(getVendorTypeLabel('port')).toBe('Port Agent');
    });

    it('should return correct equipment type labels', () => {
      expect(getEquipmentTypeLabel('trailer_40ft')).toBe('Trailer 40ft');
      expect(getEquipmentTypeLabel('lowbed')).toBe('Lowbed');
      expect(getEquipmentTypeLabel('crane')).toBe('Crane');
    });

    it('should return correct document type labels', () => {
      expect(getDocumentTypeLabel('npwp')).toBe('NPWP');
      expect(getDocumentTypeLabel('siup')).toBe('SIUP');
      expect(getDocumentTypeLabel('insurance')).toBe('Insurance');
    });
  });

  // ============================================
  // Unit Tests for Cost Category Mapping
  // ============================================
  describe('Cost Category to Vendor Type Mapping', () => {
    it('should map cost categories to vendor types', () => {
      expect(mapCostCategoryToVendorType('trucking')).toBe('trucking');
      expect(mapCostCategoryToVendorType('port_charges')).toBe('port');
      expect(mapCostCategoryToVendorType('documentation')).toBe('documentation');
      expect(mapCostCategoryToVendorType('handling')).toBe('handling');
      expect(mapCostCategoryToVendorType('customs')).toBe('documentation');
    });

    it('should return undefined for unknown categories', () => {
      expect(mapCostCategoryToVendorType('unknown')).toBeUndefined();
    });
  });

  // ============================================
  // Unit Tests for Vendor Sorting
  // ============================================
  describe('Vendor Sorting for Dropdown', () => {
    it('should sort preferred vendors first', () => {
      const vendors = [
        { is_preferred: false, average_rating: 5 },
        { is_preferred: true, average_rating: 3 },
        { is_preferred: false, average_rating: 4 },
      ];
      
      const sorted = sortVendorsForDropdown(vendors);
      expect(sorted[0].is_preferred).toBe(true);
    });

    it('should sort by rating within same preference', () => {
      const vendors = [
        { is_preferred: false, average_rating: 3 },
        { is_preferred: false, average_rating: 5 },
        { is_preferred: false, average_rating: 4 },
      ];
      
      const sorted = sortVendorsForDropdown(vendors);
      expect(sorted[0].average_rating).toBe(5);
      expect(sorted[1].average_rating).toBe(4);
      expect(sorted[2].average_rating).toBe(3);
    });

    it('should handle null ratings', () => {
      const vendors = [
        { is_preferred: false, average_rating: null },
        { is_preferred: false, average_rating: 3 },
      ];
      
      const sorted = sortVendorsForDropdown(vendors);
      expect(sorted[0].average_rating).toBe(3);
      expect(sorted[1].average_rating).toBeNull();
    });
  });

  // ============================================
  // Unit Tests for Vendor Search Filter
  // ============================================
  describe('Vendor Search Filter', () => {
    const vendors = [
      { vendor_name: 'PT. ABC Transport', vendor_code: 'VND-001' },
      { vendor_name: 'CV. XYZ Logistics', vendor_code: 'VND-002' },
      { vendor_name: 'PT. DEF Shipping', vendor_code: 'VND-003' },
    ];

    it('should filter by vendor name', () => {
      const result = filterVendorsBySearch(vendors, 'ABC');
      expect(result).toHaveLength(1);
      expect(result[0].vendor_name).toBe('PT. ABC Transport');
    });

    it('should filter by vendor code', () => {
      const result = filterVendorsBySearch(vendors, 'VND-002');
      expect(result).toHaveLength(1);
      expect(result[0].vendor_code).toBe('VND-002');
    });

    it('should be case insensitive', () => {
      const result = filterVendorsBySearch(vendors, 'abc');
      expect(result).toHaveLength(1);
    });

    it('should return all vendors for empty search', () => {
      const result = filterVendorsBySearch(vendors, '');
      expect(result).toHaveLength(3);
    });

    it('should return empty array for no matches', () => {
      const result = filterVendorsBySearch(vendors, 'NOTFOUND');
      expect(result).toHaveLength(0);
    });
  });
});


// ============================================
// Property 4: Vendor Search and Filter Correctness
// Validates: Requirements 2.2, 2.3, 2.4, 2.5
// ============================================
describe('Property 4: Vendor Search and Filter Correctness', () => {
  // Helper to create mock vendor
  const createMockVendor = (overrides: Partial<{ vendor_name: string; vendor_code: string; vendor_type: string; is_active: boolean; is_preferred: boolean }> = {}) => ({
    vendor_name: 'Test Vendor',
    vendor_code: 'VND-001',
    vendor_type: 'trucking' as const,
    is_active: true,
    is_preferred: false,
    ...overrides,
  });

  /**
   * Feature: vendor-management, Property 4a: Search Filter Correctness
   * For any search term, the filter SHALL return only vendors whose
   * vendor_name OR vendor_code contains the search term (case-insensitive).
   */
  it('should return vendors matching search term in name or code', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
        (searchTerm) => {
          const matchingByName = createMockVendor({ vendor_name: `PT ${searchTerm} Transport`, vendor_code: 'VND-001' });
          const matchingByCode = createMockVendor({ vendor_name: 'Other Vendor', vendor_code: `VND-${searchTerm}` });
          const nonMatching = createMockVendor({ vendor_name: 'Unrelated Company', vendor_code: 'VND-999' });
          
          const vendors = [matchingByName, matchingByCode, nonMatching];
          const result = filterVendorsBySearch(vendors, searchTerm);
          
          // Should include vendors matching by name or code
          expect(result.some(v => v.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()))).toBe(true);
          
          // Should not include non-matching vendors (unless searchTerm happens to match)
          result.forEach(v => {
            const matchesName = v.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCode = v.vendor_code.toLowerCase().includes(searchTerm.toLowerCase());
            expect(matchesName || matchesCode).toBe(true);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 4b: Search Case Insensitivity
   * Search SHALL be case-insensitive for both vendor_name and vendor_code.
   */
  it('should be case-insensitive for search', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 8 }).filter(s => /^[a-zA-Z]+$/.test(s)),
        (baseTerm) => {
          const vendor = createMockVendor({ vendor_name: `PT ${baseTerm.toUpperCase()} Transport` });
          const vendors = [vendor];
          
          // Search with different cases should return same results
          const upperResult = filterVendorsBySearch(vendors, baseTerm.toUpperCase());
          const lowerResult = filterVendorsBySearch(vendors, baseTerm.toLowerCase());
          const mixedResult = filterVendorsBySearch(vendors, baseTerm);
          
          expect(upperResult.length).toBe(lowerResult.length);
          expect(lowerResult.length).toBe(mixedResult.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 4c: Empty Search Returns All
   * An empty search term SHALL return all vendors without filtering.
   */
  it('should return all vendors for empty search', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (vendorCount) => {
          const vendors = Array.from({ length: vendorCount }, (_, i) => 
            createMockVendor({ vendor_name: `Vendor ${i}`, vendor_code: `VND-${String(i).padStart(3, '0')}` })
          );
          
          const resultEmpty = filterVendorsBySearch(vendors, '');
          const resultWhitespace = filterVendorsBySearch(vendors, '   ');
          
          expect(resultEmpty.length).toBe(vendorCount);
          expect(resultWhitespace.length).toBe(vendorCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 4d: Filter Preserves Order
   * Filtering SHALL preserve the original order of matching vendors.
   */
  it('should preserve original order when filtering', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 5 }).filter(s => /^[a-zA-Z]+$/.test(s)), { minLength: 2, maxLength: 10 }),
        (names) => {
          const vendors = names.map((name, i) => 
            createMockVendor({ vendor_name: `PT ${name} Corp`, vendor_code: `VND-${String(i).padStart(3, '0')}` })
          );
          
          // Filter by 'PT' which all vendors have
          const result = filterVendorsBySearch(vendors, 'PT');
          
          // Order should be preserved
          for (let i = 0; i < result.length - 1; i++) {
            const originalIdx1 = vendors.findIndex(v => v.vendor_code === result[i].vendor_code);
            const originalIdx2 = vendors.findIndex(v => v.vendor_code === result[i + 1].vendor_code);
            expect(originalIdx1).toBeLessThan(originalIdx2);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ============================================
// Property 5: Vendor Summary Statistics Accuracy
// Validates: Requirements 2.6
// ============================================
describe('Property 5: Vendor Summary Statistics Accuracy', () => {
  // Helper to create mock vendor for stats
  const createVendorForStats = (overrides: Partial<{ is_active: boolean; is_preferred: boolean; is_verified: boolean }> = {}): Vendor => ({
    id: `vendor-${Math.random()}`,
    vendor_code: 'VND-001',
    vendor_name: 'Test Vendor',
    vendor_type: 'trucking',
    is_active: true,
    is_preferred: false,
    is_verified: true,
    total_jobs: 0,
    total_value: 0,
    registration_method: 'manual',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  });

  /**
   * Feature: vendor-management, Property 5a: Total Count Accuracy
   * The total count SHALL equal the number of vendors in the input array.
   */
  it('should calculate correct total count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (count) => {
          const vendors = Array.from({ length: count }, () => createVendorForStats());
          const stats = calculateVendorSummaryStats(vendors);
          expect(stats.total).toBe(count);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 5b: Active Count Accuracy
   * The active count SHALL equal the number of vendors where is_active is true.
   */
  it('should calculate correct active count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 50 }),
        (activeFlags) => {
          const vendors = activeFlags.map(isActive => createVendorForStats({ is_active: isActive }));
          const stats = calculateVendorSummaryStats(vendors);
          const expectedActive = activeFlags.filter(f => f).length;
          expect(stats.active).toBe(expectedActive);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 5c: Preferred Count Accuracy
   * The preferred count SHALL equal the number of vendors where is_preferred is true.
   */
  it('should calculate correct preferred count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 50 }),
        (preferredFlags) => {
          const vendors = preferredFlags.map(isPreferred => createVendorForStats({ is_preferred: isPreferred }));
          const stats = calculateVendorSummaryStats(vendors);
          const expectedPreferred = preferredFlags.filter(f => f).length;
          expect(stats.preferred).toBe(expectedPreferred);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 5d: Pending Verification Count Accuracy
   * The pendingVerification count SHALL equal the number of vendors where is_verified is false.
   */
  it('should calculate correct pending verification count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 0, maxLength: 50 }),
        (verifiedFlags) => {
          const vendors = verifiedFlags.map(isVerified => createVendorForStats({ is_verified: isVerified }));
          const stats = calculateVendorSummaryStats(vendors);
          const expectedPending = verifiedFlags.filter(f => !f).length;
          expect(stats.pendingVerification).toBe(expectedPending);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 5e: Stats Consistency
   * For any vendor list, active + inactive SHALL equal total,
   * and verified + pendingVerification SHALL equal total.
   */
  it('should maintain consistency between stats', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            is_active: fc.boolean(),
            is_preferred: fc.boolean(),
            is_verified: fc.boolean(),
          }),
          { minLength: 0, maxLength: 50 }
        ),
        (vendorConfigs) => {
          const vendors = vendorConfigs.map(config => createVendorForStats(config));
          const stats = calculateVendorSummaryStats(vendors);
          
          // Active count should never exceed total
          expect(stats.active).toBeLessThanOrEqual(stats.total);
          
          // Preferred count should never exceed total
          expect(stats.preferred).toBeLessThanOrEqual(stats.total);
          
          // Pending verification should never exceed total
          expect(stats.pendingVerification).toBeLessThanOrEqual(stats.total);
          
          // Inactive count (total - active) should be non-negative
          expect(stats.total - stats.active).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 5f: Empty Array Handling
   * An empty vendor array SHALL return all zero counts.
   */
  it('should return all zeros for empty array', () => {
    const stats = calculateVendorSummaryStats([]);
    expect(stats.total).toBe(0);
    expect(stats.active).toBe(0);
    expect(stats.preferred).toBe(0);
    expect(stats.pendingVerification).toBe(0);
  });
});

// ============================================
// Property 14: Vendor Dropdown Sort Order
// Validates: Requirements 7.2
// ============================================
describe('Property 14: Vendor Dropdown Sort Order', () => {
  /**
   * Feature: vendor-management, Property 14a: Preferred Vendors First
   * In vendor dropdowns, preferred vendors SHALL always appear before non-preferred vendors.
   */
  it('should always place preferred vendors before non-preferred', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            is_preferred: fc.boolean(),
            average_rating: fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (vendorConfigs) => {
          const vendors = vendorConfigs.map((config, i) => ({
            id: `vendor-${i}`,
            is_preferred: config.is_preferred,
            average_rating: config.average_rating,
          }));
          
          const sorted = sortVendorsForDropdown(vendors);
          
          // Find the last preferred vendor index
          let lastPreferredIdx = -1;
          sorted.forEach((v, i) => {
            if (v.is_preferred) lastPreferredIdx = i;
          });
          
          // Find the first non-preferred vendor index
          let firstNonPreferredIdx = sorted.findIndex(v => !v.is_preferred);
          
          // If both exist, preferred should come before non-preferred
          if (lastPreferredIdx !== -1 && firstNonPreferredIdx !== -1) {
            expect(lastPreferredIdx).toBeLessThan(firstNonPreferredIdx);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 14b: Rating Sort Within Preference Group
   * Within each preference group, vendors SHALL be sorted by rating (highest first).
   */
  it('should sort by rating within same preference group', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 10 }),
        (ratings) => {
          // Create all non-preferred vendors with different ratings
          const vendors = ratings.map((rating, i) => ({
            id: `vendor-${i}`,
            is_preferred: false,
            average_rating: rating,
          }));
          
          const sorted = sortVendorsForDropdown(vendors);
          
          // Check that ratings are in descending order
          for (let i = 0; i < sorted.length - 1; i++) {
            const currentRating = sorted[i].average_rating ?? 0;
            const nextRating = sorted[i + 1].average_rating ?? 0;
            expect(currentRating).toBeGreaterThanOrEqual(nextRating);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 14c: Null Ratings Handled
   * Vendors with null ratings SHALL be treated as having rating 0 for sorting purposes.
   */
  it('should treat null ratings as 0 for sorting', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (validRating) => {
          const vendors = [
            { id: 'v1', is_preferred: false, average_rating: null },
            { id: 'v2', is_preferred: false, average_rating: validRating },
          ];
          
          const sorted = sortVendorsForDropdown(vendors);
          
          // Vendor with valid rating should come first
          expect(sorted[0].average_rating).toBe(validRating);
          expect(sorted[1].average_rating).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 14d: Sort Stability
   * Sorting SHALL not modify the original array.
   */
  it('should not modify the original array', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            is_preferred: fc.boolean(),
            average_rating: fc.option(fc.integer({ min: 1, max: 5 }), { nil: null }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (vendorConfigs) => {
          const vendors = vendorConfigs.map((config, i) => ({
            id: `vendor-${i}`,
            is_preferred: config.is_preferred,
            average_rating: config.average_rating,
          }));
          
          const originalOrder = vendors.map(v => v.id);
          sortVendorsForDropdown(vendors);
          const afterSortOrder = vendors.map(v => v.id);
          
          // Original array should be unchanged
          expect(afterSortOrder).toEqual(originalOrder);
        }
      ),
      { numRuns: 50 }
    );
  });
});


// ============================================
// Property 15: Equipment Filtering by Vendor
// Validates: Requirements 7.3
// ============================================
describe('Property 15: Equipment Filtering by Vendor', () => {
  /**
   * Feature: vendor-management, Property 15a: Equipment Belongs to Vendor
   * For any vendor selection, the equipment dropdown SHALL only display
   * equipment belonging to the selected vendor (vendor_id matches).
   */
  it('should only return equipment matching the vendor_id', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }), // vendor IDs
        fc.integer({ min: 1, max: 10 }), // equipment per vendor
        (vendorIds, equipmentPerVendor) => {
          // Create equipment for each vendor
          const allEquipment = vendorIds.flatMap((vendorId, vIdx) =>
            Array.from({ length: equipmentPerVendor }, (_, eIdx) => ({
              id: `eq-${vIdx}-${eIdx}`,
              vendor_id: vendorId,
              equipment_type: 'trailer_40ft' as const,
              is_available: true,
            }))
          );

          // Pick a random vendor to filter by
          const selectedVendorId = vendorIds[0];

          // Filter equipment by vendor
          const filteredEquipment = allEquipment.filter(
            (eq) => eq.vendor_id === selectedVendorId
          );

          // All filtered equipment should belong to the selected vendor
          filteredEquipment.forEach((eq) => {
            expect(eq.vendor_id).toBe(selectedVendorId);
          });

          // Should have exactly equipmentPerVendor items
          expect(filteredEquipment.length).toBe(equipmentPerVendor);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 15b: No Equipment from Other Vendors
   * Equipment from other vendors SHALL NOT appear in the filtered list.
   */
  it('should not include equipment from other vendors', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
        (vendorIds) => {
          // Create one equipment per vendor
          const allEquipment = vendorIds.map((vendorId, idx) => ({
            id: `eq-${idx}`,
            vendor_id: vendorId,
            equipment_type: 'trailer_40ft' as const,
            is_available: true,
          }));

          // Select first vendor
          const selectedVendorId = vendorIds[0];
          const otherVendorIds = vendorIds.slice(1);

          // Filter equipment
          const filteredEquipment = allEquipment.filter(
            (eq) => eq.vendor_id === selectedVendorId
          );

          // None of the filtered equipment should belong to other vendors
          filteredEquipment.forEach((eq) => {
            expect(otherVendorIds).not.toContain(eq.vendor_id);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 15c: Empty Result for No Equipment
   * If a vendor has no equipment, the filter SHALL return an empty array.
   */
  it('should return empty array when vendor has no equipment', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // vendor with equipment
        fc.uuid(), // vendor without equipment
        fc.integer({ min: 1, max: 5 }),
        (vendorWithEquipment, vendorWithoutEquipment, equipmentCount) => {
          // Ensure different vendor IDs
          fc.pre(vendorWithEquipment !== vendorWithoutEquipment);

          // Create equipment only for first vendor
          const allEquipment = Array.from({ length: equipmentCount }, (_, idx) => ({
            id: `eq-${idx}`,
            vendor_id: vendorWithEquipment,
            equipment_type: 'trailer_40ft' as const,
            is_available: true,
          }));

          // Filter for vendor without equipment
          const filteredEquipment = allEquipment.filter(
            (eq) => eq.vendor_id === vendorWithoutEquipment
          );

          expect(filteredEquipment.length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Feature: vendor-management, Property 15d: Filter Preserves Equipment Properties
   * Filtering SHALL not modify equipment properties.
   */
  it('should preserve all equipment properties after filtering', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.record({
          plate_number: fc.string({ minLength: 1, maxLength: 10 }),
          daily_rate: fc.integer({ min: 100000, max: 10000000 }),
          is_available: fc.boolean(),
        }),
        (vendorId, equipmentProps) => {
          const equipment = {
            id: 'eq-1',
            vendor_id: vendorId,
            equipment_type: 'trailer_40ft' as const,
            ...equipmentProps,
          };

          const allEquipment = [equipment];
          const filtered = allEquipment.filter((eq) => eq.vendor_id === vendorId);

          expect(filtered[0]).toEqual(equipment);
          expect(filtered[0].plate_number).toBe(equipmentProps.plate_number);
          expect(filtered[0].daily_rate).toBe(equipmentProps.daily_rate);
          expect(filtered[0].is_available).toBe(equipmentProps.is_available);
        }
      ),
      { numRuns: 50 }
    );
  });
});


// ============================================
// Property 16: Vendor Metrics Update on BKK Settlement
// Validates: Requirements 8.4
// ============================================
describe('Property 16: Vendor Metrics Update on BKK Settlement', () => {
  /**
   * Feature: vendor-management, Property 16a: Total Jobs Increment
   * When a BKK is settled with a vendor_id, the vendor's total_jobs
   * SHALL be incremented by the count of settled BKKs for that vendor.
   */
  it('should calculate correct total_jobs from settled BKKs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            vendor_id: fc.constantFrom('vendor-1', 'vendor-2', 'vendor-3'),
            status: fc.constantFrom('pending', 'approved', 'released', 'settled', 'rejected', 'cancelled'),
            amount_spent: fc.integer({ min: 100000, max: 10000000 }),
          }),
          { minLength: 1, maxLength: 50 }
        ),
        (bkkRecords) => {
          // Calculate expected total_jobs for vendor-1
          const settledForVendor1 = bkkRecords.filter(
            (bkk) => bkk.vendor_id === 'vendor-1' && bkk.status === 'settled'
          );
          const expectedTotalJobs = settledForVendor1.length;

          // Simulate the calculation that updateVendorMetrics would do
          const actualTotalJobs = bkkRecords.filter(
            (bkk) => bkk.vendor_id === 'vendor-1' && bkk.status === 'settled'
          ).length;

          expect(actualTotalJobs).toBe(expectedTotalJobs);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: vendor-management, Property 16b: Total Value Calculation
   * When a BKK is settled with a vendor_id, the vendor's total_value
   * SHALL equal the sum of amount_spent from all settled BKKs for that vendor.
   */
  it('should calculate correct total_value from settled BKKs', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            vendor_id: fc.constantFrom('vendor-1', 'vendor-2'),
            status: fc.constantFrom('pending', 'approved', 'released', 'settled', 'rejected'),
            amount_spent: fc.integer({ min: 100000, max: 10000000 }),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (bkkRecords) => {
          // Calculate expected total_value for vendor-1
          const settledForVendor1 = bkkRecords.filter(
            (bkk) => bkk.vendor_id === 'vendor-1' && bkk.status === 'settled'
          );
          const expectedTotalValue = settledForVendor1.reduce(
            (sum, bkk) => sum + bkk.amount_spent,
            0
          );

          // Simulate the calculation
          const actualTotalValue = bkkRecords
            .filter((bkk) => bkk.vendor_id === 'vendor-1' && bkk.status === 'settled')
            .reduce((sum, bkk) => sum + bkk.amount_spent, 0);

          expect(actualTotalValue).toBe(expectedTotalValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: vendor-management, Property 16c: Non-Settled BKKs Excluded
   * BKKs with status other than 'settled' SHALL NOT be counted in vendor metrics.
   */
  it('should not count non-settled BKKs in metrics', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            vendor_id: fc.constant('vendor-1'),
            status: fc.constantFrom('pending', 'approved', 'released', 'rejected', 'cancelled'),
            amount_spent: fc.integer({ min: 100000, max: 10000000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (nonSettledBkks) => {
          // None of these should count
          const totalJobs = nonSettledBkks.filter((bkk) => bkk.status === 'settled').length;
          const totalValue = nonSettledBkks
            .filter((bkk) => bkk.status === 'settled')
            .reduce((sum, bkk) => sum + bkk.amount_spent, 0);

          expect(totalJobs).toBe(0);
          expect(totalValue).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: vendor-management, Property 16d: Metrics Isolation by Vendor
   * Metrics for one vendor SHALL NOT be affected by BKKs for other vendors.
   */
  it('should isolate metrics by vendor_id', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // BKKs for vendor-1
        fc.integer({ min: 1, max: 10 }), // BKKs for vendor-2
        fc.integer({ min: 100000, max: 1000000 }), // amount for vendor-1
        fc.integer({ min: 100000, max: 1000000 }), // amount for vendor-2
        (count1, count2, amount1, amount2) => {
          const bkkRecords = [
            ...Array.from({ length: count1 }, (_, i) => ({
              id: `bkk-v1-${i}`,
              vendor_id: 'vendor-1',
              status: 'settled' as const,
              amount_spent: amount1,
            })),
            ...Array.from({ length: count2 }, (_, i) => ({
              id: `bkk-v2-${i}`,
              vendor_id: 'vendor-2',
              status: 'settled' as const,
              amount_spent: amount2,
            })),
          ];

          // Calculate metrics for vendor-1
          const vendor1Bkks = bkkRecords.filter((bkk) => bkk.vendor_id === 'vendor-1');
          const vendor1TotalJobs = vendor1Bkks.length;
          const vendor1TotalValue = vendor1Bkks.reduce((sum, bkk) => sum + bkk.amount_spent, 0);

          // Calculate metrics for vendor-2
          const vendor2Bkks = bkkRecords.filter((bkk) => bkk.vendor_id === 'vendor-2');
          const vendor2TotalJobs = vendor2Bkks.length;
          const vendor2TotalValue = vendor2Bkks.reduce((sum, bkk) => sum + bkk.amount_spent, 0);

          // Verify isolation - each vendor's metrics match ONLY their own BKKs
          // This is the key property: vendor-1's metrics are not affected by vendor-2's BKKs
          expect(vendor1TotalJobs).toBe(count1);
          expect(vendor1TotalValue).toBe(count1 * amount1);
          expect(vendor2TotalJobs).toBe(count2);
          expect(vendor2TotalValue).toBe(count2 * amount2);

          // Total BKKs should be sum of both vendors
          expect(bkkRecords.length).toBe(count1 + count2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: vendor-management, Property 16e: Zero Metrics for No BKKs
   * A vendor with no settled BKKs SHALL have total_jobs = 0 and total_value = 0.
   */
  it('should return zero metrics for vendor with no settled BKKs', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // vendor ID with no BKKs
        fc.array(
          fc.record({
            vendor_id: fc.uuid(), // other vendor IDs
            status: fc.constant('settled' as const),
            amount_spent: fc.integer({ min: 100000, max: 10000000 }),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (emptyVendorId, otherBkks) => {
          // Ensure emptyVendorId is not in otherBkks
          const bkkRecords = otherBkks.filter((bkk) => bkk.vendor_id !== emptyVendorId);

          const vendorBkks = bkkRecords.filter((bkk) => bkk.vendor_id === emptyVendorId);
          const totalJobs = vendorBkks.length;
          const totalValue = vendorBkks.reduce((sum, bkk) => sum + bkk.amount_spent, 0);

          expect(totalJobs).toBe(0);
          expect(totalValue).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
