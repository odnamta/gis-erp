// =====================================================
// v0.46: HSE - INCIDENT REPORTING PROPERTY TESTS
// Feature: v0.46-hse-incident-reporting
// =====================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getSeverityColor,
  getStatusColor,
  getSeverityLabel,
  getStatusLabel,
  getContributingFactorLabel,
  calculateDaysSinceLastLTI,
  getPendingActionsCount,
  canCloseIncident,
  calculateMonthlyTrend,
  validateIncidentInput,
  countBySeverity,
  calculateTotalDaysLost,
  updateActionStatuses,
} from '@/lib/incident-utils';
import {
  IncidentSeverity,
  IncidentStatus,
  ContributingFactor,
  Incident,
  IncidentAction,
  ActionStatus,
  ReportIncidentInput,
} from '@/types/incident';

// =====================================================
// ARBITRARIES
// =====================================================

// Safe date arbitrary using integer offset pattern
const safeDateArbitrary = fc.integer({ min: 0, max: 3650 }).map((days) => {
  const date = new Date('2020-01-01');
  date.setDate(date.getDate() + days);
  return date;
});

const dateStringArbitrary = safeDateArbitrary.map(
  (d) => d.toISOString().split('T')[0]
);

const severityArbitrary = fc.constantFrom<IncidentSeverity>('low', 'medium', 'high', 'critical');
const statusArbitrary = fc.constantFrom<IncidentStatus>('reported', 'under_investigation', 'pending_actions', 'closed', 'rejected');
const actionStatusArbitrary = fc.constantFrom<ActionStatus>('pending', 'in_progress', 'completed', 'overdue');
const contributingFactorArbitrary = fc.constantFrom<ContributingFactor>(
  'equipment_failure',
  'procedure_not_followed',
  'human_error',
  'environmental_conditions',
  'training_gap'
);

// Action arbitrary
const actionArbitrary = fc.record({
  id: fc.uuid(),
  description: fc.string({ minLength: 1, maxLength: 200 }),
  responsibleId: fc.uuid(),
  dueDate: dateStringArbitrary,
  status: actionStatusArbitrary,
});

// Minimal incident arbitrary for testing
const minimalIncidentArbitrary = fc.record({
  id: fc.uuid(),
  incidentNumber: fc.string({ minLength: 5, maxLength: 20 }),
  categoryId: fc.uuid(),
  severity: severityArbitrary,
  incidentType: fc.constantFrom('accident', 'near_miss', 'observation', 'violation'),
  incidentDate: dateStringArbitrary,
  locationType: fc.constantFrom('office', 'warehouse', 'road', 'customer_site', 'port', 'other'),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.string({ minLength: 10, maxLength: 1000 }),
  reportedBy: fc.uuid(),
  reportedAt: dateStringArbitrary,
  status: statusArbitrary,
  investigationRequired: fc.boolean(),
  contributingFactors: fc.array(contributingFactorArbitrary, { maxLength: 5 }),
  correctiveActions: fc.array(actionArbitrary, { maxLength: 5 }),
  preventiveActions: fc.array(actionArbitrary, { maxLength: 5 }),
  reportedToAuthority: fc.boolean(),
  photos: fc.constant([]),
  documents: fc.constant([]),
  createdAt: dateStringArbitrary,
  updatedAt: dateStringArbitrary,
}) as fc.Arbitrary<Incident>;

// Past date arbitrary (for valid incident dates - cannot be in future)
const pastDateArbitrary = fc.integer({ min: 0, max: 1825 }).map((days) => {
  const date = new Date('2020-01-01');
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
});

// Non-empty string arbitrary (no whitespace-only strings)
const nonEmptyStringArbitrary = (minLength: number, maxLength: number) =>
  fc.string({ minLength, maxLength }).filter((s) => s.trim().length >= minLength);

// Report incident input arbitrary with valid values
const reportIncidentInputArbitrary = fc.record({
  categoryId: fc.uuid(),
  severity: severityArbitrary,
  incidentType: fc.constantFrom('accident', 'near_miss', 'observation', 'violation'),
  incidentDate: pastDateArbitrary,
  locationType: fc.constantFrom('office', 'warehouse', 'road', 'customer_site', 'port', 'other'),
  title: nonEmptyStringArbitrary(1, 200),
  description: nonEmptyStringArbitrary(10, 1000),
}) as fc.Arbitrary<ReportIncidentInput>;

// =====================================================
// PROPERTY TESTS
// =====================================================

describe('v0.46 Incident Utils - Property Tests', () => {
  // =====================================================
  // Color Mapping Properties
  // =====================================================
  describe('Severity Color Mapping', () => {
    it('should return a non-empty string for all valid severity levels', () => {
      fc.assert(
        fc.property(severityArbitrary, (severity) => {
          const color = getSeverityColor(severity);
          expect(color).toBeTruthy();
          expect(typeof color).toBe('string');
          expect(color.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should return unique colors for different severity levels', () => {
      const severities: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
      const colors = severities.map(getSeverityColor);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(severities.length);
    });
  });

  describe('Status Color Mapping', () => {
    it('should return a non-empty string for all valid status values', () => {
      fc.assert(
        fc.property(statusArbitrary, (status) => {
          const color = getStatusColor(status);
          expect(color).toBeTruthy();
          expect(typeof color).toBe('string');
          expect(color.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should return unique colors for different status values', () => {
      const statuses: IncidentStatus[] = ['reported', 'under_investigation', 'pending_actions', 'closed', 'rejected'];
      const colors = statuses.map(getStatusColor);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(statuses.length);
    });
  });

  // =====================================================
  // Label Mapping Properties
  // =====================================================
  describe('Label Mapping', () => {
    it('should return Indonesian labels for all severity levels', () => {
      fc.assert(
        fc.property(severityArbitrary, (severity) => {
          const label = getSeverityLabel(severity);
          expect(label).toBeTruthy();
          expect(typeof label).toBe('string');
          // Should not return the raw enum value
          expect(['Rendah', 'Sedang', 'Tinggi', 'Kritis']).toContain(label);
        }),
        { numRuns: 100 }
      );
    });

    it('should return Indonesian labels for all status values', () => {
      fc.assert(
        fc.property(statusArbitrary, (status) => {
          const label = getStatusLabel(status);
          expect(label).toBeTruthy();
          expect(typeof label).toBe('string');
        }),
        { numRuns: 100 }
      );
    });

    it('should return Indonesian labels for all contributing factors', () => {
      fc.assert(
        fc.property(contributingFactorArbitrary, (factor) => {
          const label = getContributingFactorLabel(factor);
          expect(label).toBeTruthy();
          expect(typeof label).toBe('string');
          // Should not return the raw enum value (contains underscore)
          expect(label).not.toContain('_');
        }),
        { numRuns: 100 }
      );
    });
  });

  // =====================================================
  // Days Since Last LTI Properties
  // =====================================================
  describe('Days Since Last LTI Calculation', () => {
    it('should return non-negative value for any incident list', () => {
      fc.assert(
        fc.property(
          fc.array(minimalIncidentArbitrary, { maxLength: 20 }),
          safeDateArbitrary,
          (incidents, refDate) => {
            const days = calculateDaysSinceLastLTI(incidents, refDate);
            expect(days).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return at most 365 when no LTI incidents exist', () => {
      fc.assert(
        fc.property(safeDateArbitrary, (refDate) => {
          const days = calculateDaysSinceLastLTI([], refDate);
          expect(days).toBeLessThanOrEqual(365);
        }),
        { numRuns: 100 }
      );
    });

    it('should return 0 when LTI occurred on reference date', () => {
      const refDate = new Date('2024-06-15');
      const incident: Incident = {
        id: 'test-id',
        incidentNumber: 'INC-2024-00001',
        categoryId: 'cat-id',
        severity: 'high',
        incidentType: 'accident',
        incidentDate: '2024-06-15',
        locationType: 'warehouse',
        title: 'Test Incident',
        description: 'Test description for incident',
        reportedBy: 'user-id',
        reportedAt: '2024-06-15',
        status: 'reported',
        investigationRequired: true,
        contributingFactors: [],
        correctiveActions: [],
        preventiveActions: [],
        reportedToAuthority: false,
        photos: [],
        documents: [],
        createdAt: '2024-06-15',
        updatedAt: '2024-06-15',
        persons: [{ id: 'p1', incidentId: 'test-id', personType: 'injured', daysLost: 5, createdAt: '2024-06-15' }],
      };
      const days = calculateDaysSinceLastLTI([incident], refDate);
      expect(days).toBe(0);
    });
  });

  // =====================================================
  // Pending Actions Count Properties
  // =====================================================
  describe('Pending Actions Count', () => {
    it('should return sum of non-completed actions', () => {
      fc.assert(
        fc.property(
          fc.array(actionArbitrary, { maxLength: 10 }),
          fc.array(actionArbitrary, { maxLength: 10 }),
          (corrective, preventive) => {
            const incident: Incident = {
              id: 'test-id',
              incidentNumber: 'INC-2024-00001',
              categoryId: 'cat-id',
              severity: 'medium',
              incidentType: 'near_miss',
              incidentDate: '2024-06-15',
              locationType: 'office',
              title: 'Test',
              description: 'Test description',
              reportedBy: 'user-id',
              reportedAt: '2024-06-15',
              status: 'pending_actions',
              investigationRequired: false,
              contributingFactors: [],
              correctiveActions: corrective,
              preventiveActions: preventive,
              reportedToAuthority: false,
              photos: [],
              documents: [],
              createdAt: '2024-06-15',
              updatedAt: '2024-06-15',
            };

            const pendingCount = getPendingActionsCount(incident);
            const expectedPending = [...corrective, ...preventive].filter(
              (a) => a.status !== 'completed'
            ).length;

            expect(pendingCount).toBe(expectedPending);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when all actions are completed', () => {
      const completedAction: IncidentAction = {
        id: 'action-1',
        description: 'Test action',
        responsibleId: 'user-id',
        dueDate: '2024-06-30',
        status: 'completed',
        completedAt: '2024-06-25',
      };

      const incident: Incident = {
        id: 'test-id',
        incidentNumber: 'INC-2024-00001',
        categoryId: 'cat-id',
        severity: 'medium',
        incidentType: 'near_miss',
        incidentDate: '2024-06-15',
        locationType: 'office',
        title: 'Test',
        description: 'Test description',
        reportedBy: 'user-id',
        reportedAt: '2024-06-15',
        status: 'pending_actions',
        investigationRequired: false,
        contributingFactors: [],
        correctiveActions: [completedAction],
        preventiveActions: [completedAction],
        reportedToAuthority: false,
        photos: [],
        documents: [],
        createdAt: '2024-06-15',
        updatedAt: '2024-06-15',
      };

      expect(getPendingActionsCount(incident)).toBe(0);
    });

    it('should return non-negative value for any incident', () => {
      fc.assert(
        fc.property(minimalIncidentArbitrary, (incident) => {
          const count = getPendingActionsCount(incident);
          expect(count).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  // =====================================================
  // Can Close Incident Properties
  // =====================================================
  describe('Can Close Incident Validation', () => {
    it('should not allow closing already closed incidents', () => {
      fc.assert(
        fc.property(minimalIncidentArbitrary, (incident) => {
          const closedIncident = { ...incident, status: 'closed' as IncidentStatus };
          const result = canCloseIncident(closedIncident);
          expect(result.canClose).toBe(false);
          expect(result.reason).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    });

    it('should not allow closing rejected incidents', () => {
      fc.assert(
        fc.property(minimalIncidentArbitrary, (incident) => {
          const rejectedIncident = { ...incident, status: 'rejected' as IncidentStatus };
          const result = canCloseIncident(rejectedIncident);
          expect(result.canClose).toBe(false);
          expect(result.reason).toBeTruthy();
        }),
        { numRuns: 100 }
      );
    });

    it('should not allow closing when pending actions exist', () => {
      const pendingAction: IncidentAction = {
        id: 'action-1',
        description: 'Pending action',
        responsibleId: 'user-id',
        dueDate: '2024-06-30',
        status: 'pending',
      };

      const incident: Incident = {
        id: 'test-id',
        incidentNumber: 'INC-2024-00001',
        categoryId: 'cat-id',
        severity: 'medium',
        incidentType: 'near_miss',
        incidentDate: '2024-06-15',
        locationType: 'office',
        title: 'Test',
        description: 'Test description',
        reportedBy: 'user-id',
        reportedAt: '2024-06-15',
        status: 'pending_actions',
        investigationRequired: false,
        contributingFactors: [],
        correctiveActions: [pendingAction],
        preventiveActions: [],
        reportedToAuthority: false,
        photos: [],
        documents: [],
        createdAt: '2024-06-15',
        updatedAt: '2024-06-15',
      };

      const result = canCloseIncident(incident);
      expect(result.canClose).toBe(false);
      expect(result.reason).toContain('tindakan');
    });

    it('should allow closing when all actions completed and no investigation required', () => {
      const completedAction: IncidentAction = {
        id: 'action-1',
        description: 'Completed action',
        responsibleId: 'user-id',
        dueDate: '2024-06-30',
        status: 'completed',
        completedAt: '2024-06-25',
      };

      const incident: Incident = {
        id: 'test-id',
        incidentNumber: 'INC-2024-00001',
        categoryId: 'cat-id',
        severity: 'low',
        incidentType: 'observation',
        incidentDate: '2024-06-15',
        locationType: 'office',
        title: 'Test',
        description: 'Test description',
        reportedBy: 'user-id',
        reportedAt: '2024-06-15',
        status: 'pending_actions',
        investigationRequired: false,
        contributingFactors: [],
        correctiveActions: [completedAction],
        preventiveActions: [],
        reportedToAuthority: false,
        photos: [],
        documents: [],
        createdAt: '2024-06-15',
        updatedAt: '2024-06-15',
      };

      const result = canCloseIncident(incident);
      expect(result.canClose).toBe(true);
    });
  });

  // =====================================================
  // Monthly Trend Calculation Properties
  // =====================================================
  describe('Monthly Trend Calculation', () => {
    it('should return exactly the requested number of months', () => {
      fc.assert(
        fc.property(
          fc.array(minimalIncidentArbitrary, { maxLength: 50 }),
          fc.integer({ min: 1, max: 12 }),
          safeDateArbitrary,
          (incidents, months, refDate) => {
            const trend = calculateMonthlyTrend(incidents, months, refDate);
            expect(trend.length).toBe(months);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have non-negative counts for all months', () => {
      fc.assert(
        fc.property(
          fc.array(minimalIncidentArbitrary, { maxLength: 50 }),
          fc.integer({ min: 1, max: 12 }),
          safeDateArbitrary,
          (incidents, months, refDate) => {
            const trend = calculateMonthlyTrend(incidents, months, refDate);
            trend.forEach((month) => {
              expect(month.total).toBeGreaterThanOrEqual(0);
              expect(month.nearMisses).toBeGreaterThanOrEqual(0);
              expect(month.injuries).toBeGreaterThanOrEqual(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have nearMisses <= total for each month', () => {
      fc.assert(
        fc.property(
          fc.array(minimalIncidentArbitrary, { maxLength: 50 }),
          fc.integer({ min: 1, max: 12 }),
          safeDateArbitrary,
          (incidents, months, refDate) => {
            const trend = calculateMonthlyTrend(incidents, months, refDate);
            trend.forEach((month) => {
              expect(month.nearMisses).toBeLessThanOrEqual(month.total);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return empty counts for months with no incidents', () => {
      const trend = calculateMonthlyTrend([], 6, new Date('2024-06-15'));
      expect(trend.length).toBe(6);
      trend.forEach((month) => {
        expect(month.total).toBe(0);
        expect(month.nearMisses).toBe(0);
        expect(month.injuries).toBe(0);
      });
    });
  });

  // =====================================================
  // Input Validation Properties
  // =====================================================
  describe('Incident Input Validation', () => {
    it('should accept valid input', () => {
      fc.assert(
        fc.property(reportIncidentInputArbitrary, (input) => {
          const result = validateIncidentInput(input);
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject missing categoryId', () => {
      fc.assert(
        fc.property(reportIncidentInputArbitrary, (input) => {
          const invalidInput = { ...input, categoryId: '' };
          const result = validateIncidentInput(invalidInput);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Kategori');
        }),
        { numRuns: 100 }
      );
    });

    it('should reject missing severity', () => {
      fc.assert(
        fc.property(reportIncidentInputArbitrary, (input) => {
          const invalidInput = { ...input, severity: '' as IncidentSeverity };
          const result = validateIncidentInput(invalidInput);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('keparahan');
        }),
        { numRuns: 100 }
      );
    });

    it('should reject missing title', () => {
      fc.assert(
        fc.property(reportIncidentInputArbitrary, (input) => {
          // Test with empty string
          const invalidInput1 = { ...input, title: '' };
          const result1 = validateIncidentInput(invalidInput1);
          expect(result1.valid).toBe(false);
          expect(result1.error).toContain('Judul');

          // Test with whitespace-only string
          const invalidInput2 = { ...input, title: '   ' };
          const result2 = validateIncidentInput(invalidInput2);
          expect(result2.valid).toBe(false);
          expect(result2.error).toContain('Judul');
        }),
        { numRuns: 100 }
      );
    });

    it('should reject title exceeding 200 characters', () => {
      fc.assert(
        fc.property(
          reportIncidentInputArbitrary,
          fc.integer({ min: 201, max: 300 }),
          (input, length) => {
            const longTitle = 'a'.repeat(length);
            const invalidInput = { ...input, title: longTitle };
            const result = validateIncidentInput(invalidInput);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('200');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject description less than 10 characters', () => {
      fc.assert(
        fc.property(
          reportIncidentInputArbitrary,
          fc.integer({ min: 1, max: 9 }),
          (input, length) => {
            const shortDesc = 'a'.repeat(length);
            const invalidInput = { ...input, description: shortDesc };
            const result = validateIncidentInput(invalidInput);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('10');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const input: ReportIncidentInput = {
        categoryId: 'cat-id',
        severity: 'medium',
        incidentType: 'near_miss',
        incidentDate: futureDateStr,
        locationType: 'office',
        title: 'Test Incident',
        description: 'This is a test incident description',
      };

      const result = validateIncidentInput(input);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('masa depan');
    });
  });

  // =====================================================
  // Count By Severity Properties
  // =====================================================
  describe('Count By Severity', () => {
    it('should return counts for all severity levels', () => {
      fc.assert(
        fc.property(
          fc.array(minimalIncidentArbitrary, { maxLength: 50 }),
          (incidents) => {
            const counts = countBySeverity(incidents);
            expect(counts).toHaveProperty('low');
            expect(counts).toHaveProperty('medium');
            expect(counts).toHaveProperty('high');
            expect(counts).toHaveProperty('critical');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have sum of counts equal to total incidents', () => {
      fc.assert(
        fc.property(
          fc.array(minimalIncidentArbitrary, { maxLength: 50 }),
          (incidents) => {
            const counts = countBySeverity(incidents);
            const sum = counts.low + counts.medium + counts.high + counts.critical;
            expect(sum).toBe(incidents.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all zeros for empty array', () => {
      const counts = countBySeverity([]);
      expect(counts.low).toBe(0);
      expect(counts.medium).toBe(0);
      expect(counts.high).toBe(0);
      expect(counts.critical).toBe(0);
    });
  });

  // =====================================================
  // Total Days Lost Properties
  // =====================================================
  describe('Total Days Lost Calculation', () => {
    it('should return non-negative value for any incident list', () => {
      fc.assert(
        fc.property(
          fc.array(minimalIncidentArbitrary, { maxLength: 50 }),
          (incidents) => {
            const daysLost = calculateTotalDaysLost(incidents);
            expect(daysLost).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for incidents without injured persons', () => {
      const incident: Incident = {
        id: 'test-id',
        incidentNumber: 'INC-2024-00001',
        categoryId: 'cat-id',
        severity: 'low',
        incidentType: 'near_miss',
        incidentDate: '2024-06-15',
        locationType: 'office',
        title: 'Test',
        description: 'Test description',
        reportedBy: 'user-id',
        reportedAt: '2024-06-15',
        status: 'closed',
        investigationRequired: false,
        contributingFactors: [],
        correctiveActions: [],
        preventiveActions: [],
        reportedToAuthority: false,
        photos: [],
        documents: [],
        createdAt: '2024-06-15',
        updatedAt: '2024-06-15',
        persons: [{ id: 'p1', incidentId: 'test-id', personType: 'witness', daysLost: 0, createdAt: '2024-06-15' }],
      };

      expect(calculateTotalDaysLost([incident])).toBe(0);
    });

    it('should sum days lost from injured persons only', () => {
      const incident: Incident = {
        id: 'test-id',
        incidentNumber: 'INC-2024-00001',
        categoryId: 'cat-id',
        severity: 'high',
        incidentType: 'accident',
        incidentDate: '2024-06-15',
        locationType: 'warehouse',
        title: 'Test',
        description: 'Test description',
        reportedBy: 'user-id',
        reportedAt: '2024-06-15',
        status: 'closed',
        investigationRequired: true,
        contributingFactors: [],
        correctiveActions: [],
        preventiveActions: [],
        reportedToAuthority: false,
        photos: [],
        documents: [],
        createdAt: '2024-06-15',
        updatedAt: '2024-06-15',
        persons: [
          { id: 'p1', incidentId: 'test-id', personType: 'injured', daysLost: 5, createdAt: '2024-06-15' },
          { id: 'p2', incidentId: 'test-id', personType: 'witness', daysLost: 0, createdAt: '2024-06-15' },
          { id: 'p3', incidentId: 'test-id', personType: 'injured', daysLost: 3, createdAt: '2024-06-15' },
        ],
      };

      expect(calculateTotalDaysLost([incident])).toBe(8);
    });
  });

  // =====================================================
  // Update Action Statuses Properties
  // =====================================================
  describe('Update Action Statuses', () => {
    it('should not change completed actions', () => {
      fc.assert(
        fc.property(
          fc.array(actionArbitrary, { maxLength: 10 }),
          safeDateArbitrary,
          (actions, refDate) => {
            const completedActions = actions.map((a) => ({
              ...a,
              status: 'completed' as ActionStatus,
            }));
            const updated = updateActionStatuses(completedActions, refDate);
            updated.forEach((action) => {
              expect(action.status).toBe('completed');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark past-due non-completed actions as overdue', () => {
      const pastDate = new Date('2024-01-15');
      const refDate = new Date('2024-06-15');

      const action: IncidentAction = {
        id: 'action-1',
        description: 'Test action',
        responsibleId: 'user-id',
        dueDate: pastDate.toISOString().split('T')[0],
        status: 'pending',
      };

      const updated = updateActionStatuses([action], refDate);
      expect(updated[0].status).toBe('overdue');
    });

    it('should not change status of actions with future due dates', () => {
      const futureDate = new Date('2024-12-15');
      const refDate = new Date('2024-06-15');

      const action: IncidentAction = {
        id: 'action-1',
        description: 'Test action',
        responsibleId: 'user-id',
        dueDate: futureDate.toISOString().split('T')[0],
        status: 'pending',
      };

      const updated = updateActionStatuses([action], refDate);
      expect(updated[0].status).toBe('pending');
    });

    it('should preserve action properties other than status', () => {
      fc.assert(
        fc.property(
          fc.array(actionArbitrary, { maxLength: 10 }),
          safeDateArbitrary,
          (actions, refDate) => {
            const updated = updateActionStatuses(actions, refDate);
            expect(updated.length).toBe(actions.length);
            updated.forEach((action, i) => {
              expect(action.id).toBe(actions[i].id);
              expect(action.description).toBe(actions[i].description);
              expect(action.responsibleId).toBe(actions[i].responsibleId);
              expect(action.dueDate).toBe(actions[i].dueDate);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
