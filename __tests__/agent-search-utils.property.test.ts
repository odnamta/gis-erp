/**
 * Property-based tests for agent-search-utils.ts
 * Feature: v0.71-agency-shipping-line-agent-management
 * 
 * Tests Properties 2, 6, 7, 8, 12, 13, 14 from the design document
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  filterActiveRates,
  filterActiveAgents,
  sortRatesByTotal,
  sortAgentsByPreferredAndRating,
  filterRatesByRoute,
  filterRatesByContainerType,
  filterRatesByShippingLine,
  filterAgentsByServices,
  groupAgentsByCountry,
  searchShippingRates,
  findBestRate,
  getPortAgents,
} from '@/lib/agent-search-utils';
import { calculateTotalRate } from '@/lib/rate-calculation-utils';
import {
  ShippingRate,
  PortAgent,
  CONTAINER_TYPES,
  SHIPPING_TERMS,
  PORT_AGENT_SERVICES,
  PortAgentService,
  SurchargeItem,
} from '@/types/agency';

// =====================================================
// GENERATORS
// =====================================================

const positiveNumber = fc.double({ min: 0.01, max: 100000, noNaN: true });
const nonNegativeNumber = fc.double({ min: 0, max: 10000, noNaN: true });
const ratingArb = fc.double({ min: 1, max: 5, noNaN: true });

const containerTypeArb = fc.constantFrom(...CONTAINER_TYPES);
const shippingTermsArb = fc.constantFrom(...SHIPPING_TERMS);
const portAgentServiceArb = fc.constantFrom(...PORT_AGENT_SERVICES);

const portCodeArb = fc.array(
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  { minLength: 5, maxLength: 5 }
).map(chars => chars.join(''));

const countryArb = fc.constantFrom('Indonesia', 'Singapore', 'China', 'Japan', 'UAE', 'Netherlands');

// Generate valid date range (current or future)
const validDateRangeArb = fc.tuple(
  fc.integer({ min: -30, max: 30 }),
  fc.integer({ min: 30, max: 365 })
).map(([startOffset, duration]) => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + startOffset);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);
  return {
    validFrom: startDate.toISOString().split('T')[0],
    validTo: endDate.toISOString().split('T')[0],
  };
});

// Generate expired date range
const expiredDateRangeArb = fc.constant({
  validFrom: '2020-01-01',
  validTo: '2020-12-31',
});

const shippingRateArb: fc.Arbitrary<ShippingRate> = fc.record({
  id: fc.uuid(),
  shippingLineId: fc.uuid(),
  originPortId: fc.uuid(),
  destinationPortId: fc.uuid(),
  containerType: containerTypeArb,
  oceanFreight: positiveNumber,
  currency: fc.constantFrom('USD', 'EUR'),
  baf: nonNegativeNumber,
  caf: nonNegativeNumber,
  pss: nonNegativeNumber,
  ens: nonNegativeNumber,
  otherSurcharges: fc.constant([] as SurchargeItem[]),
  totalRate: positiveNumber,
  transitDays: fc.integer({ min: 1, max: 60 }),
  frequency: fc.constantFrom('weekly', 'bi-weekly'),
  validFrom: fc.constant('2025-01-01'),
  validTo: fc.constant('2025-12-31'),
  terms: shippingTermsArb,
  notes: fc.constant(undefined as string | undefined),
  isActive: fc.boolean(),
  createdAt: fc.constant(new Date().toISOString()),
  originPort: fc.string({ minLength: 3, maxLength: 30 }),
  originCode: portCodeArb,
  destinationPort: fc.string({ minLength: 3, maxLength: 30 }),
  destinationCode: portCodeArb,
});

// Use constant date strings to avoid invalid date issues
const portAgentArb: fc.Arbitrary<PortAgent> = fc.record({
  id: fc.uuid(),
  agentCode: fc.string({ minLength: 3, maxLength: 20 }),
  agentName: fc.string({ minLength: 1, maxLength: 50 }),
  portId: fc.option(fc.uuid(), { nil: undefined }),
  portName: fc.string({ minLength: 3, maxLength: 50 }),
  portCountry: countryArb,
  address: fc.option(fc.string(), { nil: undefined }),
  phone: fc.option(fc.string(), { nil: undefined }),
  email: fc.option(fc.string(), { nil: undefined }),
  website: fc.option(fc.string(), { nil: undefined }),
  contacts: fc.constant([]),
  services: fc.array(portAgentServiceArb, { minLength: 0, maxLength: 7 }),
  customsLicense: fc.option(fc.string(), { nil: undefined }),
  ppjkLicense: fc.option(fc.string(), { nil: undefined }),
  otherLicenses: fc.constant([]),
  paymentTerms: fc.option(fc.string(), { nil: undefined }),
  currency: fc.constantFrom('IDR', 'USD'),
  bankName: fc.option(fc.string(), { nil: undefined }),
  bankAccount: fc.option(fc.string(), { nil: undefined }),
  bankSwift: fc.option(fc.string(), { nil: undefined }),
  serviceRating: fc.option(ratingArb, { nil: undefined }),
  responseTimeHours: fc.option(fc.double({ min: 0, max: 72, noNaN: true }), { nil: undefined }),
  ratingCount: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
  isPreferred: fc.boolean(),
  isActive: fc.boolean(),
  notes: fc.option(fc.string(), { nil: undefined }),
  createdAt: fc.constant(new Date().toISOString()),
  updatedAt: fc.constant(new Date().toISOString()),
});


// =====================================================
// PROPERTY 2: ACTIVE RECORD FILTERING
// =====================================================

describe('Property 2: Active Record Filtering', () => {
  /**
   * For any query for active records, the result SHALL exclude all records
   * where is_active is false, and for shipping rates, SHALL also exclude
   * records where the current date is outside the valid_from to valid_to range.
   * Validates: Requirements 1.5, 5.2, 5.7
   */

  it('filterActiveRates excludes inactive rates', () => {
    fc.assert(
      fc.property(
        fc.array(shippingRateArb, { minLength: 0, maxLength: 20 }),
        (rates) => {
          const result = filterActiveRates(rates);
          expect(result.every(r => r.isActive)).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterActiveRates excludes expired rates', () => {
    const expiredRate: ShippingRate = {
      id: 'expired-id',
      shippingLineId: 'line-id',
      originPortId: 'origin-id',
      destinationPortId: 'dest-id',
      containerType: '20GP',
      oceanFreight: 1000,
      currency: 'USD',
      baf: 0,
      caf: 0,
      pss: 0,
      ens: 0,
      otherSurcharges: [],
      totalRate: 1000,
      validFrom: '2020-01-01',
      validTo: '2020-12-31',
      terms: 'CY-CY',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    
    const result = filterActiveRates([expiredRate]);
    expect(result).toHaveLength(0);
  });

  it('filterActiveAgents excludes inactive agents', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const result = filterActiveAgents(agents);
          expect(result.every(a => a.isActive)).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterActiveAgents preserves all active agents', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const result = filterActiveAgents(agents);
          const expectedCount = agents.filter(a => a.isActive).length;
          expect(result.length).toBe(expectedCount);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 6: RATE SEARCH ORDERING
// =====================================================

describe('Property 6: Rate Search Ordering', () => {
  /**
   * For any rate search result set, the rates SHALL be ordered by
   * total_rate in ascending order (lowest rate first).
   * Validates: Requirements 6.4
   */

  it('sortRatesByTotal orders rates by total_rate ascending', () => {
    fc.assert(
      fc.property(
        fc.array(shippingRateArb, { minLength: 0, maxLength: 20 }),
        (rates) => {
          const sorted = sortRatesByTotal(rates);
          
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].totalRate).toBeGreaterThanOrEqual(sorted[i - 1].totalRate);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortRatesByTotal preserves all rates', () => {
    fc.assert(
      fc.property(
        fc.array(shippingRateArb, { minLength: 0, maxLength: 20 }),
        (rates) => {
          const sorted = sortRatesByTotal(rates);
          expect(sorted.length).toBe(rates.length);
          
          // All original rates should be in sorted result
          const sortedIds = new Set(sorted.map(r => r.id));
          expect(rates.every(r => sortedIds.has(r.id))).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortRatesByTotal does not mutate original array', () => {
    fc.assert(
      fc.property(
        fc.array(shippingRateArb, { minLength: 2, maxLength: 10 }),
        (rates) => {
          const originalOrder = rates.map(r => r.id);
          sortRatesByTotal(rates);
          const afterOrder = rates.map(r => r.id);
          expect(afterOrder).toEqual(originalOrder);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 7: AGENT SEARCH ORDERING
// =====================================================

describe('Property 7: Agent Search Ordering', () => {
  /**
   * For any agent search result set, the agents SHALL be ordered by
   * is_preferred (true first) then by service_rating (highest first).
   * Validates: Requirements 7.2
   */

  it('sortAgentsByPreferredAndRating puts preferred agents first', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const sorted = sortAgentsByPreferredAndRating(agents);
          
          // Find first non-preferred agent
          const firstNonPreferredIndex = sorted.findIndex(a => !a.isPreferred);
          
          if (firstNonPreferredIndex > 0) {
            // All agents before should be preferred
            for (let i = 0; i < firstNonPreferredIndex; i++) {
              expect(sorted[i].isPreferred).toBe(true);
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortAgentsByPreferredAndRating orders by rating within same preferred status', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const sorted = sortAgentsByPreferredAndRating(agents);
          
          // Check preferred agents are sorted by rating
          const preferred = sorted.filter(a => a.isPreferred);
          for (let i = 1; i < preferred.length; i++) {
            const prevRating = preferred[i - 1].serviceRating ?? 0;
            const currRating = preferred[i].serviceRating ?? 0;
            expect(currRating).toBeLessThanOrEqual(prevRating);
          }
          
          // Check non-preferred agents are sorted by rating
          const nonPreferred = sorted.filter(a => !a.isPreferred);
          for (let i = 1; i < nonPreferred.length; i++) {
            const prevRating = nonPreferred[i - 1].serviceRating ?? 0;
            const currRating = nonPreferred[i].serviceRating ?? 0;
            expect(currRating).toBeLessThanOrEqual(prevRating);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sortAgentsByPreferredAndRating preserves all agents', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const sorted = sortAgentsByPreferredAndRating(agents);
          expect(sorted.length).toBe(agents.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =====================================================
// PROPERTY 8: BEST RATE SELECTION
// =====================================================

describe('Property 8: Best Rate Selection', () => {
  /**
   * For any call to findBestRate with valid parameters, the returned rate
   * SHALL be the one with the lowest total_rate among all active rates
   * matching the route and container type, and alternatives SHALL contain
   * up to 3 additional rates in ascending order of total_rate.
   * Validates: Requirements 6.6
   */

  it('findBestRate returns lowest rate as best rate', () => {
    // Create rates with known values
    const rates: ShippingRate[] = [
      createTestRate('rate1', 'ORIGIN', 'DEST', '20GP', 3000, true),
      createTestRate('rate2', 'ORIGIN', 'DEST', '20GP', 1000, true),
      createTestRate('rate3', 'ORIGIN', 'DEST', '20GP', 2000, true),
      createTestRate('rate4', 'ORIGIN', 'DEST', '20GP', 1500, true),
    ];
    
    const result = findBestRate(rates, 'ORIGIN', 'DEST', '20GP');
    
    expect(result).not.toBeNull();
    expect(result!.rate.totalRate).toBe(1000);
  });

  it('findBestRate returns up to 3 alternatives', () => {
    const rates: ShippingRate[] = [
      createTestRate('rate1', 'ORIGIN', 'DEST', '20GP', 1000, true),
      createTestRate('rate2', 'ORIGIN', 'DEST', '20GP', 2000, true),
      createTestRate('rate3', 'ORIGIN', 'DEST', '20GP', 3000, true),
      createTestRate('rate4', 'ORIGIN', 'DEST', '20GP', 4000, true),
      createTestRate('rate5', 'ORIGIN', 'DEST', '20GP', 5000, true),
    ];
    
    const result = findBestRate(rates, 'ORIGIN', 'DEST', '20GP');
    
    expect(result).not.toBeNull();
    expect(result!.alternatives.length).toBe(3);
    expect(result!.alternatives[0].totalRate).toBe(2000);
    expect(result!.alternatives[1].totalRate).toBe(3000);
    expect(result!.alternatives[2].totalRate).toBe(4000);
  });

  it('findBestRate returns null when no matching rates', () => {
    const rates: ShippingRate[] = [
      createTestRate('rate1', 'OTHER', 'DEST', '20GP', 1000, true),
    ];
    
    const result = findBestRate(rates, 'ORIGIN', 'DEST', '20GP');
    expect(result).toBeNull();
  });

  it('findBestRate alternatives are in ascending order', () => {
    const rates: ShippingRate[] = [
      createTestRate('rate1', 'ORIGIN', 'DEST', '20GP', 5000, true),
      createTestRate('rate2', 'ORIGIN', 'DEST', '20GP', 1000, true),
      createTestRate('rate3', 'ORIGIN', 'DEST', '20GP', 3000, true),
      createTestRate('rate4', 'ORIGIN', 'DEST', '20GP', 2000, true),
    ];
    
    const result = findBestRate(rates, 'ORIGIN', 'DEST', '20GP');
    
    expect(result).not.toBeNull();
    for (let i = 1; i < result!.alternatives.length; i++) {
      expect(result!.alternatives[i].totalRate).toBeGreaterThanOrEqual(
        result!.alternatives[i - 1].totalRate
      );
    }
  });
});

// =====================================================
// PROPERTY 12: FILTER ACCURACY
// =====================================================

describe('Property 12: Filter Accuracy', () => {
  /**
   * For any filter applied to a list, all returned records SHALL match
   * the filter criteria, and no matching records SHALL be excluded.
   * Validates: Requirements 3.2, 6.2, 6.3, 7.4
   */

  it('filterRatesByContainerType returns only matching container types', () => {
    fc.assert(
      fc.property(
        fc.array(shippingRateArb, { minLength: 0, maxLength: 20 }),
        containerTypeArb,
        (rates, containerType) => {
          const filtered = filterRatesByContainerType(rates, containerType);
          expect(filtered.every(r => r.containerType === containerType)).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterRatesByContainerType includes all matching rates', () => {
    fc.assert(
      fc.property(
        fc.array(shippingRateArb, { minLength: 0, maxLength: 20 }),
        containerTypeArb,
        (rates, containerType) => {
          const filtered = filterRatesByContainerType(rates, containerType);
          const expectedCount = rates.filter(r => r.containerType === containerType).length;
          expect(filtered.length).toBe(expectedCount);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterRatesByShippingLine returns only matching shipping lines', () => {
    fc.assert(
      fc.property(
        fc.array(shippingRateArb, { minLength: 0, maxLength: 20 }),
        fc.uuid(),
        (rates, lineId) => {
          const filtered = filterRatesByShippingLine(rates, lineId);
          expect(filtered.every(r => r.shippingLineId === lineId)).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterAgentsByServices returns agents with all specified services', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        fc.array(portAgentServiceArb, { minLength: 1, maxLength: 3 }),
        (agents, services) => {
          const uniqueServices = [...new Set(services)] as PortAgentService[];
          const filtered = filterAgentsByServices(agents, uniqueServices);
          
          expect(filtered.every(agent => 
            uniqueServices.every(service => agent.services.includes(service))
          )).toBe(true);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filterAgentsByServices with empty services returns all agents', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const filtered = filterAgentsByServices(agents, []);
          expect(filtered.length).toBe(agents.length);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 13: PORT AGENT GROUPING BY COUNTRY
// =====================================================

describe('Property 13: Port Agent Grouping by Country', () => {
  /**
   * For any list of port agents grouped by country, each group SHALL
   * contain only agents from that country, and all agents SHALL appear
   * in exactly one group.
   * Validates: Requirements 2.2
   */

  it('groupAgentsByCountry groups agents correctly by country', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const grouped = groupAgentsByCountry(agents);
          
          // Each group should only contain agents from that country
          for (const [country, countryAgents] of grouped) {
            expect(countryAgents.every(a => a.portCountry === country)).toBe(true);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('groupAgentsByCountry includes all agents exactly once', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const grouped = groupAgentsByCountry(agents);
          
          // Total count should match
          let totalCount = 0;
          for (const countryAgents of grouped.values()) {
            totalCount += countryAgents.length;
          }
          expect(totalCount).toBe(agents.length);
          
          // Each agent should appear exactly once
          const allGroupedIds = new Set<string>();
          for (const countryAgents of grouped.values()) {
            for (const agent of countryAgents) {
              expect(allGroupedIds.has(agent.id)).toBe(false);
              allGroupedIds.add(agent.id);
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('groupAgentsByCountry creates correct number of groups', () => {
    fc.assert(
      fc.property(
        fc.array(portAgentArb, { minLength: 0, maxLength: 20 }),
        (agents) => {
          const grouped = groupAgentsByCountry(agents);
          const uniqueCountries = new Set(agents.map(a => a.portCountry));
          expect(grouped.size).toBe(uniqueCountries.size);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// PROPERTY 14: ROUTE SEARCH MATCHING
// =====================================================

describe('Property 14: Route Search Matching', () => {
  /**
   * For any rate search by origin and destination port, all returned rates
   * SHALL have matching origin_port and destination_port.
   * Validates: Requirements 6.1, 7.1
   */

  it('filterRatesByRoute returns only matching routes', () => {
    const rates: ShippingRate[] = [
      createTestRate('rate1', 'IDTPP', 'SGSIN', '20GP', 1000, true),
      createTestRate('rate2', 'IDTPK', 'SGSIN', '20GP', 1200, true),
      createTestRate('rate3', 'IDTPP', 'CNSHA', '20GP', 1500, true),
    ];
    
    const filtered = filterRatesByRoute(rates, 'IDTPP', 'SGSIN');
    
    expect(filtered.length).toBe(1);
    expect(filtered[0].originCode).toBe('IDTPP');
    expect(filtered[0].destinationCode).toBe('SGSIN');
  });

  it('getPortAgents returns only agents at specified port', () => {
    const agents: PortAgent[] = [
      createTestAgent('agent1', 'Tanjung Perak', 'Indonesia', true, 4.5),
      createTestAgent('agent2', 'Tanjung Priok', 'Indonesia', false, 4.0),
      createTestAgent('agent3', 'Tanjung Perak', 'Indonesia', false, 3.5),
    ];
    
    const result = getPortAgents(agents, undefined, 'Tanjung Perak');
    
    expect(result.length).toBe(2);
    expect(result.every(a => a.portName.includes('Tanjung Perak'))).toBe(true);
  });
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function createTestRate(
  id: string,
  originCode: string,
  destCode: string,
  containerType: string,
  totalRate: number,
  isActive: boolean
): ShippingRate {
  return {
    id,
    shippingLineId: 'line-id',
    originPortId: 'origin-id',
    destinationPortId: 'dest-id',
    containerType: containerType as any,
    oceanFreight: totalRate,
    currency: 'USD',
    baf: 0,
    caf: 0,
    pss: 0,
    ens: 0,
    otherSurcharges: [],
    totalRate,
    validFrom: '2025-01-01',
    validTo: '2025-12-31',
    terms: 'CY-CY',
    isActive,
    createdAt: new Date().toISOString(),
    originCode,
    destinationCode: destCode,
    originPort: originCode,
    destinationPort: destCode,
  };
}

function createTestAgent(
  id: string,
  portName: string,
  country: string,
  isPreferred: boolean,
  rating: number
): PortAgent {
  return {
    id,
    agentCode: `AGT-${id}`,
    agentName: `Agent ${id}`,
    portName,
    portCountry: country,
    contacts: [],
    services: ['customs_clearance'],
    otherLicenses: [],
    currency: 'IDR',
    serviceRating: rating,
    isPreferred,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
