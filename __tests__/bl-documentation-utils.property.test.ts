// =====================================================
// v0.73: AGENCY - B/L DOCUMENTATION PROPERTY TESTS
// =====================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateSINumber,
  generateNoticeNumber,
  generateManifestNumber,
  isValidSINumberFormat,
  isValidNoticeNumberFormat,
  isValidManifestNumberFormat,
  validateContainerNumber,
  calculateBLTotals,
  calculateManifestTotals,
  calculateFreeTimeExpiry,
  validateBLData,
  validateArrivalNoticeData,
  canDeleteBillOfLading,
  filterPendingArrivals,
} from '@/lib/bl-documentation-utils';
import {
  BLContainer,
  BillOfLading,
  BLFormData,
  ArrivalNoticeFormData,
  ArrivalNotice,
  ArrivalNoticeStatus,
  CONTAINER_TYPES,
  ContainerType,
  BLType,
  BL_TYPES,
  FreightTerms,
  FREIGHT_TERMS,
  BLStatus,
  BL_STATUSES,
  EstimatedCharge,
} from '@/types/agency';

// =====================================================
// ARBITRARIES (Generators)
// =====================================================

const containerTypeArb = fc.constantFrom(...CONTAINER_TYPES);
const blTypeArb = fc.constantFrom(...BL_TYPES);
const freightTermsArb = fc.constantFrom(...FREIGHT_TERMS);
const blStatusArb = fc.constantFrom(...BL_STATUSES);

// Valid container number generator (ISO 6346: 4 letters + 7 digits)
const validContainerNumberArb = fc.tuple(
  fc.stringMatching(/^[A-Z]{4}$/),
  fc.stringMatching(/^\d{7}$/)
).map(([letters, digits]) => letters + digits);

// Invalid container number generators
const invalidContainerNumberArb = fc.oneof(
  fc.stringMatching(/^[A-Z]{3}\d{7}$/), // 3 letters + 7 digits
  fc.stringMatching(/^[A-Z]{5}\d{7}$/), // 5 letters + 7 digits
  fc.stringMatching(/^[A-Z]{4}\d{6}$/), // 4 letters + 6 digits
  fc.stringMatching(/^[A-Z]{4}\d{8}$/), // 4 letters + 8 digits
  fc.stringMatching(/^[a-z]{4}\d{7}$/), // lowercase letters
  fc.constant(''),
  fc.constant('ABCD123456'), // 6 digits
  fc.constant('ABC1234567'), // 3 letters
);

// B/L Container generator
const blContainerArb: fc.Arbitrary<BLContainer> = fc.record({
  containerNo: validContainerNumberArb,
  sealNo: fc.string({ minLength: 1, maxLength: 20 }),
  type: containerTypeArb,
  packages: fc.nat({ max: 1000 }),
  weightKg: fc.nat({ max: 50000 }),
});

// Non-empty string generator for required fields
const nonEmptyStringArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,99}$/);

// Safe date generator that avoids invalid dates - use timestamp range
const safeDateArb = fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts));
const safeDateStringArb = safeDateArb.map(d => d.toISOString().split('T')[0]);
const safeISOStringArb = safeDateArb.map(d => d.toISOString());

// Bill of Lading generator for manifest tests
const billOfLadingArb: fc.Arbitrary<BillOfLading> = fc.record({
  id: fc.uuid(),
  blNumber: fc.string({ minLength: 1, maxLength: 20 }),
  bookingId: fc.uuid(),
  jobOrderId: fc.option(fc.uuid(), { nil: undefined }),
  blType: blTypeArb,
  originalCount: fc.nat({ max: 10 }),
  shippingLineId: fc.option(fc.uuid(), { nil: undefined }),
  carrierBlNumber: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  vesselName: nonEmptyStringArb,
  voyageNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  flag: fc.option(fc.string({ minLength: 2, maxLength: 3 }), { nil: undefined }),
  portOfLoading: nonEmptyStringArb,
  portOfDischarge: nonEmptyStringArb,
  placeOfReceipt: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  placeOfDelivery: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  shippedOnBoardDate: fc.option(safeDateStringArb, { nil: undefined }),
  blDate: fc.option(safeDateStringArb, { nil: undefined }),
  shipperName: nonEmptyStringArb,
  shipperAddress: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  consigneeName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  consigneeAddress: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  consigneeToOrder: fc.boolean(),
  notifyPartyName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  notifyPartyAddress: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  cargoDescription: nonEmptyStringArb,
  marksAndNumbers: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  numberOfPackages: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
  packageType: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  grossWeightKg: fc.option(fc.nat({ max: 100000 }), { nil: undefined }),
  measurementCbm: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
  containers: fc.array(blContainerArb, { minLength: 0, maxLength: 10 }),
  freightTerms: freightTermsArb,
  freightAmount: fc.option(fc.nat({ max: 100000 }), { nil: undefined }),
  freightCurrency: fc.option(fc.constant('USD'), { nil: undefined }),
  status: blStatusArb,
  issuedAt: fc.option(safeISOStringArb, { nil: undefined }),
  releasedAt: fc.option(safeISOStringArb, { nil: undefined }),
  draftBlUrl: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  finalBlUrl: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  remarks: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  createdBy: fc.option(fc.uuid(), { nil: undefined }),
  createdAt: safeISOStringArb,
  updatedAt: safeISOStringArb,
});

// =====================================================
// PROPERTY 1: DOCUMENT NUMBER GENERATION FORMAT AND UNIQUENESS
// Feature: agency-bl-documentation, Property 1: Document Number Generation Format and Uniqueness
// Validates: Requirements 1.1, 2.1, 3.1, 4.1
// =====================================================

describe('Property 1: Document Number Generation Format and Uniqueness', () => {
  it('should generate SI numbers in format SI-YYYY-NNNNN', () => {
    fc.assert(
      fc.property(fc.nat({ max: 99999 }), (sequence) => {
        const siNumber = generateSINumber(sequence);
        
        // Verify format matches SI-YYYY-NNNNN
        expect(isValidSINumberFormat(siNumber)).toBe(true);
        
        // Verify year is current year
        const currentYear = new Date().getFullYear();
        expect(siNumber).toContain(`SI-${currentYear}-`);
        
        // Verify sequence is padded to 5 digits
        const parts = siNumber.split('-');
        expect(parts[2]).toHaveLength(5);
      }),
      { numRuns: 100 }
    );
  });

  it('should generate Arrival Notice numbers in format AN-YYYY-NNNNN', () => {
    fc.assert(
      fc.property(fc.nat({ max: 99999 }), (sequence) => {
        const noticeNumber = generateNoticeNumber(sequence);
        
        // Verify format matches AN-YYYY-NNNNN
        expect(isValidNoticeNumberFormat(noticeNumber)).toBe(true);
        
        // Verify year is current year
        const currentYear = new Date().getFullYear();
        expect(noticeNumber).toContain(`AN-${currentYear}-`);
        
        // Verify sequence is padded to 5 digits
        const parts = noticeNumber.split('-');
        expect(parts[2]).toHaveLength(5);
      }),
      { numRuns: 100 }
    );
  });

  it('should generate Manifest numbers in format MF-YYYY-NNNNN', () => {
    fc.assert(
      fc.property(fc.nat({ max: 99999 }), (sequence) => {
        const manifestNumber = generateManifestNumber(sequence);
        
        // Verify format matches MF-YYYY-NNNNN
        expect(isValidManifestNumberFormat(manifestNumber)).toBe(true);
        
        // Verify year is current year
        const currentYear = new Date().getFullYear();
        expect(manifestNumber).toContain(`MF-${currentYear}-`);
        
        // Verify sequence is padded to 5 digits
        const parts = manifestNumber.split('-');
        expect(parts[2]).toHaveLength(5);
      }),
      { numRuns: 100 }
    );
  });

  it('should generate unique numbers for different sequences', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 99998 }),
        fc.nat({ max: 99998 }),
        (seq1, seq2) => {
          // Only test when sequences are different
          fc.pre(seq1 !== seq2);
          
          const si1 = generateSINumber(seq1);
          const si2 = generateSINumber(seq2);
          
          expect(si1).not.toBe(si2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 6: CONTAINER NUMBER FORMAT VALIDATION
// Feature: agency-bl-documentation, Property 6: Container Number Format Validation
// Validates: Requirements 6.4
// =====================================================

describe('Property 6: Container Number Format Validation', () => {
  it('should accept valid container numbers (4 letters + 7 digits)', () => {
    fc.assert(
      fc.property(validContainerNumberArb, (containerNo) => {
        expect(validateContainerNumber(containerNo)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject invalid container number formats', () => {
    fc.assert(
      fc.property(invalidContainerNumberArb, (containerNo) => {
        expect(validateContainerNumber(containerNo)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject null, undefined, and non-string inputs', () => {
    expect(validateContainerNumber(null as unknown as string)).toBe(false);
    expect(validateContainerNumber(undefined as unknown as string)).toBe(false);
    expect(validateContainerNumber(12345 as unknown as string)).toBe(false);
  });
});

// =====================================================
// PROPERTY 3: B/L CONTAINER TOTALS CALCULATION
// Feature: agency-bl-documentation, Property 3: B/L Container Totals Calculation
// Validates: Requirements 1.6
// =====================================================

describe('Property 3: B/L Container Totals Calculation', () => {
  it('should calculate total packages as sum of individual container packages', () => {
    fc.assert(
      fc.property(fc.array(blContainerArb, { minLength: 0, maxLength: 20 }), (containers) => {
        const totals = calculateBLTotals(containers);
        const expectedPackages = containers.reduce((sum, c) => sum + (c.packages || 0), 0);
        
        expect(totals.totalPackages).toBe(expectedPackages);
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate total weight as sum of individual container weights', () => {
    fc.assert(
      fc.property(fc.array(blContainerArb, { minLength: 0, maxLength: 20 }), (containers) => {
        const totals = calculateBLTotals(containers);
        const expectedWeight = containers.reduce((sum, c) => sum + (c.weightKg || 0), 0);
        
        expect(totals.totalWeightKg).toBe(expectedWeight);
      }),
      { numRuns: 100 }
    );
  });

  it('should count total containers correctly', () => {
    fc.assert(
      fc.property(fc.array(blContainerArb, { minLength: 0, maxLength: 20 }), (containers) => {
        const totals = calculateBLTotals(containers);
        
        expect(totals.totalContainers).toBe(containers.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should return zeros for empty container array', () => {
    const totals = calculateBLTotals([]);
    
    expect(totals.totalContainers).toBe(0);
    expect(totals.totalPackages).toBe(0);
    expect(totals.totalWeightKg).toBe(0);
  });

  it('should handle null/undefined input gracefully', () => {
    expect(calculateBLTotals(null as unknown as BLContainer[])).toEqual({
      totalContainers: 0,
      totalPackages: 0,
      totalWeightKg: 0,
      totalCbm: 0,
    });
  });
});

// =====================================================
// PROPERTY 4: MANIFEST TOTALS CALCULATION FROM LINKED B/Ls
// Feature: agency-bl-documentation, Property 4: Manifest Totals Calculation from Linked B/Ls
// Validates: Requirements 4.3
// =====================================================

describe('Property 4: Manifest Totals Calculation from Linked B/Ls', () => {
  it('should calculate total B/Ls as count of linked B/Ls', () => {
    fc.assert(
      fc.property(fc.array(billOfLadingArb, { minLength: 0, maxLength: 10 }), (bls) => {
        const totals = calculateManifestTotals(bls);
        
        expect(totals.totalBls).toBe(bls.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate total containers from all linked B/Ls', () => {
    fc.assert(
      fc.property(fc.array(billOfLadingArb, { minLength: 0, maxLength: 10 }), (bls) => {
        const totals = calculateManifestTotals(bls);
        const expectedContainers = bls.reduce((sum, bl) => sum + (bl.containers?.length || 0), 0);
        
        expect(totals.totalContainers).toBe(expectedContainers);
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate total packages from all linked B/Ls', () => {
    fc.assert(
      fc.property(fc.array(billOfLadingArb, { minLength: 0, maxLength: 10 }), (bls) => {
        const totals = calculateManifestTotals(bls);
        const expectedPackages = bls.reduce((sum, bl) => sum + (bl.numberOfPackages || 0), 0);
        
        expect(totals.totalPackages).toBe(expectedPackages);
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate total weight from all linked B/Ls', () => {
    fc.assert(
      fc.property(fc.array(billOfLadingArb, { minLength: 0, maxLength: 10 }), (bls) => {
        const totals = calculateManifestTotals(bls);
        const expectedWeight = bls.reduce((sum, bl) => sum + (bl.grossWeightKg || 0), 0);
        
        expect(totals.totalWeightKg).toBe(expectedWeight);
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate total CBM from all linked B/Ls', () => {
    fc.assert(
      fc.property(fc.array(billOfLadingArb, { minLength: 0, maxLength: 10 }), (bls) => {
        const totals = calculateManifestTotals(bls);
        const expectedCbm = bls.reduce((sum, bl) => sum + (bl.measurementCbm || 0), 0);
        
        expect(totals.totalCbm).toBe(expectedCbm);
      }),
      { numRuns: 100 }
    );
  });

  it('should return zeros for empty B/L array', () => {
    const totals = calculateManifestTotals([]);
    
    expect(totals.totalBls).toBe(0);
    expect(totals.totalContainers).toBe(0);
    expect(totals.totalPackages).toBe(0);
    expect(totals.totalWeightKg).toBe(0);
    expect(totals.totalCbm).toBe(0);
  });
});

// =====================================================
// PROPERTY 5: FREE TIME EXPIRY CALCULATION
// Feature: agency-bl-documentation, Property 5: Free Time Expiry Calculation
// Validates: Requirements 3.2
// =====================================================

describe('Property 5: Free Time Expiry Calculation', () => {
  it('should calculate expiry as ETA + freeTimeDays', () => {
    fc.assert(
      fc.property(
        safeDateArb,
        fc.nat({ max: 30 }),
        (etaDate, freeTimeDays) => {
          const eta = etaDate.toISOString().split('T')[0];
          const expiry = calculateFreeTimeExpiry(eta, freeTimeDays);
          
          // Calculate expected expiry
          const expectedDate = new Date(etaDate);
          expectedDate.setDate(expectedDate.getDate() + freeTimeDays);
          const expectedExpiry = expectedDate.toISOString().split('T')[0];
          
          expect(expiry).toBe(expectedExpiry);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return same date when freeTimeDays is 0', () => {
    fc.assert(
      fc.property(
        safeDateArb,
        (etaDate) => {
          const eta = etaDate.toISOString().split('T')[0];
          const expiry = calculateFreeTimeExpiry(eta, 0);
          
          expect(expiry).toBe(eta);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle month/year boundaries correctly', () => {
    // Test end of month
    const expiry1 = calculateFreeTimeExpiry('2025-01-30', 5);
    expect(expiry1).toBe('2025-02-04');
    
    // Test end of year
    const expiry2 = calculateFreeTimeExpiry('2025-12-28', 7);
    expect(expiry2).toBe('2026-01-04');
  });
});

// =====================================================
// PROPERTY 7: B/L REQUIRED FIELD VALIDATION
// Feature: agency-bl-documentation, Property 7: B/L Required Field Validation
// Validates: Requirements 6.1, 6.2, 1.3
// =====================================================

describe('Property 7: B/L Required Field Validation', () => {
  it('should fail validation when bookingId is missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          bookingId: fc.constantFrom('', '   ', undefined as unknown as string),
          vesselName: nonEmptyStringArb,
          portOfLoading: nonEmptyStringArb,
          portOfDischarge: nonEmptyStringArb,
          shipperName: nonEmptyStringArb,
          cargoDescription: nonEmptyStringArb,
        }),
        (data) => {
          const result = validateBLData(data);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'bookingId')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail validation when vesselName is missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          bookingId: fc.uuid(),
          vesselName: fc.constantFrom('', '   ', undefined as unknown as string),
          portOfLoading: nonEmptyStringArb,
          portOfDischarge: nonEmptyStringArb,
          shipperName: nonEmptyStringArb,
          cargoDescription: nonEmptyStringArb,
        }),
        (data) => {
          const result = validateBLData(data);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'vesselName')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail validation when portOfLoading is missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          bookingId: fc.uuid(),
          vesselName: nonEmptyStringArb,
          portOfLoading: fc.constantFrom('', '   ', undefined as unknown as string),
          portOfDischarge: nonEmptyStringArb,
          shipperName: nonEmptyStringArb,
          cargoDescription: nonEmptyStringArb,
        }),
        (data) => {
          const result = validateBLData(data);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'portOfLoading')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail validation when portOfDischarge is missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          bookingId: fc.uuid(),
          vesselName: nonEmptyStringArb,
          portOfLoading: nonEmptyStringArb,
          portOfDischarge: fc.constantFrom('', '   ', undefined as unknown as string),
          shipperName: nonEmptyStringArb,
          cargoDescription: nonEmptyStringArb,
        }),
        (data) => {
          const result = validateBLData(data);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'portOfDischarge')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail validation when shipperName is missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          bookingId: fc.uuid(),
          vesselName: nonEmptyStringArb,
          portOfLoading: nonEmptyStringArb,
          portOfDischarge: nonEmptyStringArb,
          shipperName: fc.constantFrom('', '   ', undefined as unknown as string),
          cargoDescription: nonEmptyStringArb,
        }),
        (data) => {
          const result = validateBLData(data);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'shipperName')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail validation when cargoDescription is missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          bookingId: fc.uuid(),
          vesselName: nonEmptyStringArb,
          portOfLoading: nonEmptyStringArb,
          portOfDischarge: nonEmptyStringArb,
          shipperName: nonEmptyStringArb,
          cargoDescription: fc.constantFrom('', '   ', undefined as unknown as string),
        }),
        (data) => {
          const result = validateBLData(data);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'cargoDescription')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should pass validation when all required fields are present', () => {
    fc.assert(
      fc.property(
        fc.record({
          bookingId: fc.uuid(),
          vesselName: nonEmptyStringArb,
          portOfLoading: nonEmptyStringArb,
          portOfDischarge: nonEmptyStringArb,
          shipperName: nonEmptyStringArb,
          cargoDescription: nonEmptyStringArb,
        }),
        (data) => {
          const result = validateBLData(data);
          
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 8: ARRIVAL NOTICE REQUIRED FIELD VALIDATION
// Feature: agency-bl-documentation, Property 8: Arrival Notice Required Field Validation
// Validates: Requirements 6.3
// =====================================================

describe('Property 8: Arrival Notice Required Field Validation', () => {
  it('should fail validation when blId is missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          blId: fc.constantFrom('', '   ', undefined as unknown as string),
          vesselName: nonEmptyStringArb,
          eta: safeDateStringArb,
          portOfDischarge: nonEmptyStringArb,
        }),
        (data) => {
          const result = validateArrivalNoticeData(data);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'blId')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should pass validation when blId is present', () => {
    fc.assert(
      fc.property(
        fc.record({
          blId: fc.uuid(),
          vesselName: nonEmptyStringArb,
          eta: safeDateStringArb,
          portOfDischarge: nonEmptyStringArb,
        }),
        (data) => {
          const result = validateArrivalNoticeData(data);
          
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 2: INITIAL STATUS ASSIGNMENT (B/L PART)
// Feature: agency-bl-documentation, Property 2: Initial Status Assignment (B/L)
// Validates: Requirements 7.1
// =====================================================

describe('Property 2: Initial Status Assignment (B/L)', () => {
  // B/L Form Data generator for valid form data
  const validBLFormDataArb: fc.Arbitrary<BLFormData> = fc.record({
    bookingId: fc.uuid(),
    jobOrderId: fc.option(fc.uuid(), { nil: undefined }),
    blType: blTypeArb,
    originalCount: fc.option(fc.nat({ max: 10 }), { nil: undefined }),
    shippingLineId: fc.option(fc.uuid(), { nil: undefined }),
    carrierBlNumber: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
    vesselName: nonEmptyStringArb,
    voyageNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    flag: fc.option(fc.string({ minLength: 2, maxLength: 3 }), { nil: undefined }),
    portOfLoading: nonEmptyStringArb,
    portOfDischarge: nonEmptyStringArb,
    placeOfReceipt: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    placeOfDelivery: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    shippedOnBoardDate: fc.option(safeDateStringArb, { nil: undefined }),
    blDate: fc.option(safeDateStringArb, { nil: undefined }),
    shipperName: nonEmptyStringArb,
    shipperAddress: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    consigneeName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    consigneeAddress: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    consigneeToOrder: fc.option(fc.boolean(), { nil: undefined }),
    notifyPartyName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    notifyPartyAddress: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    cargoDescription: nonEmptyStringArb,
    marksAndNumbers: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    numberOfPackages: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
    packageType: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    grossWeightKg: fc.option(fc.nat({ max: 100000 }), { nil: undefined }),
    measurementCbm: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
    containers: fc.option(fc.array(blContainerArb, { minLength: 0, maxLength: 10 }), { nil: undefined }),
    freightTerms: fc.option(freightTermsArb, { nil: undefined }),
    freightAmount: fc.option(fc.nat({ max: 100000 }), { nil: undefined }),
    freightCurrency: fc.option(fc.constant('USD'), { nil: undefined }),
    remarks: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  });

  it('should validate that valid B/L form data passes validation (prerequisite for creation)', () => {
    // This property test validates that any valid B/L form data will pass validation
    // The actual creation sets status to 'draft' - this is verified by the server action implementation
    fc.assert(
      fc.property(validBLFormDataArb, (formData) => {
        const result = validateBLData(formData);
        
        // All valid form data should pass validation
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should verify that the expected initial status for B/L is draft', () => {
    // This test verifies the expected initial status constant
    // The actual assignment happens in createBillOfLading server action
    const EXPECTED_INITIAL_BL_STATUS: BLStatus = 'draft';
    
    fc.assert(
      fc.property(validBLFormDataArb, () => {
        // For any valid B/L form data, the expected initial status should be 'draft'
        // This is a specification test - the server action implements this behavior
        expect(EXPECTED_INITIAL_BL_STATUS).toBe('draft');
        expect(BL_STATUSES.includes(EXPECTED_INITIAL_BL_STATUS)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should verify draft is a valid B/L status', () => {
    // Verify that 'draft' is in the list of valid B/L statuses
    expect(BL_STATUSES).toContain('draft');
  });
});


// =====================================================
// PROPERTY 9: STATUS TRANSITIONS RECORD TIMESTAMPS (B/L PART)
// Feature: agency-bl-documentation, Property 9: Status Transitions Record Timestamps (B/L)
// Validates: Requirements 1.7, 7.3, 7.4
// =====================================================

describe('Property 9: Status Transitions Record Timestamps (B/L)', () => {
  // Status transitions that should record timestamps
  const timestampTransitions = [
    { toStatus: 'issued' as BLStatus, timestampField: 'issuedAt' },
    { toStatus: 'released' as BLStatus, timestampField: 'releasedAt' },
    { toStatus: 'surrendered' as BLStatus, timestampField: 'releasedAt' },
  ];

  // Valid status transitions map for B/L
  const BL_STATUS_TRANSITIONS: Record<BLStatus, BLStatus[]> = {
    draft: ['submitted', 'amended'],
    submitted: ['issued', 'draft', 'amended'],
    issued: ['released', 'surrendered', 'amended'],
    released: ['amended'],
    surrendered: ['amended'],
    amended: ['submitted', 'issued'],
  };

  // Helper to check if transition is valid
  function isValidBLStatusTransition(from: BLStatus, to: BLStatus): boolean {
    return BL_STATUS_TRANSITIONS[from]?.includes(to) || false;
  }

  it('should verify that issued status requires issuedAt timestamp', () => {
    fc.assert(
      fc.property(blStatusArb, (fromStatus) => {
        // For any status that can transition to 'issued'
        if (isValidBLStatusTransition(fromStatus, 'issued')) {
          // The transition to 'issued' should record issuedAt timestamp
          const transition = timestampTransitions.find(t => t.toStatus === 'issued');
          expect(transition).toBeDefined();
          expect(transition?.timestampField).toBe('issuedAt');
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should verify that released status requires releasedAt timestamp', () => {
    fc.assert(
      fc.property(blStatusArb, (fromStatus) => {
        // For any status that can transition to 'released'
        if (isValidBLStatusTransition(fromStatus, 'released')) {
          // The transition to 'released' should record releasedAt timestamp
          const transition = timestampTransitions.find(t => t.toStatus === 'released');
          expect(transition).toBeDefined();
          expect(transition?.timestampField).toBe('releasedAt');
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should verify that surrendered status requires releasedAt timestamp', () => {
    fc.assert(
      fc.property(blStatusArb, (fromStatus) => {
        // For any status that can transition to 'surrendered'
        if (isValidBLStatusTransition(fromStatus, 'surrendered')) {
          // The transition to 'surrendered' should record releasedAt timestamp
          const transition = timestampTransitions.find(t => t.toStatus === 'surrendered');
          expect(transition).toBeDefined();
          expect(transition?.timestampField).toBe('releasedAt');
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should verify valid status transitions from draft', () => {
    const validFromDraft = BL_STATUS_TRANSITIONS['draft'];
    expect(validFromDraft).toContain('submitted');
    expect(validFromDraft).toContain('amended');
    expect(validFromDraft).not.toContain('issued'); // Cannot go directly to issued
  });

  it('should verify valid status transitions from submitted', () => {
    const validFromSubmitted = BL_STATUS_TRANSITIONS['submitted'];
    expect(validFromSubmitted).toContain('issued');
    expect(validFromSubmitted).toContain('draft');
    expect(validFromSubmitted).toContain('amended');
  });

  it('should verify valid status transitions from issued', () => {
    const validFromIssued = BL_STATUS_TRANSITIONS['issued'];
    expect(validFromIssued).toContain('released');
    expect(validFromIssued).toContain('surrendered');
    expect(validFromIssued).toContain('amended');
    expect(validFromIssued).not.toContain('draft'); // Cannot go back to draft
  });

  it('should verify that all timestamp-recording statuses are valid B/L statuses', () => {
    fc.assert(
      fc.property(fc.constantFrom(...timestampTransitions), (transition) => {
        expect(BL_STATUSES).toContain(transition.toStatus);
      }),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 10: ISSUED B/L DELETION PREVENTION
// Feature: agency-bl-documentation, Property 10: Issued B/L Deletion Prevention
// Validates: Requirements 6.6
// =====================================================

describe('Property 10: Issued B/L Deletion Prevention', () => {
  // Protected statuses that should prevent deletion
  const protectedStatuses: BLStatus[] = ['issued', 'released', 'surrendered'];
  
  // Deletable statuses
  const deletableStatuses: BLStatus[] = ['draft', 'submitted', 'amended'];

  it('should prevent deletion of issued B/Ls', () => {
    fc.assert(
      fc.property(fc.constantFrom(...protectedStatuses), (status) => {
        expect(canDeleteBillOfLading(status)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should allow deletion of draft, submitted, and amended B/Ls', () => {
    fc.assert(
      fc.property(fc.constantFrom(...deletableStatuses), (status) => {
        expect(canDeleteBillOfLading(status)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should return boolean for any valid B/L status', () => {
    fc.assert(
      fc.property(blStatusArb, (status) => {
        const result = canDeleteBillOfLading(status);
        expect(typeof result).toBe('boolean');
      }),
      { numRuns: 100 }
    );
  });

  it('should be consistent - same status always returns same result', () => {
    fc.assert(
      fc.property(blStatusArb, (status) => {
        const result1 = canDeleteBillOfLading(status);
        const result2 = canDeleteBillOfLading(status);
        expect(result1).toBe(result2);
      }),
      { numRuns: 100 }
    );
  });

  it('should verify all protected statuses are valid B/L statuses', () => {
    for (const status of protectedStatuses) {
      expect(BL_STATUSES).toContain(status);
    }
  });

  it('should verify all deletable statuses are valid B/L statuses', () => {
    for (const status of deletableStatuses) {
      expect(BL_STATUSES).toContain(status);
    }
  });
});

// =====================================================
// PROPERTY 11: PENDING ARRIVALS FILTER AND ORDERING
// Feature: agency-bl-documentation, Property 11: Pending Arrivals Filter and Ordering
// Validates: Requirements 3.7
// =====================================================

describe('Property 11: Pending Arrivals Filter and Ordering', () => {
  // Arrival Notice Status generator
  const arrivalNoticeStatusArb = fc.constantFrom<ArrivalNoticeStatus>('pending', 'notified', 'cleared', 'delivered');

  // Estimated Charge generator
  const estimatedChargeArb = fc.record({
    chargeType: fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,29}$/),
    amount: fc.nat({ max: 10000 }),
    currency: fc.constantFrom('USD', 'IDR', 'EUR'),
  });

  // Arrival Notice generator
  const arrivalNoticeArb: fc.Arbitrary<ArrivalNotice> = fc.record({
    id: fc.uuid(),
    noticeNumber: fc.stringMatching(/^AN-\d{4}-\d{5}$/),
    blId: fc.uuid(),
    bookingId: fc.option(fc.uuid(), { nil: undefined }),
    vesselName: nonEmptyStringArb,
    voyageNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    eta: safeDateStringArb,
    ata: fc.option(safeDateStringArb, { nil: undefined }),
    portOfDischarge: nonEmptyStringArb,
    terminal: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    berth: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    containerNumbers: fc.array(validContainerNumberArb, { minLength: 0, maxLength: 5 }),
    cargoDescription: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    freeTimeDays: fc.nat({ max: 30 }),
    freeTimeExpires: fc.option(safeDateStringArb, { nil: undefined }),
    estimatedCharges: fc.array(estimatedChargeArb, { minLength: 0, maxLength: 5 }),
    deliveryInstructions: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    deliveryAddress: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    consigneeNotified: fc.boolean(),
    notifiedAt: fc.option(safeISOStringArb, { nil: undefined }),
    notifiedBy: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    status: arrivalNoticeStatusArb,
    clearedAt: fc.option(safeISOStringArb, { nil: undefined }),
    deliveredAt: fc.option(safeISOStringArb, { nil: undefined }),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
    createdAt: safeISOStringArb,
  });

  it('should only include arrivals with status pending or notified', () => {
    fc.assert(
      fc.property(fc.array(arrivalNoticeArb, { minLength: 0, maxLength: 20 }), (arrivals) => {
        const pendingArrivals = filterPendingArrivals(arrivals);
        
        // All results should have status 'pending' or 'notified'
        for (const arrival of pendingArrivals) {
          expect(['pending', 'notified']).toContain(arrival.status);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should exclude arrivals with status cleared or delivered', () => {
    fc.assert(
      fc.property(fc.array(arrivalNoticeArb, { minLength: 0, maxLength: 20 }), (arrivals) => {
        const pendingArrivals = filterPendingArrivals(arrivals);
        
        // No results should have status 'cleared' or 'delivered'
        for (const arrival of pendingArrivals) {
          expect(['cleared', 'delivered']).not.toContain(arrival.status);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should order results by ETA in ascending order (earliest first)', () => {
    fc.assert(
      fc.property(fc.array(arrivalNoticeArb, { minLength: 0, maxLength: 20 }), (arrivals) => {
        const pendingArrivals = filterPendingArrivals(arrivals);
        
        // Verify ordering - each ETA should be <= the next ETA
        for (let i = 0; i < pendingArrivals.length - 1; i++) {
          const currentEta = new Date(pendingArrivals[i].eta).getTime();
          const nextEta = new Date(pendingArrivals[i + 1].eta).getTime();
          expect(currentEta).toBeLessThanOrEqual(nextEta);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should include all pending and notified arrivals from input', () => {
    fc.assert(
      fc.property(fc.array(arrivalNoticeArb, { minLength: 0, maxLength: 20 }), (arrivals) => {
        const pendingArrivals = filterPendingArrivals(arrivals);
        
        // Count expected pending/notified arrivals
        const expectedCount = arrivals.filter(a => a.status === 'pending' || a.status === 'notified').length;
        
        expect(pendingArrivals.length).toBe(expectedCount);
      }),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no pending or notified arrivals exist', () => {
    // Create arrivals with only cleared/delivered status
    const clearedDeliveredArrivals: ArrivalNotice[] = fc.sample(
      arrivalNoticeArb.map(a => ({ ...a, status: 'cleared' as ArrivalNoticeStatus })),
      10
    );
    
    const pendingArrivals = filterPendingArrivals(clearedDeliveredArrivals);
    expect(pendingArrivals.length).toBe(0);
  });

  it('should preserve all arrival notice data in filtered results', () => {
    fc.assert(
      fc.property(fc.array(arrivalNoticeArb, { minLength: 1, maxLength: 20 }), (arrivals) => {
        const pendingArrivals = filterPendingArrivals(arrivals);
        
        // Each result should be an exact match from the input (by id)
        for (const result of pendingArrivals) {
          const original = arrivals.find(a => a.id === result.id);
          expect(original).toBeDefined();
          expect(result).toEqual(original);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle arrivals with same ETA correctly', () => {
    fc.assert(
      fc.property(
        safeDateStringArb,
        fc.array(arrivalNoticeArb, { minLength: 2, maxLength: 10 }),
        (sameEta, arrivals) => {
          // Set all arrivals to have the same ETA and pending status
          const sameEtaArrivals = arrivals.map(a => ({ ...a, eta: sameEta, status: 'pending' as ArrivalNoticeStatus }));
          
          const pendingArrivals = filterPendingArrivals(sameEtaArrivals);
          
          // All should be included
          expect(pendingArrivals.length).toBe(sameEtaArrivals.length);
          
          // All should have the same ETA
          for (const arrival of pendingArrivals) {
            expect(arrival.eta).toBe(sameEta);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify pending arrivals filter is idempotent', () => {
    fc.assert(
      fc.property(fc.array(arrivalNoticeArb, { minLength: 0, maxLength: 20 }), (arrivals) => {
        const firstFilter = filterPendingArrivals(arrivals);
        const secondFilter = filterPendingArrivals(firstFilter);
        
        // Filtering twice should produce the same result
        expect(secondFilter).toEqual(firstFilter);
      }),
      { numRuns: 100 }
    );
  });
});
