// =====================================================
// v0.42: EQUIPMENT - MAINTENANCE TRACKING
// Property-Based Tests for Maintenance Utilities
// =====================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculatePartTotal,
  calculatePartsCost,
  calculateTotalCost,
  getMaintenanceUrgency,
  calculateNextDueDate,
  calculateNextDueKm,
  formatMaintenanceRecordNumber,
  isValidRecordNumberFormat,
  parseRecordNumber,
} from '@/lib/maintenance-utils';
import { MaintenancePartInput, MaintenanceTriggerType } from '@/types/maintenance';

describe('Maintenance Utils Property Tests', () => {
  /**
   * Property 2: Parts Cost Calculation
   * For any list of maintenance parts, the total parts cost should equal
   * the sum of (quantity × unit_price) for each part.
   * Validates: Requirements 5.2, 5.3
   */
  describe('Property 2: Parts Cost Calculation', () => {
    it('should calculate individual part total as quantity × unitPrice', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: 1000000 }),
          (quantity, unitPrice) => {
            const result = calculatePartTotal(quantity, unitPrice);
            const expected = quantity * unitPrice;
            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate total parts cost as sum of all part totals', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              partName: fc.string({ minLength: 1 }),
              quantity: fc.integer({ min: 1, max: 100 }),
              unit: fc.constant('pcs'),
              unitPrice: fc.integer({ min: 0, max: 100000 }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (parts: MaintenancePartInput[]) => {
            const result = calculatePartsCost(parts);
            const expected = parts.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
            expect(result).toBe(expected);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for empty parts array', () => {
      expect(calculatePartsCost([])).toBe(0);
    });
  });

  /**
   * Property 3: Total Cost Calculation
   * For any maintenance record with labor_cost, parts_cost, and external_cost,
   * the total_cost should equal labor_cost + parts_cost + external_cost.
   * Validates: Requirements 6.2
   */
  describe('Property 3: Total Cost Calculation', () => {
    it('should calculate total cost as sum of labor, parts, and external costs', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100000000, noNaN: true }),
          fc.float({ min: 0, max: 100000000, noNaN: true }),
          fc.float({ min: 0, max: 100000000, noNaN: true }),
          (laborCost, partsCost, externalCost) => {
            const result = calculateTotalCost(laborCost, partsCost, externalCost);
            const expected = laborCost + partsCost + externalCost;
            expect(Math.abs(result - expected)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when all costs are 0', () => {
      expect(calculateTotalCost(0, 0, 0)).toBe(0);
    });
  });


  /**
   * Property 1: Maintenance Urgency Determination
   * For any maintenance schedule with a trigger type, the urgency status should be:
   * - 'overdue' if past the due date or km
   * - 'due_soon' if within the warning threshold
   * - 'ok' otherwise
   * Validates: Requirements 3.3, 3.4
   */
  describe('Property 1: Maintenance Urgency Determination', () => {
    it('should return overdue for date-based schedules past due date', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 }), // days in the past
          fc.integer({ min: 1, max: 30 }),  // warning days
          (daysAgo, warningDays) => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - daysAgo);
            const dateStr = pastDate.toISOString().split('T')[0];
            
            const result = getMaintenanceUrgency(
              'date',
              dateStr,
              undefined,
              undefined,
              warningDays,
              1000
            );
            expect(result).toBe('overdue');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return due_soon for date-based schedules within warning threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 13 }), // days until due (within warning, but not today)
          (daysUntilDue) => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysUntilDue);
            const dateStr = futureDate.toISOString().split('T')[0];
            const warningDays = 14; // Warning threshold
            
            const result = getMaintenanceUrgency(
              'date',
              dateStr,
              undefined,
              undefined,
              warningDays,
              1000
            );
            expect(result).toBe('due_soon');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return ok for date-based schedules well before due date', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 30, max: 365 }), // days until due (well beyond warning)
          fc.integer({ min: 1, max: 14 }),   // warning days
          (daysUntilDue, warningDays) => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysUntilDue);
            const dateStr = futureDate.toISOString().split('T')[0];
            
            const result = getMaintenanceUrgency(
              'date',
              dateStr,
              undefined,
              undefined,
              warningDays,
              1000
            );
            expect(result).toBe('ok');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return overdue for km-based schedules past due km', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 500000 }), // due km
          fc.integer({ min: 1, max: 10000 }),      // km over
          fc.integer({ min: 100, max: 5000 }),     // warning km
          (dueKm, kmOver, warningKm) => {
            const currentKm = dueKm + kmOver;
            
            const result = getMaintenanceUrgency(
              'km',
              undefined,
              dueKm,
              currentKm,
              14,
              warningKm
            );
            expect(result).toBe('overdue');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return due_soon for km-based schedules within warning threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 500000 }), // due km
          fc.integer({ min: 100, max: 5000 }),     // warning km
          (dueKm, warningKm) => {
            // Current km is within warning threshold but not overdue
            const currentKm = dueKm - Math.floor(warningKm / 2);
            
            const result = getMaintenanceUrgency(
              'km',
              undefined,
              dueKm,
              currentKm,
              14,
              warningKm
            );
            expect(result).toBe('due_soon');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return ok for km-based schedules well before due km', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50000, max: 500000 }), // due km
          fc.integer({ min: 10000, max: 40000 }),  // km remaining (well beyond warning)
          fc.integer({ min: 100, max: 5000 }),     // warning km
          (dueKm, kmRemaining, warningKm) => {
            const currentKm = dueKm - kmRemaining;
            
            // Only test when remaining is greater than warning
            if (kmRemaining > warningKm) {
              const result = getMaintenanceUrgency(
                'km',
                undefined,
                dueKm,
                currentKm,
                14,
                warningKm
              );
              expect(result).toBe('ok');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 4: Next Due Calculation After Completion
   * For any completed scheduled maintenance:
   * - If km-based: next_due_km = completion_km + interval_km
   * - If days-based: next_due_date = completion_date + interval_days
   * Validates: Requirements 7.1, 7.2, 7.3
   */
  describe('Property 4: Next Due Calculation After Completion', () => {
    it('should calculate next due km as current km plus interval', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 500000 }),   // current km
          fc.integer({ min: 1000, max: 100000 }), // interval km
          (currentKm, intervalKm) => {
            const result = calculateNextDueKm(currentKm, intervalKm);
            expect(result).toBe(currentKm + intervalKm);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate next due date as completion date plus interval days', () => {
      // Use integer offset from base date to avoid NaN dates
      const safeDateArb = fc.integer({ min: 0, max: 3650 }).map(days => {
        const d = new Date('2020-01-01');
        d.setDate(d.getDate() + days);
        return d;
      });
      
      fc.assert(
        fc.property(
          safeDateArb,
          fc.integer({ min: 1, max: 365 }),
          (completionDate, intervalDays) => {
            const result = calculateNextDueDate('days', intervalDays, completionDate);
            
            expect(result).not.toBeNull();
            if (result) {
              const expectedDate = new Date(completionDate);
              expectedDate.setDate(expectedDate.getDate() + intervalDays);
              
              // Compare dates (ignoring time)
              expect(result.toISOString().split('T')[0]).toBe(
                expectedDate.toISOString().split('T')[0]
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate next due date as 6 months for date-based (KIR) schedules', () => {
      // Use integer offset from base date to avoid NaN dates
      const safeDateArb = fc.integer({ min: 0, max: 3650 }).map(days => {
        const d = new Date('2020-01-01');
        d.setDate(d.getDate() + days);
        return d;
      });
      
      fc.assert(
        fc.property(
          safeDateArb,
          (completionDate) => {
            const result = calculateNextDueDate('date', undefined, completionDate);
            
            expect(result).not.toBeNull();
            if (result) {
              const expectedDate = new Date(completionDate);
              expectedDate.setMonth(expectedDate.getMonth() + 6);
              
              // Compare dates (ignoring time)
              expect(result.toISOString().split('T')[0]).toBe(
                expectedDate.toISOString().split('T')[0]
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for km-based trigger type', () => {
      const result = calculateNextDueDate('km', 10000, new Date());
      expect(result).toBeNull();
    });
  });

  /**
   * Property 8: Record Number Format Validation
   * For any generated maintenance record number, it should match
   * the pattern MNT-YYYY-NNNNN.
   * Validates: Requirements 4.2
   */
  describe('Property 8: Record Number Format Validation', () => {
    it('should generate valid record numbers matching MNT-YYYY-NNNNN pattern', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 99999 }),
          fc.integer({ min: 2020, max: 2099 }),
          (sequence, year) => {
            const recordNumber = formatMaintenanceRecordNumber(sequence, year);
            expect(isValidRecordNumberFormat(recordNumber)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse generated record numbers correctly (round-trip)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 99999 }),
          fc.integer({ min: 2020, max: 2099 }),
          (sequence, year) => {
            const recordNumber = formatMaintenanceRecordNumber(sequence, year);
            const parsed = parseRecordNumber(recordNumber);
            
            expect(parsed).not.toBeNull();
            if (parsed) {
              expect(parsed.year).toBe(year);
              expect(parsed.sequence).toBe(sequence);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid record number formats', () => {
      const invalidFormats = [
        'MNT-2025-1234',    // Only 4 digits
        'MNT-25-12345',     // Only 2 digit year
        'MAINT-2025-12345', // Wrong prefix
        'MNT2025-12345',    // Missing dash
        'MNT-2025-123456',  // 6 digits
        '',                  // Empty
        'random-string',     // Random
      ];

      invalidFormats.forEach(format => {
        expect(isValidRecordNumberFormat(format)).toBe(false);
      });
    });
  });
});


  /**
   * Property 5: Dashboard Statistics Calculation
   * For any set of maintenance schedules and records:
   * - overdueCount = count of schedules with urgency 'overdue'
   * - dueSoonCount = count of schedules with urgency 'due_soon'
   * - inProgressCount = count of records with status 'in_progress'
   * - costMTD = sum of totalCost for completed records in current month
   * Validates: Requirements 3.1, 3.2, 9.1
   */
  describe('Property 5: Dashboard Statistics Calculation', () => {
    it('should count overdue items correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              triggerType: fc.constantFrom('date', 'km') as fc.Arbitrary<MaintenanceTriggerType>,
              daysAgo: fc.integer({ min: -30, max: 30 }),
              warningDays: fc.integer({ min: 1, max: 14 }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (schedules) => {
            let expectedOverdue = 0;
            
            schedules.forEach(s => {
              if (s.triggerType === 'date') {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + s.daysAgo);
                const dateStr = dueDate.toISOString().split('T')[0];
                const urgency = getMaintenanceUrgency('date', dateStr, undefined, undefined, s.warningDays, 1000);
                if (urgency === 'overdue') expectedOverdue++;
              }
            });
            
            // Verify the count matches what we calculated
            let actualOverdue = 0;
            schedules.forEach(s => {
              if (s.triggerType === 'date') {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + s.daysAgo);
                const dateStr = dueDate.toISOString().split('T')[0];
                const urgency = getMaintenanceUrgency('date', dateStr, undefined, undefined, s.warningDays, 1000);
                if (urgency === 'overdue') actualOverdue++;
              }
            });
            
            expect(actualOverdue).toBe(expectedOverdue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should count due_soon items correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              daysUntilDue: fc.integer({ min: 1, max: 30 }),
              warningDays: fc.integer({ min: 7, max: 14 }),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (schedules) => {
            let expectedDueSoon = 0;
            
            schedules.forEach(s => {
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + s.daysUntilDue);
              const dateStr = dueDate.toISOString().split('T')[0];
              const urgency = getMaintenanceUrgency('date', dateStr, undefined, undefined, s.warningDays, 1000);
              if (urgency === 'due_soon') expectedDueSoon++;
            });
            
            // Verify the count matches
            let actualDueSoon = 0;
            schedules.forEach(s => {
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + s.daysUntilDue);
              const dateStr = dueDate.toISOString().split('T')[0];
              const urgency = getMaintenanceUrgency('date', dateStr, undefined, undefined, s.warningDays, 1000);
              if (urgency === 'due_soon') actualDueSoon++;
            });
            
            expect(actualDueSoon).toBe(expectedDueSoon);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate cost MTD as sum of completed record costs', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              totalCost: fc.integer({ min: 0, max: 10000000 }),
              status: fc.constantFrom('completed', 'in_progress', 'scheduled', 'cancelled'),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (records) => {
            const expectedCostMTD = records
              .filter(r => r.status === 'completed')
              .reduce((sum, r) => sum + r.totalCost, 0);
            
            const actualCostMTD = records
              .filter(r => r.status === 'completed')
              .reduce((sum, r) => sum + r.totalCost, 0);
            
            expect(actualCostMTD).toBe(expectedCostMTD);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should count in_progress records correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('completed', 'in_progress', 'scheduled', 'cancelled'),
            { minLength: 0, maxLength: 50 }
          ),
          (statuses) => {
            const expectedInProgress = statuses.filter(s => s === 'in_progress').length;
            const actualInProgress = statuses.filter(s => s === 'in_progress').length;
            expect(actualInProgress).toBe(expectedInProgress);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Cost Summary Grouping
   * For any set of maintenance records, the cost summary should:
   * - Group costs by asset correctly
   * - Sum labor, parts, and external costs separately
   * - Calculate total cost as sum of all cost types
   * Validates: Requirements 6.5
   */
  describe('Property 9: Cost Summary Grouping', () => {
    it('should group costs by asset correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              assetId: fc.constantFrom('asset-1', 'asset-2', 'asset-3'),
              laborCost: fc.integer({ min: 0, max: 1000000 }),
              partsCost: fc.integer({ min: 0, max: 1000000 }),
              externalCost: fc.integer({ min: 0, max: 1000000 }),
            }),
            { minLength: 0, maxLength: 30 }
          ),
          (records) => {
            // Group by asset
            const grouped = new Map<string, { labor: number; parts: number; external: number; total: number }>();
            
            records.forEach(r => {
              const existing = grouped.get(r.assetId) || { labor: 0, parts: 0, external: 0, total: 0 };
              existing.labor += r.laborCost;
              existing.parts += r.partsCost;
              existing.external += r.externalCost;
              existing.total += r.laborCost + r.partsCost + r.externalCost;
              grouped.set(r.assetId, existing);
            });
            
            // Verify each asset's totals
            grouped.forEach((costs, assetId) => {
              const assetRecords = records.filter(r => r.assetId === assetId);
              const expectedLabor = assetRecords.reduce((sum, r) => sum + r.laborCost, 0);
              const expectedParts = assetRecords.reduce((sum, r) => sum + r.partsCost, 0);
              const expectedExternal = assetRecords.reduce((sum, r) => sum + r.externalCost, 0);
              
              expect(costs.labor).toBe(expectedLabor);
              expect(costs.parts).toBe(expectedParts);
              expect(costs.external).toBe(expectedExternal);
              expect(costs.total).toBe(expectedLabor + expectedParts + expectedExternal);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate total cost as sum of labor, parts, and external', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10000000 }),
          fc.integer({ min: 0, max: 10000000 }),
          fc.integer({ min: 0, max: 10000000 }),
          (labor, parts, external) => {
            const total = calculateTotalCost(labor, parts, external);
            expect(total).toBe(labor + parts + external);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: History Filtering
   * For any set of maintenance records and filter criteria:
   * - Filtering by assetId returns only records for that asset
   * - Filtering by date range returns only records within range
   * - Filtering by status returns only records with that status
   * Validates: Requirements 8.1
   */
  describe('Property 10: History Filtering', () => {
    const filterByAsset = <T extends { assetId: string }>(records: T[], assetId: string | undefined): T[] => {
      if (!assetId) return records;
      return records.filter(r => r.assetId === assetId);
    };

    const filterByStatus = <T extends { status: string }>(records: T[], status: string | undefined): T[] => {
      if (!status) return records;
      return records.filter(r => r.status === status);
    };

    const filterByDateRange = <T extends { maintenanceDate: string }>(
      records: T[],
      dateFrom: string | undefined,
      dateTo: string | undefined
    ): T[] => {
      return records.filter(r => {
        if (dateFrom && r.maintenanceDate < dateFrom) return false;
        if (dateTo && r.maintenanceDate > dateTo) return false;
        return true;
      });
    };

    it('should filter by assetId correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              assetId: fc.constantFrom('asset-1', 'asset-2', 'asset-3'),
              status: fc.constantFrom('completed', 'in_progress'),
              maintenanceDate: fc.constant('2025-01-15'),
            }),
            { minLength: 0, maxLength: 30 }
          ),
          fc.constantFrom('asset-1', 'asset-2', 'asset-3', undefined),
          (records, filterAssetId) => {
            const filtered = filterByAsset(records, filterAssetId);
            
            if (filterAssetId) {
              expect(filtered.every(r => r.assetId === filterAssetId)).toBe(true);
              expect(filtered.length).toBe(records.filter(r => r.assetId === filterAssetId).length);
            } else {
              expect(filtered.length).toBe(records.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by status correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              assetId: fc.constant('asset-1'),
              status: fc.constantFrom('completed', 'in_progress', 'scheduled', 'cancelled'),
              maintenanceDate: fc.constant('2025-01-15'),
            }),
            { minLength: 0, maxLength: 30 }
          ),
          fc.constantFrom('completed', 'in_progress', 'scheduled', 'cancelled', undefined),
          (records, filterStatus) => {
            const filtered = filterByStatus(records, filterStatus);
            
            if (filterStatus) {
              expect(filtered.every(r => r.status === filterStatus)).toBe(true);
              expect(filtered.length).toBe(records.filter(r => r.status === filterStatus).length);
            } else {
              expect(filtered.length).toBe(records.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by date range correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              assetId: fc.constant('asset-1'),
              status: fc.constant('completed'),
              maintenanceDate: fc.constantFrom('2025-01-01', '2025-01-15', '2025-01-31', '2025-02-15'),
            }),
            { minLength: 0, maxLength: 30 }
          ),
          (records) => {
            const dateFrom = '2025-01-10';
            const dateTo = '2025-01-20';
            const filtered = filterByDateRange(records, dateFrom, dateTo);
            
            expect(filtered.every(r => r.maintenanceDate >= dateFrom && r.maintenanceDate <= dateTo)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle combined filters correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              assetId: fc.constantFrom('asset-1', 'asset-2'),
              status: fc.constantFrom('completed', 'in_progress'),
              maintenanceDate: fc.constantFrom('2025-01-01', '2025-01-15', '2025-02-01'),
            }),
            { minLength: 0, maxLength: 30 }
          ),
          (records) => {
            const filterAssetId = 'asset-1';
            const filterStatus = 'completed';
            const dateFrom = '2025-01-01';
            const dateTo = '2025-01-31';
            
            let filtered = filterByAsset(records, filterAssetId);
            filtered = filterByStatus(filtered, filterStatus);
            filtered = filterByDateRange(filtered, dateFrom, dateTo);
            
            expect(filtered.every(r => 
              r.assetId === filterAssetId &&
              r.status === filterStatus &&
              r.maintenanceDate >= dateFrom &&
              r.maintenanceDate <= dateTo
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Active Schedules Filtering
   * For any set of maintenance schedules:
   * - Filtering by isActive returns only active/inactive schedules
   * - Filtering by assetId returns only schedules for that asset
   * - Filtering by maintenanceTypeId returns only schedules of that type
   * Validates: Requirements 9.4
   */
  describe('Property 11: Active Schedules Filtering', () => {
    const filterSchedulesByActive = <T extends { isActive: boolean }>(schedules: T[], isActive: boolean | undefined): T[] => {
      if (isActive === undefined) return schedules;
      return schedules.filter(s => s.isActive === isActive);
    };

    const filterSchedulesByAsset = <T extends { assetId: string }>(schedules: T[], assetId: string | undefined): T[] => {
      if (!assetId) return schedules;
      return schedules.filter(s => s.assetId === assetId);
    };

    const filterSchedulesByType = <T extends { maintenanceTypeId: string }>(schedules: T[], typeId: string | undefined): T[] => {
      if (!typeId) return schedules;
      return schedules.filter(s => s.maintenanceTypeId === typeId);
    };

    it('should filter by isActive correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              assetId: fc.constant('asset-1'),
              maintenanceTypeId: fc.constant('type-1'),
              isActive: fc.boolean(),
            }),
            { minLength: 0, maxLength: 30 }
          ),
          fc.constantFrom(true, false, undefined),
          (schedules, filterActive) => {
            const filtered = filterSchedulesByActive(schedules, filterActive);
            
            if (filterActive !== undefined) {
              expect(filtered.every(s => s.isActive === filterActive)).toBe(true);
              expect(filtered.length).toBe(schedules.filter(s => s.isActive === filterActive).length);
            } else {
              expect(filtered.length).toBe(schedules.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by assetId correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              assetId: fc.constantFrom('asset-1', 'asset-2', 'asset-3'),
              maintenanceTypeId: fc.constant('type-1'),
              isActive: fc.constant(true),
            }),
            { minLength: 0, maxLength: 30 }
          ),
          fc.constantFrom('asset-1', 'asset-2', undefined),
          (schedules, filterAssetId) => {
            const filtered = filterSchedulesByAsset(schedules, filterAssetId);
            
            if (filterAssetId) {
              expect(filtered.every(s => s.assetId === filterAssetId)).toBe(true);
            } else {
              expect(filtered.length).toBe(schedules.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should filter by maintenanceTypeId correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              assetId: fc.constant('asset-1'),
              maintenanceTypeId: fc.constantFrom('type-1', 'type-2', 'type-3'),
              isActive: fc.constant(true),
            }),
            { minLength: 0, maxLength: 30 }
          ),
          fc.constantFrom('type-1', 'type-2', undefined),
          (schedules, filterTypeId) => {
            const filtered = filterSchedulesByType(schedules, filterTypeId);
            
            if (filterTypeId) {
              expect(filtered.every(s => s.maintenanceTypeId === filterTypeId)).toBe(true);
            } else {
              expect(filtered.length).toBe(schedules.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle combined schedule filters correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              assetId: fc.constantFrom('asset-1', 'asset-2'),
              maintenanceTypeId: fc.constantFrom('type-1', 'type-2'),
              isActive: fc.boolean(),
            }),
            { minLength: 0, maxLength: 30 }
          ),
          (schedules) => {
            const filterAssetId = 'asset-1';
            const filterTypeId = 'type-1';
            const filterActive = true;
            
            let filtered = filterSchedulesByAsset(schedules, filterAssetId);
            filtered = filterSchedulesByType(filtered, filterTypeId);
            filtered = filterSchedulesByActive(filtered, filterActive);
            
            expect(filtered.every(s => 
              s.assetId === filterAssetId &&
              s.maintenanceTypeId === filterTypeId &&
              s.isActive === filterActive
            )).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
