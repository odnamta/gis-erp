/**
 * Property-based tests for agency-utils.ts
 * Feature: v0.71-agency-shipping-line-agent-management
 * 
 * Tests Properties 1, 3, and 11 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateShippingLineCode,
  generateAgentCode,
  generateProviderCode,
  isValidServiceType,
  isValidPortAgentService,
  isValidProviderType,
  isValidPortType,
  isValidContainerType,
  isValidShippingTerms,
  validateShippingLine,
  validatePortAgent,
  validateServiceProvider,
  validateShippingRate,
  calculateShippingLineStats,
  calculatePortAgentStats,
} from '@/lib/agency-utils';
import {
  SERVICE_TYPES,
  PORT_AGENT_SERVICES,
  PROVIDER_TYPES,
  PORT_TYPES,
  CONTAINER_TYPES,
  SHIPPING_TERMS,
  ShippingLine,
  PortAgent,
  ShippingLineFormData,
  PortAgentFormData,
  ServiceProviderFormData,
  ShippingRateFormData,
} from '@/types/agency';

// =====================================================
// GENERATORS
// =====================================================

const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

const shippingLineNameArb = fc.array(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz '.split('')),
  { minLength: 3, maxLength: 50 }
).map(chars => chars.join('')).filter(s => s.trim().length >= 3);

const portCodeArb = fc.array(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  { minLength: 5, maxLength: 5 }
).map(chars => chars.join(''));

const providerTypeArb = fc.constantFrom(...PROVIDER_TYPES);

const serviceTypeArb = fc.constantFrom(...SERVICE_TYPES);
const portAgentServiceArb = fc.constantFrom(...PORT_AGENT_SERVICES);
const containerTypeArb = fc.constantFrom(...CONTAINER_TYPES);
const shippingTermsArb = fc.constantFrom(...SHIPPING_TERMS);
const portTypeArb = fc.constantFrom(...PORT_TYPES);

const invalidEnumValueArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => 
    !SERVICE_TYPES.includes(s as any) &&
    !PORT_AGENT_SERVICES.includes(s as any) &&
    !PROVIDER_TYPES.includes(s as any) &&
    !PORT_TYPES.includes(s as any) &&
    !CONTAINER_TYPES.includes(s as any) &&
    !SHIPPING_TERMS.includes(s as any)
  );

const ratingArb = fc.double({ min: 1, max: 5, noNaN: true });
const invalidRatingArb = fc.oneof(
  fc.double({ min: -100, max: 0.99, noNaN: true }),
  fc.double({ min: 5.01, max: 100, noNaN: true })
);

const creditLimitArb = fc.double({ min: 0, max: 10000000, noNaN: true });

// Helper to create optional values without fc.option
const optionalString = fc.oneof(fc.constant(undefined), fc.string({ maxLength: 50 }));
const optionalNumber = (min: number, max: number) => fc.oneof(
  fc.constant(undefined),
  fc.double({ min, max, noNaN: true })
);
const optionalInteger = (min: number, max: number) => fc.oneof(
  fc.constant(undefined),
  fc.integer({ min, max })
);
const optionalRating = fc.oneof(fc.constant(undefined), ratingArb);

// Fixed ISO date string generator
const isoDateString = fc.constant(new Date().toISOString());

const shippingLineArb: fc.Arbitrary<ShippingLine> = fc.record({
  id: fc.uuid(),
  lineCode: fc.string({ minLength: 3, maxLength: 10 }),
  lineName: shippingLineNameArb,
  headOfficeAddress: optionalString,
  headOfficeCountry: optionalString,
  website: optionalString,
  bookingPortalUrl: optionalString,
  trackingUrl: optionalString,
  localAgentName: optionalString,
  localAgentAddress: optionalString,
  localAgentPhone: optionalString,
  localAgentEmail: optionalString,
  contacts: fc.array(fc.record({
    name: fc.string({ maxLength: 30 }),
    role: fc.string({ maxLength: 30 }),
    phone: optionalString,
    email: optionalString,
    notes: optionalString,
  }), { maxLength: 5 }),
  servicesOffered: fc.array(serviceTypeArb, { maxLength: 5 }),
  routesServed: fc.array(fc.record({
    originPort: fc.string({ maxLength: 20 }),
    destinationPort: fc.string({ maxLength: 20 }),
    frequency: optionalString,
    transitDays: optionalInteger(1, 100),
  }), { maxLength: 5 }),
  paymentTerms: optionalString,
  creditLimit: optionalNumber(0, 10000000),
  creditDays: optionalInteger(0, 365),
  serviceRating: optionalRating,
  reliabilityScore: optionalNumber(0, 100),
  isPreferred: fc.boolean(),
  isActive: fc.boolean(),
  notes: optionalString,
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

const optionalUuid = fc.oneof(fc.constant(undefined), fc.uuid());

const portAgentArb: fc.Arbitrary<PortAgent> = fc.record({
  id: fc.uuid(),
  agentCode: fc.string({ minLength: 3, maxLength: 20 }),
  agentName: nonEmptyString,
  portId: optionalUuid,
  portName: nonEmptyString,
  portCountry: nonEmptyString,
  address: optionalString,
  phone: optionalString,
  email: optionalString,
  website: optionalString,
  contacts: fc.array(fc.record({
    name: fc.string({ maxLength: 30 }),
    role: fc.string({ maxLength: 30 }),
    phone: optionalString,
    email: optionalString,
    notes: optionalString,
  }), { maxLength: 5 }),
  services: fc.array(portAgentServiceArb, { maxLength: 7 }),
  customsLicense: optionalString,
  ppjkLicense: optionalString,
  otherLicenses: fc.array(fc.string({ maxLength: 30 }), { maxLength: 3 }),
  paymentTerms: optionalString,
  currency: fc.constantFrom('IDR', 'USD', 'EUR', 'SGD'),
  bankName: optionalString,
  bankAccount: optionalString,
  bankSwift: optionalString,
  serviceRating: optionalRating,
  responseTimeHours: optionalNumber(0, 72),
  ratingCount: optionalInteger(0, 1000),
  isPreferred: fc.boolean(),
  isActive: fc.boolean(),
  notes: optionalString,
  createdAt: isoDateString,
  updatedAt: isoDateString,
});


// =====================================================
// PROPERTY 1: UNIQUE CODE GENERATION
// =====================================================

describe('Property 1: Unique Code Generation', () => {
  /**
   * For any entity creation (shipping line, port agent, or service provider),
   * the generated code SHALL be unique across all existing entities of that type.
   * Validates: Requirements 1.1, 2.1, 3.1
   */

  it('generateShippingLineCode produces unique codes for different names', () => {
    fc.assert(
      fc.property(
        fc.array(shippingLineNameArb, { minLength: 2, maxLength: 20 }),
        (names) => {
          const uniqueNames = [...new Set(names)];
          if (uniqueNames.length < 2) return true; // Skip if not enough unique names
          
          const codes: string[] = [];
          for (const name of uniqueNames) {
            const code = generateShippingLineCode(name, codes);
            expect(codes).not.toContain(code);
            codes.push(code);
          }
          
          // All codes should be unique
          const uniqueCodes = new Set(codes);
          expect(uniqueCodes.size).toBe(codes.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generateShippingLineCode avoids existing codes', () => {
    fc.assert(
      fc.property(
        shippingLineNameArb,
        fc.array(fc.string({ minLength: 3, maxLength: 10 }), { minLength: 0, maxLength: 10 }),
        (name, existingCodes) => {
          const code = generateShippingLineCode(name, existingCodes);
          expect(existingCodes).not.toContain(code);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generateAgentCode produces unique codes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(nonEmptyString, portCodeArb), { minLength: 2, maxLength: 10 }),
        (pairs) => {
          const codes: string[] = [];
          for (const [name, portCode] of pairs) {
            const code = generateAgentCode(name, portCode, codes);
            expect(codes).not.toContain(code);
            codes.push(code);
          }
          
          const uniqueCodes = new Set(codes);
          expect(uniqueCodes.size).toBe(codes.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generateProviderCode produces unique codes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(nonEmptyString, providerTypeArb), { minLength: 2, maxLength: 10 }),
        (pairs) => {
          const codes: string[] = [];
          for (const [name, type] of pairs) {
            const code = generateProviderCode(name, type, codes);
            expect(codes).not.toContain(code);
            codes.push(code);
          }
          
          const uniqueCodes = new Set(codes);
          expect(uniqueCodes.size).toBe(codes.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generated codes have minimum length of 3', () => {
    fc.assert(
      fc.property(shippingLineNameArb, (name) => {
        const code = generateShippingLineCode(name);
        expect(code.length).toBeGreaterThanOrEqual(3);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 3: ENUM VALUE VALIDATION
// =====================================================

describe('Property 3: Enum Value Validation', () => {
  /**
   * For any entity with enum fields, the system SHALL only accept values
   * from the defined valid set and reject any invalid values.
   * Validates: Requirements 1.7, 2.5, 4.4, 5.3, 5.6
   */

  it('isValidServiceType accepts all valid service types', () => {
    fc.assert(
      fc.property(serviceTypeArb, (serviceType) => {
        expect(isValidServiceType(serviceType)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('isValidServiceType rejects invalid values', () => {
    fc.assert(
      fc.property(invalidEnumValueArb, (value) => {
        expect(isValidServiceType(value)).toBe(false);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('isValidPortAgentService accepts all valid services', () => {
    fc.assert(
      fc.property(portAgentServiceArb, (service) => {
        expect(isValidPortAgentService(service)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('isValidPortAgentService rejects invalid values', () => {
    fc.assert(
      fc.property(invalidEnumValueArb, (value) => {
        expect(isValidPortAgentService(value)).toBe(false);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('isValidProviderType accepts all valid types', () => {
    fc.assert(
      fc.property(providerTypeArb, (type) => {
        expect(isValidProviderType(type)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('isValidProviderType rejects invalid values', () => {
    fc.assert(
      fc.property(invalidEnumValueArb, (value) => {
        expect(isValidProviderType(value)).toBe(false);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('isValidPortType accepts all valid types', () => {
    fc.assert(
      fc.property(portTypeArb, (type) => {
        expect(isValidPortType(type)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('isValidContainerType accepts all valid types', () => {
    fc.assert(
      fc.property(containerTypeArb, (type) => {
        expect(isValidContainerType(type)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('isValidShippingTerms accepts all valid terms', () => {
    fc.assert(
      fc.property(shippingTermsArb, (terms) => {
        expect(isValidShippingTerms(terms)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('validateShippingLine rejects invalid service types', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        invalidEnumValueArb,
        (name, invalidService) => {
          const data: ShippingLineFormData = {
            lineName: name,
            servicesOffered: [invalidService as any],
            contacts: [],
            routesServed: [],
            isPreferred: false,
          };
          const result = validateShippingLine(data);
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'servicesOffered')).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validatePortAgent rejects invalid services', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        nonEmptyString,
        invalidEnumValueArb,
        (name, portName, portCountry, invalidService) => {
          const data: PortAgentFormData = {
            agentName: name,
            portName,
            portCountry,
            services: [invalidService as any],
            contacts: [],
            otherLicenses: [],
            currency: 'IDR',
            isPreferred: false,
          };
          const result = validatePortAgent(data);
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'services')).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateServiceProvider rejects invalid provider types', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        invalidEnumValueArb,
        (name, invalidType) => {
          const data: ServiceProviderFormData = {
            providerName: name,
            providerType: invalidType as any,
            country: 'Indonesia',
            contacts: [],
            servicesDetail: [],
            coverageAreas: [],
            documents: [],
            isPreferred: false,
          };
          const result = validateServiceProvider(data);
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'providerType')).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateShippingRate rejects invalid container types', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        invalidEnumValueArb,
        (lineId, originId, destId, invalidType) => {
          const data: ShippingRateFormData = {
            shippingLineId: lineId,
            originPortId: originId,
            destinationPortId: destId,
            containerType: invalidType as any,
            oceanFreight: 1000,
            currency: 'USD',
            validFrom: '2025-01-01',
            validTo: '2025-12-31',
            terms: 'CY-CY',
          };
          const result = validateShippingRate(data);
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'containerType')).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =====================================================
// PROPERTY 11: STATISTICS CALCULATION ACCURACY
// =====================================================

describe('Property 11: Statistics Calculation Accuracy', () => {
  /**
   * For any collection of shipping lines, the calculated statistics SHALL have:
   * - totalLines equal to the count of active shipping lines
   * - preferredCount equal to the count of active shipping lines where is_preferred is true
   * - averageRating equal to the arithmetic mean of service_rating across all active shipping lines with a rating
   * - totalCreditLimit equal to the sum of credit_limit across all active shipping lines
   * Validates: Requirements 10.1, 10.2, 10.3, 10.4
   */

  it('calculateShippingLineStats.totalLines equals count of active lines', () => {
    fc.assert(
      fc.property(
        fc.array(shippingLineArb, { minLength: 0, maxLength: 20 }),
        (lines) => {
          const stats = calculateShippingLineStats(lines);
          const expectedTotal = lines.filter(l => l.isActive).length;
          expect(stats.totalLines).toBe(expectedTotal);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateShippingLineStats.preferredCount equals count of active preferred lines', () => {
    fc.assert(
      fc.property(
        fc.array(shippingLineArb, { minLength: 0, maxLength: 20 }),
        (lines) => {
          const stats = calculateShippingLineStats(lines);
          const expectedPreferred = lines.filter(l => l.isActive && l.isPreferred).length;
          expect(stats.preferredCount).toBe(expectedPreferred);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateShippingLineStats.averageRating equals mean of ratings for active lines with ratings', () => {
    fc.assert(
      fc.property(
        fc.array(shippingLineArb, { minLength: 0, maxLength: 20 }),
        (lines) => {
          const stats = calculateShippingLineStats(lines);
          const activeWithRating = lines.filter(l => l.isActive && l.serviceRating !== undefined && l.serviceRating !== null);
          
          if (activeWithRating.length === 0) {
            expect(stats.averageRating).toBe(0);
          } else {
            const sum = activeWithRating.reduce((acc, l) => acc + (l.serviceRating || 0), 0);
            const expectedAvg = Math.round((sum / activeWithRating.length) * 100) / 100;
            expect(stats.averageRating).toBeCloseTo(expectedAvg, 2);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculateShippingLineStats.totalCreditLimit equals sum of credit limits for active lines', () => {
    fc.assert(
      fc.property(
        fc.array(shippingLineArb, { minLength: 0, maxLength: 20 }),
        (lines) => {
          const stats = calculateShippingLineStats(lines);
          const expectedTotal = lines
            .filter(l => l.isActive)
            .reduce((acc, l) => acc + (l.creditLimit || 0), 0);
          expect(stats.totalCreditLimit).toBeCloseTo(expectedTotal, 2);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculatePortAgentStats.totalAgents equals count of active agents', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const stats = calculatePortAgentStats(agents);
          const expectedTotal = agents.filter(a => a.isActive).length;
          expect(stats.totalAgents).toBe(expectedTotal);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculatePortAgentStats.preferredCount equals count of active preferred agents', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const stats = calculatePortAgentStats(agents);
          const expectedPreferred = agents.filter(a => a.isActive && a.isPreferred).length;
          expect(stats.preferredCount).toBe(expectedPreferred);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculatePortAgentStats.countriesCount equals unique countries of active agents', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const stats = calculatePortAgentStats(agents);
          const activeAgents = agents.filter(a => a.isActive);
          const uniqueCountries = new Set(activeAgents.map(a => a.portCountry));
          expect(stats.countriesCount).toBe(uniqueCountries.size);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('calculatePortAgentStats.averageRating equals mean of ratings for active agents with ratings', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const stats = calculatePortAgentStats(agents);
          const activeWithRating = agents.filter(a => a.isActive && a.serviceRating !== undefined && a.serviceRating !== null);
          
          if (activeWithRating.length === 0) {
            expect(stats.averageRating).toBe(0);
          } else {
            const sum = activeWithRating.reduce((acc, a) => acc + (a.serviceRating || 0), 0);
            const expectedAvg = Math.round((sum / activeWithRating.length) * 100) / 100;
            expect(stats.averageRating).toBeCloseTo(expectedAvg, 2);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// ADDITIONAL VALIDATION TESTS
// =====================================================

describe('Rating Range Validation (Property 10 support)', () => {
  it('validateShippingLine accepts valid ratings between 1 and 5', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        ratingArb,
        (name, rating) => {
          const data: ShippingLineFormData = {
            lineName: name,
            servicesOffered: [],
            contacts: [],
            routesServed: [],
            isPreferred: false,
            serviceRating: rating,
          };
          const result = validateShippingLine(data);
          expect(result.errors.some(e => e.field === 'serviceRating')).toBe(false);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validateShippingLine rejects ratings outside 1-5 range', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        invalidRatingArb,
        (name, rating) => {
          const data: ShippingLineFormData = {
            lineName: name,
            servicesOffered: [],
            contacts: [],
            routesServed: [],
            isPreferred: false,
            serviceRating: rating,
          };
          const result = validateShippingLine(data);
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'serviceRating')).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('validatePortAgent rejects ratings outside 1-5 range', () => {
    fc.assert(
      fc.property(
        nonEmptyString,
        nonEmptyString,
        nonEmptyString,
        invalidRatingArb,
        (name, portName, portCountry, rating) => {
          const data: PortAgentFormData = {
            agentName: name,
            portName,
            portCountry,
            services: [],
            contacts: [],
            otherLicenses: [],
            currency: 'IDR',
            isPreferred: false,
            serviceRating: rating,
          };
          const result = validatePortAgent(data);
          expect(result.isValid).toBe(false);
          expect(result.errors.some(e => e.field === 'serviceRating')).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
