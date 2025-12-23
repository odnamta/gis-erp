// =====================================================
// v0.72: AGENCY - BOOKING MANAGEMENT PROPERTY TESTS
// =====================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidStatusTransition,
  getNextValidStatuses,
  calculateTotalWeight,
  calculateTotalContainers,
  getCutoffWarningLevel,
  getDaysUntilCutoff,
  validateBookingForSubmission,
  validateContainerData,
  getNextAmendmentNumber,
  extractChangedFields,
  filterBookings,
  isValidBookingNumberFormat,
  calculateFreightTotal,
} from '@/lib/booking-utils';
import {
  BookingStatus,
  BOOKING_STATUSES,
  BookingContainer,
  ContainerType,
  CONTAINER_TYPES,
  FreightBooking,
  BookingAmendment,
  CommodityType,
  COMMODITY_TYPES,
} from '@/types/agency';

// =====================================================
// ARBITRARIES (Generators)
// =====================================================

const bookingStatusArb = fc.constantFrom(...BOOKING_STATUSES);
const containerTypeArb = fc.constantFrom(...CONTAINER_TYPES);
const commodityTypeArb = fc.constantFrom(...COMMODITY_TYPES);

// Safe date generator that avoids invalid dates - use timestamp range
const safeDateArb = fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts));

const bookingContainerArb: fc.Arbitrary<BookingContainer> = fc.record({
  id: fc.uuid(),
  bookingId: fc.uuid(),
  containerNumber: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  containerType: containerTypeArb,
  sealNumber: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  packagesCount: fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
  packageType: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  grossWeightKg: fc.option(fc.integer({ min: 0, max: 50000 }), { nil: undefined }),
  cargoDescription: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  cargoDimensions: fc.option(
    fc.record({
      lengthM: fc.integer({ min: 0, max: 20 }),
      widthM: fc.integer({ min: 0, max: 5 }),
      heightM: fc.integer({ min: 0, max: 5 }),
    }),
    { nil: undefined }
  ),
  status: fc.constantFrom('empty', 'stuffing', 'full', 'shipped', 'delivered') as fc.Arbitrary<'empty' | 'stuffing' | 'full' | 'shipped' | 'delivered'>,
  currentLocation: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  createdAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
});

const bookingAmendmentArb: fc.Arbitrary<BookingAmendment> = fc.record({
  id: fc.uuid(),
  bookingId: fc.uuid(),
  amendmentNumber: fc.nat({ max: 100 }).map(n => n + 1),
  amendmentType: fc.constantFrom('schedule_change', 'quantity_change', 'vessel_change', 'rate_change', 'consignee_change', 'other') as fc.Arbitrary<'schedule_change' | 'quantity_change' | 'vessel_change' | 'rate_change' | 'consignee_change' | 'other'>,
  description: fc.string({ minLength: 1, maxLength: 500 }),
  oldValues: fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
  newValues: fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
  status: fc.constantFrom('requested', 'approved', 'rejected') as fc.Arbitrary<'requested' | 'approved' | 'rejected'>,
  requestedBy: fc.option(fc.uuid(), { nil: undefined }),
  requestedAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
  approvedBy: fc.option(fc.uuid(), { nil: undefined }),
  approvedAt: fc.option(fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()), { nil: undefined }),
  notes: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
});

// =====================================================
// PROPERTY 2: STATUS TRANSITION VALIDATION
// Feature: agency-booking-management, Property 2: Status Transition Validation
// Validates: Requirements 4.6
// =====================================================

describe('Property 2: Status Transition Validation', () => {
  // Valid transitions map
  const validTransitions: Record<BookingStatus, BookingStatus[]> = {
    draft: ['requested', 'cancelled'],
    requested: ['confirmed', 'cancelled'],
    confirmed: ['amended', 'shipped', 'cancelled'],
    amended: ['shipped', 'cancelled'],
    cancelled: [],
    shipped: ['completed'],
    completed: [],
  };

  it('should allow only valid status transitions', () => {
    fc.assert(
      fc.property(bookingStatusArb, bookingStatusArb, (from, to) => {
        const isValid = isValidStatusTransition(from, to);
        const expectedValid = validTransitions[from].includes(to);
        
        expect(isValid).toBe(expectedValid);
      }),
      { numRuns: 100 }
    );
  });

  it('should return correct next valid statuses for any status', () => {
    fc.assert(
      fc.property(bookingStatusArb, (status) => {
        const nextStatuses = getNextValidStatuses(status);
        const expectedStatuses = validTransitions[status];
        
        expect(nextStatuses).toEqual(expectedStatuses);
      }),
      { numRuns: 100 }
    );
  });

  it('should not allow transitions from terminal states', () => {
    fc.assert(
      fc.property(bookingStatusArb, (to) => {
        // Terminal states: cancelled, completed
        expect(isValidStatusTransition('cancelled', to)).toBe(false);
        expect(isValidStatusTransition('completed', to)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should allow cancellation from non-terminal, non-shipped states', () => {
    const cancellableStatuses: BookingStatus[] = ['draft', 'requested', 'confirmed', 'amended'];
    
    fc.assert(
      fc.property(fc.constantFrom(...cancellableStatuses), (from) => {
        expect(isValidStatusTransition(from, 'cancelled')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 3: CONTAINER TOTAL CALCULATIONS
// Feature: agency-booking-management, Property 3: Container Total Calculations
// Validates: Requirements 2.3, 2.4
// =====================================================

describe('Property 3: Container Total Calculations', () => {
  it('should calculate total weight as sum of individual weights', () => {
    fc.assert(
      fc.property(fc.array(bookingContainerArb, { minLength: 0, maxLength: 20 }), (containers) => {
        const totalWeight = calculateTotalWeight(containers);
        const expectedWeight = containers.reduce((sum, c) => sum + (c.grossWeightKg || 0), 0);
        
        expect(totalWeight).toBeCloseTo(expectedWeight, 5);
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate total count as number of containers', () => {
    fc.assert(
      fc.property(fc.array(bookingContainerArb, { minLength: 0, maxLength: 20 }), (containers) => {
        const totalCount = calculateTotalContainers(containers);
        
        expect(totalCount).toBe(containers.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should return zero weight for empty container list', () => {
    expect(calculateTotalWeight([])).toBe(0);
  });

  it('should return zero count for empty container list', () => {
    expect(calculateTotalContainers([])).toBe(0);
  });

  it('should handle containers with undefined weights', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ...bookingContainerArb.generator,
            grossWeightKg: fc.constant(undefined),
          } as unknown as fc.RecordConstraints<BookingContainer>),
          { minLength: 1, maxLength: 10 }
        ),
        (containers) => {
          const totalWeight = calculateTotalWeight(containers as BookingContainer[]);
          expect(totalWeight).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 5: CUTOFF WARNING LEVELS
// Feature: agency-booking-management, Property 5: Cutoff Warning Levels
// Validates: Requirements 7.3, 7.4
// =====================================================

describe('Property 5: Cutoff Warning Levels', () => {
  it('should return alert for past dates', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 365 }), (daysAgo) => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - daysAgo);
        const dateStr = pastDate.toISOString().split('T')[0];
        
        expect(getCutoffWarningLevel(dateStr)).toBe('alert');
      }),
      { numRuns: 100 }
    );
  });

  it('should return warning for dates within 3 days', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3 }), (daysAhead) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        const dateStr = futureDate.toISOString().split('T')[0];
        
        expect(getCutoffWarningLevel(dateStr)).toBe('warning');
      }),
      { numRuns: 100 }
    );
  });

  it('should return none for dates more than 3 days away', () => {
    fc.assert(
      fc.property(fc.integer({ min: 4, max: 365 }), (daysAhead) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);
        const dateStr = futureDate.toISOString().split('T')[0];
        
        expect(getCutoffWarningLevel(dateStr)).toBe('none');
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate correct days until cutoff', () => {
    fc.assert(
      fc.property(fc.integer({ min: -30, max: 30 }), (daysDiff) => {
        const targetDate = new Date();
        targetDate.setHours(0, 0, 0, 0);
        targetDate.setDate(targetDate.getDate() + daysDiff);
        const dateStr = targetDate.toISOString().split('T')[0];
        
        const daysUntil = getDaysUntilCutoff(dateStr);
        
        // Allow for timezone edge cases
        expect(Math.abs(daysUntil - daysDiff)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 6: BOOKING SUBMISSION VALIDATION
// Feature: agency-booking-management, Property 6: Booking Submission Validation
// Validates: Requirements 1.5, 1.7, 2.5, 6.5, 8.1, 8.4
// =====================================================

describe('Property 6: Booking Submission Validation', () => {
  it('should fail validation when cargo description is empty', () => {
    fc.assert(
      fc.property(
        fc.record({
          shippingLineId: fc.uuid(),
          originPortId: fc.uuid(),
          destinationPortId: fc.uuid(),
          cargoDescription: fc.constantFrom('', '   ', undefined as unknown as string),
          commodityType: commodityTypeArb,
          shipperName: fc.string({ minLength: 1 }),
          consigneeName: fc.string({ minLength: 1 }),
        }),
        (booking) => {
          const result = validateBookingForSubmission(booking);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'cargoDescription')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail validation when shipper name is missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          shippingLineId: fc.uuid(),
          originPortId: fc.uuid(),
          destinationPortId: fc.uuid(),
          cargoDescription: fc.string({ minLength: 1 }),
          commodityType: commodityTypeArb,
          shipperName: fc.constantFrom('', '   ', undefined as unknown as string),
          consigneeName: fc.string({ minLength: 1 }),
        }),
        (booking) => {
          const result = validateBookingForSubmission(booking);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'shipperName')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail validation when consignee name is missing', () => {
    fc.assert(
      fc.property(
        fc.record({
          shippingLineId: fc.uuid(),
          originPortId: fc.uuid(),
          destinationPortId: fc.uuid(),
          cargoDescription: fc.string({ minLength: 1 }),
          commodityType: commodityTypeArb,
          shipperName: fc.string({ minLength: 1 }),
          consigneeName: fc.constantFrom('', '   ', undefined as unknown as string),
        }),
        (booking) => {
          const result = validateBookingForSubmission(booking);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'consigneeName')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should require dangerous goods details for dangerous commodity type', () => {
    fc.assert(
      fc.property(
        fc.record({
          shippingLineId: fc.uuid(),
          originPortId: fc.uuid(),
          destinationPortId: fc.uuid(),
          cargoDescription: fc.string({ minLength: 1 }),
          commodityType: fc.constant('dangerous' as CommodityType),
          shipperName: fc.string({ minLength: 1 }),
          consigneeName: fc.string({ minLength: 1 }),
          dangerousGoods: fc.constant(undefined),
        }),
        (booking) => {
          const result = validateBookingForSubmission(booking);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'dangerousGoods')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not require dangerous goods details for non-dangerous commodity types', () => {
    const nonDangerousTypes: CommodityType[] = ['general', 'reefer', 'oversized', 'project'];
    
    fc.assert(
      fc.property(
        fc.record({
          shippingLineId: fc.uuid(),
          originPortId: fc.uuid(),
          destinationPortId: fc.uuid(),
          cargoDescription: fc.string({ minLength: 1 }),
          commodityType: fc.constantFrom(...nonDangerousTypes),
          shipperName: fc.string({ minLength: 1 }),
          consigneeName: fc.string({ minLength: 1 }),
        }),
        (booking) => {
          const result = validateBookingForSubmission(booking);
          
          // Should not have dangerous goods error
          expect(result.errors.some(e => e.field === 'dangerousGoods')).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should pass validation for complete valid booking', () => {
    // Use alphanumeric strings to avoid whitespace-only values
    const nonEmptyStringArb = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,99}$/);
    
    fc.assert(
      fc.property(
        fc.record({
          shippingLineId: fc.uuid(),
          originPortId: fc.uuid(),
          destinationPortId: fc.uuid(),
          cargoDescription: nonEmptyStringArb,
          commodityType: fc.constantFrom('general', 'reefer', 'oversized', 'project') as fc.Arbitrary<CommodityType>,
          shipperName: nonEmptyStringArb,
          consigneeName: nonEmptyStringArb,
        }),
        (booking) => {
          const result = validateBookingForSubmission(booking);
          
          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 7: AMENDMENT CHANGE TRACKING
// Feature: agency-booking-management, Property 7: Amendment Change Tracking
// Validates: Requirements 5.4, 5.5, 5.6, 5.7
// =====================================================

describe('Property 7: Amendment Change Tracking', () => {
  it('should generate sequential amendment numbers', () => {
    fc.assert(
      fc.property(
        fc.array(bookingAmendmentArb, { minLength: 0, maxLength: 20 }),
        (amendments) => {
          const nextNumber = getNextAmendmentNumber(amendments);
          
          if (amendments.length === 0) {
            expect(nextNumber).toBe(1);
          } else {
            const maxNumber = Math.max(...amendments.map(a => a.amendmentNumber));
            expect(nextNumber).toBe(maxNumber + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify changed fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          field1: fc.string(),
          field2: fc.integer(),
          field3: fc.boolean(),
        }),
        fc.record({
          field1: fc.string(),
          field2: fc.integer(),
          field3: fc.boolean(),
        }),
        (oldValues, newValues) => {
          const changedFields = extractChangedFields(oldValues, newValues);
          
          // Verify each identified field actually changed
          for (const field of changedFields) {
            expect(JSON.stringify(oldValues[field as keyof typeof oldValues]))
              .not.toBe(JSON.stringify(newValues[field as keyof typeof newValues]));
          }
          
          // Verify unchanged fields are not in the list
          for (const field of Object.keys(newValues)) {
            if (JSON.stringify(oldValues[field as keyof typeof oldValues]) === 
                JSON.stringify(newValues[field as keyof typeof newValues])) {
              expect(changedFields).not.toContain(field);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty array when no fields changed', () => {
    fc.assert(
      fc.property(
        fc.record({
          field1: fc.string(),
          field2: fc.integer(),
        }),
        (values) => {
          const changedFields = extractChangedFields(values, { ...values });
          
          expect(changedFields).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 4: FREIGHT CALCULATION ACCURACY
// Feature: agency-booking-management, Property 4: Freight Calculation Accuracy
// Validates: Requirements 3.3, 3.4
// =====================================================

describe('Property 4: Freight Calculation Accuracy', () => {
  it('should calculate total freight as sum of container rates', () => {
    fc.assert(
      fc.property(
        fc.array(bookingContainerArb, { minLength: 1, maxLength: 10 }),
        fc.float({ min: 100, max: 10000, noNaN: true }),
        (containers, baseRate) => {
          // Create a rate map with same rate for all container types
          const rates = new Map<ContainerType, number>();
          for (const type of CONTAINER_TYPES) {
            rates.set(type, baseRate);
          }
          
          const total = calculateFreightTotal(containers, rates);
          const expectedTotal = containers.length * baseRate;
          
          expect(total).toBeCloseTo(expectedTotal, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return zero for empty container list', () => {
    const rates = new Map<ContainerType, number>();
    rates.set('20GP', 1000);
    
    expect(calculateFreightTotal([], rates)).toBe(0);
  });

  it('should handle missing rates gracefully', () => {
    fc.assert(
      fc.property(
        fc.array(bookingContainerArb, { minLength: 1, maxLength: 5 }),
        (containers) => {
          // Empty rate map
          const rates = new Map<ContainerType, number>();
          
          const total = calculateFreightTotal(containers, rates);
          
          expect(total).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 8: BOOKING FILTER ACCURACY
// Feature: agency-booking-management, Property 8: Booking Filter Accuracy
// Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6
// =====================================================

describe('Property 8: Booking Filter Accuracy', () => {
  // Define date generator inside the describe block
  const testDateArb = fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts));
  
  const freightBookingArb: fc.Arbitrary<FreightBooking> = fc.record({
    id: fc.uuid(),
    bookingNumber: fc.integer({ min: 1, max: 99999 }).map(n => `BKG-2025-${n.toString().padStart(5, '0')}`),
    shippingLineId: fc.uuid(),
    originPortId: fc.uuid(),
    destinationPortId: fc.uuid(),
    cargoDescription: fc.string({ minLength: 1, maxLength: 200 }),
    commodityType: commodityTypeArb,
    freightTerms: fc.constantFrom('prepaid', 'collect') as fc.Arbitrary<'prepaid' | 'collect'>,
    freightCurrency: fc.constant('USD'),
    status: bookingStatusArb,
    createdAt: testDateArb.map(d => d.toISOString()),
    updatedAt: testDateArb.map(d => d.toISOString()),
    etd: fc.option(testDateArb.map(d => d.toISOString().split('T')[0]), { nil: undefined }),
    customerId: fc.option(fc.uuid(), { nil: undefined }),
    customer: fc.option(fc.record({ id: fc.uuid(), name: fc.string({ minLength: 1 }) }), { nil: undefined }),
  }) as fc.Arbitrary<FreightBooking>;

  it('should filter by status correctly', () => {
    fc.assert(
      fc.property(
        fc.array(freightBookingArb, { minLength: 1, maxLength: 20 }),
        bookingStatusArb,
        (bookings, targetStatus) => {
          const filtered = filterBookings(bookings, { status: targetStatus, includeInactive: true });
          
          // All filtered bookings should have the target status
          for (const booking of filtered) {
            expect(booking.status).toBe(targetStatus);
          }
          
          // Count should match
          const expectedCount = bookings.filter(b => b.status === targetStatus).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should filter by shipping line correctly', () => {
    fc.assert(
      fc.property(
        fc.array(freightBookingArb, { minLength: 1, maxLength: 20 }),
        fc.uuid(),
        (bookings, targetShippingLineId) => {
          const filtered = filterBookings(bookings, { shippingLineId: targetShippingLineId, includeInactive: true });
          
          // All filtered bookings should have the target shipping line
          for (const booking of filtered) {
            expect(booking.shippingLineId).toBe(targetShippingLineId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude cancelled and completed by default', () => {
    fc.assert(
      fc.property(
        fc.array(freightBookingArb, { minLength: 1, maxLength: 20 }),
        (bookings) => {
          const filtered = filterBookings(bookings, {});
          
          // No cancelled or completed bookings
          for (const booking of filtered) {
            expect(booking.status).not.toBe('cancelled');
            expect(booking.status).not.toBe('completed');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include cancelled and completed when includeInactive is true', () => {
    fc.assert(
      fc.property(
        fc.array(freightBookingArb, { minLength: 1, maxLength: 20 }),
        (bookings) => {
          const filtered = filterBookings(bookings, { includeInactive: true });
          
          // Should include all bookings
          expect(filtered.length).toBe(bookings.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should filter by search term in booking number', () => {
    fc.assert(
      fc.property(
        fc.array(freightBookingArb, { minLength: 1, maxLength: 20 }),
        (bookings) => {
          if (bookings.length === 0) return;
          
          // Pick a random booking and search for part of its number
          const targetBooking = bookings[0];
          const searchTerm = targetBooking.bookingNumber.slice(0, 8);
          
          const filtered = filterBookings(bookings, { search: searchTerm, includeInactive: true });
          
          // Target booking should be in results
          expect(filtered.some(b => b.bookingNumber === targetBooking.bookingNumber)).toBe(true);
          
          // All results should contain the search term
          for (const booking of filtered) {
            expect(booking.bookingNumber.toLowerCase()).toContain(searchTerm.toLowerCase());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 1: BOOKING NUMBER FORMAT VALIDATION
// Feature: agency-booking-management, Property 1: Booking Number Format Validation
// Validates: Requirements 1.1
// =====================================================

describe('Property 1: Booking Number Format Validation', () => {
  it('should validate correct booking number format', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 0, max: 99999 }),
        (year, sequence) => {
          const bookingNumber = `BKG-${year}-${sequence.toString().padStart(5, '0')}`;
          
          expect(isValidBookingNumberFormat(bookingNumber)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid booking number formats', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('BKG-202-00001'), // Year too short
          fc.constant('BKG-2025-0001'), // Sequence too short
          fc.constant('BKG-2025-000001'), // Sequence too long
          fc.constant('BK-2025-00001'), // Wrong prefix
          fc.constant('BKG2025-00001'), // Missing dash
          fc.string({ minLength: 1, maxLength: 20 }), // Random string
        ),
        (invalidNumber) => {
          // Skip if it accidentally matches the valid format
          if (/^BKG-\d{4}-\d{5}$/.test(invalidNumber)) return;
          
          expect(isValidBookingNumberFormat(invalidNumber)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// CONTAINER VALIDATION TESTS
// =====================================================

describe('Container Validation', () => {
  it('should require container type', () => {
    fc.assert(
      fc.property(
        fc.record({
          containerNumber: fc.option(fc.string(), { nil: undefined }),
          grossWeightKg: fc.option(fc.float({ min: 0, max: 50000, noNaN: true }), { nil: undefined }),
        }),
        (container) => {
          const result = validateContainerData(container);
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'containerType')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept valid container types', () => {
    fc.assert(
      fc.property(containerTypeArb, (containerType) => {
        const result = validateContainerData({ containerType });
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject negative weights', () => {
    fc.assert(
      fc.property(
        containerTypeArb,
        fc.integer({ min: -10000, max: -1 }),
        (containerType, negativeWeight) => {
          const result = validateContainerData({
            containerType,
            grossWeightKg: negativeWeight,
          });
          
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'grossWeightKg')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
