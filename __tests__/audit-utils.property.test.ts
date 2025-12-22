/**
 * Property-based tests for audit-utils.ts
 * Feature: hse-audit-inspection
 * 
 * Uses fast-check for property-based testing with minimum 100 iterations
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidCategory,
  isValidSeverity,
  isValidChecklistTemplate,
  isValidChecklistItem,
  isValidChecklistSection,
  validateAuditType,
  validateFinding,
  calculateAuditScore,
  determineAuditRating,
  calculateNextDueDate,
  isAuditOverdue,
  getAuditsDueSoon,
  sortFindingsBySeverity,
  calculateDaysOverdue,
  filterOpenFindings,
  countCriticalOpenFindings,
  calculateAverageScore,
  filterCriticalMajorFindings,
  filterAudits,
  filterFindings,
} from '@/lib/audit-utils';
import {
  AUDIT_CATEGORIES,
  FINDING_SEVERITIES,
  SCORE_THRESHOLDS,
  AuditCategory,
  FindingSeverity,
  FindingStatus,
  AuditFinding,
  Audit,
  AuditScheduleItem,
  ChecklistTemplate,
  ChecklistResponse,
} from '@/types/audit';

// =====================================================
// Generators
// =====================================================

const auditCategoryGenerator = fc.constantFrom(...AUDIT_CATEGORIES);

const findingSeverityGenerator = fc.constantFrom(...FINDING_SEVERITIES);

const findingStatusGenerator = fc.constantFrom<FindingStatus>(
  'open',
  'in_progress',
  'closed',
  'verified'
);

const checklistItemTypeGenerator = fc.constantFrom(
  'yes_no',
  'rating',
  'text',
  'select'
);

// Generator for non-whitespace strings
const nonWhitespaceString = (minLength: number, maxLength: number) =>
  fc.string({ minLength, maxLength }).filter((s) => s.trim().length > 0);

const validChecklistItemGenerator = fc.record({
  question: nonWhitespaceString(1, 100),
  type: checklistItemTypeGenerator,
  weight: fc.integer({ min: 1, max: 10 }),
  required: fc.boolean(),
}).chain((item) => {
  if (item.type === 'select') {
    return fc.array(nonWhitespaceString(1, 20), { minLength: 1, maxLength: 5 })
      .map((options) => ({ ...item, options }));
  }
  return fc.constant(item);
});

const validChecklistSectionGenerator = fc.record({
  name: nonWhitespaceString(1, 50),
  items: fc.array(validChecklistItemGenerator, { minLength: 1, maxLength: 5 }),
});

const validChecklistTemplateGenerator: fc.Arbitrary<ChecklistTemplate> = fc.record({
  sections: fc.array(validChecklistSectionGenerator, { minLength: 1, maxLength: 3 }),
});

// Safe date generator that produces valid dates
const safeDateStringGenerator = fc.integer({ min: 0, max: 3650 }).map((daysFromBase) => {
  const baseDate = new Date('2020-01-01');
  baseDate.setDate(baseDate.getDate() + daysFromBase);
  return baseDate.toISOString().split('T')[0];
});

const safeTimestampGenerator = fc.integer({ min: 0, max: 3650 }).map((daysFromBase) => {
  const baseDate = new Date('2020-01-01');
  baseDate.setDate(baseDate.getDate() + daysFromBase);
  return baseDate.toISOString();
});

const auditFindingGenerator = (overrides: Partial<AuditFinding> = {}): fc.Arbitrary<AuditFinding> =>
  fc.record({
    id: fc.uuid(),
    audit_id: fc.uuid(),
    finding_number: fc.integer({ min: 1, max: 100 }),
    severity: findingSeverityGenerator,
    category: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    finding_description: fc.string({ minLength: 1 }),
    location_detail: fc.option(fc.string(), { nil: null }),
    photos: fc.constant([]),
    risk_level: fc.option(fc.constantFrom('high', 'medium', 'low') as fc.Arbitrary<'high' | 'medium' | 'low'>, { nil: null }),
    potential_consequence: fc.option(fc.string(), { nil: null }),
    corrective_action: fc.option(fc.string(), { nil: null }),
    responsible_id: fc.option(fc.uuid(), { nil: null }),
    due_date: fc.option(safeDateStringGenerator, { nil: null }),
    status: findingStatusGenerator,
    closed_by: fc.option(fc.uuid(), { nil: null }),
    closed_at: fc.option(safeTimestampGenerator, { nil: null }),
    closure_evidence: fc.option(fc.string(), { nil: null }),
    verified_by: fc.option(fc.uuid(), { nil: null }),
    verified_at: fc.option(safeTimestampGenerator, { nil: null }),
    created_at: safeTimestampGenerator,
  }).map((finding) => ({ ...finding, ...overrides }));

const auditScheduleItemGenerator = fc.record({
  audit_type_id: fc.uuid(),
  type_code: fc.string({ minLength: 1, maxLength: 30 }),
  type_name: fc.string({ minLength: 1, maxLength: 100 }),
  frequency_days: fc.integer({ min: 1, max: 365 }),
  last_conducted: fc.option(safeDateStringGenerator, { nil: null }),
  next_due: fc.option(safeDateStringGenerator, { nil: null }),
});

// =====================================================
// Property 3: Category Validation
// =====================================================

describe('Property 3: Category Validation', () => {
  /**
   * Feature: hse-audit-inspection, Property 3: Category Validation
   * For any audit type creation with a category value, the system SHALL accept 
   * only values from the set {safety_audit, workplace_inspection, vehicle_inspection, 
   * equipment_inspection, environmental_audit} and reject all others.
   * Validates: Requirements 1.3
   */
  it('should accept all valid categories', () => {
    fc.assert(
      fc.property(auditCategoryGenerator, (category) => {
        expect(isValidCategory(category)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject invalid categories', () => {
    const invalidCategoryGenerator = fc.string().filter(
      (s) => !AUDIT_CATEGORIES.includes(s as AuditCategory)
    );

    fc.assert(
      fc.property(invalidCategoryGenerator, (category) => {
        expect(isValidCategory(category)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// Property 4: Checklist Template Structure Validation
// =====================================================

describe('Property 4: Checklist Template Structure Validation', () => {
  /**
   * Feature: hse-audit-inspection, Property 4: Checklist Template Structure Validation
   * For any checklist template, the system SHALL accept templates with valid structure 
   * (sections containing items with question, type, weight, required) and reject malformed templates.
   * Validates: Requirements 1.5
   */
  it('should accept valid checklist templates', () => {
    fc.assert(
      fc.property(validChecklistTemplateGenerator, (template) => {
        expect(isValidChecklistTemplate(template)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject templates with missing sections array', () => {
    fc.assert(
      fc.property(fc.anything().filter((x) => {
        if (x === null || x === undefined) return true;
        if (typeof x !== 'object') return true;
        const obj = x as Record<string, unknown>;
        return !Array.isArray(obj.sections);
      }), (template) => {
        expect(isValidChecklistTemplate(template)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject items with invalid type', () => {
    const invalidItemGenerator = fc.record({
      question: fc.string({ minLength: 1 }),
      type: fc.string().filter((s) => !['yes_no', 'rating', 'text', 'select'].includes(s)),
      weight: fc.integer({ min: 1 }),
      required: fc.boolean(),
    });

    fc.assert(
      fc.property(invalidItemGenerator, (item) => {
        expect(isValidChecklistItem(item)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject select items without options', () => {
    const selectWithoutOptionsGenerator = fc.record({
      question: fc.string({ minLength: 1 }),
      type: fc.constant('select'),
      weight: fc.integer({ min: 1 }),
      required: fc.boolean(),
    });

    fc.assert(
      fc.property(selectWithoutOptionsGenerator, (item) => {
        expect(isValidChecklistItem(item)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// Property 12: Finding Severity Validation
// =====================================================

describe('Property 12: Finding Severity Validation', () => {
  /**
   * Feature: hse-audit-inspection, Property 12: Finding Severity Validation
   * For any finding creation, the system SHALL require a severity value from the set 
   * {critical, major, minor, observation} and reject findings without valid severity.
   * Validates: Requirements 4.1
   */
  it('should accept all valid severities', () => {
    fc.assert(
      fc.property(findingSeverityGenerator, (severity) => {
        expect(isValidSeverity(severity)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject invalid severities', () => {
    const invalidSeverityGenerator = fc.string().filter(
      (s) => !FINDING_SEVERITIES.includes(s as FindingSeverity)
    );

    fc.assert(
      fc.property(invalidSeverityGenerator, (severity) => {
        expect(isValidSeverity(severity)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should reject findings without severity in validation', () => {
    fc.assert(
      fc.property(
        fc.record({
          audit_id: fc.uuid(),
          finding_description: fc.string({ minLength: 1 }),
        }),
        (input) => {
          const result = validateFinding(input);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.field === 'severity')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// =====================================================
// Property 9: Audit Score Calculation
// =====================================================

describe('Property 9: Audit Score Calculation', () => {
  /**
   * Feature: hse-audit-inspection, Property 9: Audit Score Calculation
   * For any completed checklist with weighted items and responses, the calculated 
   * overall_score SHALL be a percentage (0-100) representing the weighted sum of 
   * positive responses divided by total possible weight.
   * Validates: Requirements 3.5
   */
  it('should return score in range 0-100', () => {
    fc.assert(
      fc.property(
        validChecklistTemplateGenerator,
        fc.array(fc.record({
          section: fc.string({ minLength: 1 }),
          item_index: fc.integer({ min: 0, max: 10 }),
          question: fc.string(),
          response: fc.oneof(fc.boolean(), fc.integer({ min: 1, max: 5 }), fc.string()),
          notes: fc.option(fc.string(), { nil: null }),
          finding_created: fc.boolean(),
        })),
        (template, responses) => {
          const score = calculateAuditScore(template, responses);
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 for empty template', () => {
    const emptyTemplate: ChecklistTemplate = { sections: [] };
    const score = calculateAuditScore(emptyTemplate, []);
    expect(score).toBe(0);
  });

  it('should return 100 for all positive yes_no responses', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1 }),
            items: fc.array(
              fc.record({
                question: fc.string({ minLength: 1 }),
                type: fc.constant('yes_no' as const),
                weight: fc.integer({ min: 1, max: 10 }),
                required: fc.boolean(),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          { minLength: 1, maxLength: 2 }
        ),
        (sections) => {
          const template: ChecklistTemplate = { sections };
          const responses: ChecklistResponse[] = [];
          
          sections.forEach((section) => {
            section.items.forEach((item, index) => {
              responses.push({
                section: section.name,
                item_index: index,
                question: item.question,
                response: true,
                notes: null,
                finding_created: false,
              });
            });
          });

          const score = calculateAuditScore(template, responses);
          expect(score).toBe(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// Property 10: Audit Rating Determination
// =====================================================

describe('Property 10: Audit Rating Determination', () => {
  /**
   * Feature: hse-audit-inspection, Property 10: Audit Rating Determination
   * For any audit score, the overall_rating SHALL be determined as: 'pass' for 
   * scores >= 80, 'conditional_pass' for scores >= 60 and < 80, 'fail' for scores < 60.
   * Validates: Requirements 3.6
   */
  it('should return pass for scores >= 80', () => {
    fc.assert(
      fc.property(fc.integer({ min: 80, max: 100 }), (score) => {
        expect(determineAuditRating(score)).toBe('pass');
      }),
      { numRuns: 100 }
    );
  });

  it('should return conditional_pass for scores >= 60 and < 80', () => {
    fc.assert(
      fc.property(fc.integer({ min: 60, max: 79 }), (score) => {
        expect(determineAuditRating(score)).toBe('conditional_pass');
      }),
      { numRuns: 100 }
    );
  });

  it('should return fail for scores < 60', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 59 }), (score) => {
        expect(determineAuditRating(score)).toBe('fail');
      }),
      { numRuns: 100 }
    );
  });

  it('should handle boundary values correctly', () => {
    expect(determineAuditRating(80)).toBe('pass');
    expect(determineAuditRating(79)).toBe('conditional_pass');
    expect(determineAuditRating(60)).toBe('conditional_pass');
    expect(determineAuditRating(59)).toBe('fail');
  });
});

// =====================================================
// Property 6: Next Due Date Calculation
// =====================================================

describe('Property 6: Next Due Date Calculation', () => {
  /**
   * Feature: hse-audit-inspection, Property 6: Next Due Date Calculation
   * For any audit type with frequency_days and a last_conducted date, the calculated 
   * next_due date SHALL equal last_conducted plus frequency_days.
   * Validates: Requirements 2.1
   */
  it('should calculate next due date as last conducted + frequency days', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.integer({ min: 1, max: 365 }),
        (lastConducted, frequencyDays) => {
          const nextDue = calculateNextDueDate(lastConducted, frequencyDays);
          
          const expected = new Date(lastConducted);
          expected.setDate(expected.getDate() + frequencyDays);
          
          expect(nextDue.toDateString()).toBe(expected.toDateString());
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle string date input', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
        fc.integer({ min: 1, max: 365 }),
        (lastConducted, frequencyDays) => {
          const dateString = lastConducted.toISOString().split('T')[0];
          const nextDue = calculateNextDueDate(dateString, frequencyDays);
          
          const expected = new Date(dateString);
          expected.setDate(expected.getDate() + frequencyDays);
          
          expect(nextDue.toDateString()).toBe(expected.toDateString());
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// Property 7: Due Soon Audit Identification
// =====================================================

describe('Property 7: Due Soon Audit Identification', () => {
  /**
   * Feature: hse-audit-inspection, Property 7: Due Soon Audit Identification
   * For any set of scheduled audits and a reference date, audits with next_due within 
   * the specified days-ahead window SHALL be included in the "due soon" list, and 
   * audits outside this window SHALL be excluded.
   * Validates: Requirements 2.4, 6.1
   */
  it('should include audits due within the window', () => {
    const currentDate = new Date('2025-01-15');
    const daysAhead = 7;

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            audit_type_id: fc.uuid(),
            type_code: fc.string({ minLength: 1 }),
            type_name: fc.string({ minLength: 1 }),
            frequency_days: fc.integer({ min: 1, max: 365 }),
            last_conducted: fc.constant(null),
            next_due: fc.integer({ min: 0, max: 6 }).map((daysFromNow) => {
              const date = new Date(currentDate);
              date.setDate(date.getDate() + daysFromNow);
              return date.toISOString().split('T')[0];
            }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (scheduleItems) => {
          const dueSoon = getAuditsDueSoon(scheduleItems, daysAhead, currentDate);
          expect(dueSoon.length).toBe(scheduleItems.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude audits due after the window', () => {
    const currentDate = new Date('2025-01-15');
    const daysAhead = 7;

    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            audit_type_id: fc.uuid(),
            type_code: fc.string({ minLength: 1 }),
            type_name: fc.string({ minLength: 1 }),
            frequency_days: fc.integer({ min: 1, max: 365 }),
            last_conducted: fc.constant(null),
            next_due: fc.integer({ min: 8, max: 30 }).map((daysFromNow) => {
              const date = new Date(currentDate);
              date.setDate(date.getDate() + daysFromNow);
              return date.toISOString().split('T')[0];
            }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (scheduleItems) => {
          const dueSoon = getAuditsDueSoon(scheduleItems, daysAhead, currentDate);
          expect(dueSoon.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should mark overdue audits correctly', () => {
    const currentDate = new Date('2025-01-15');
    
    const overdueItem: AuditScheduleItem = {
      audit_type_id: '123',
      type_code: 'TEST',
      type_name: 'Test Audit',
      frequency_days: 7,
      last_conducted: null,
      next_due: '2025-01-10', // 5 days ago
    };

    const dueSoon = getAuditsDueSoon([overdueItem], 7, currentDate);
    expect(dueSoon.length).toBe(1);
    expect(dueSoon[0].is_overdue).toBe(true);
  });
});


// =====================================================
// Property 14: Finding Sort Order
// =====================================================

describe('Property 14: Finding Sort Order', () => {
  /**
   * Feature: hse-audit-inspection, Property 14: Finding Sort Order
   * For any list of findings, sorting by severity then due_date SHALL produce a list 
   * where critical findings appear before major, major before minor, minor before 
   * observations, and within each severity, earlier due dates appear first.
   * Validates: Requirements 4.7
   */
  const severityOrder: Record<FindingSeverity, number> = {
    critical: 1,
    major: 2,
    minor: 3,
    observation: 4,
  };

  it('should sort findings by severity order', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 2, maxLength: 20 }),
        (findings) => {
          const sorted = sortFindingsBySeverity(findings);
          
          for (let i = 1; i < sorted.length; i++) {
            const prevSeverity = severityOrder[sorted[i - 1].severity];
            const currSeverity = severityOrder[sorted[i].severity];
            
            // Current severity should be >= previous (lower number = higher priority)
            expect(currSeverity).toBeGreaterThanOrEqual(prevSeverity);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should sort by due date within same severity', () => {
    fc.assert(
      fc.property(
        fc.array(
          auditFindingGenerator({ severity: 'critical' }),
          { minLength: 2, maxLength: 10 }
        ),
        (findings) => {
          const sorted = sortFindingsBySeverity(findings);
          
          for (let i = 1; i < sorted.length; i++) {
            if (sorted[i - 1].due_date && sorted[i].due_date) {
              const prevDate = new Date(sorted[i - 1].due_date!);
              const currDate = new Date(sorted[i].due_date!);
              expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not mutate original array', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 1, maxLength: 10 }),
        (findings) => {
          const original = [...findings];
          sortFindingsBySeverity(findings);
          expect(findings).toEqual(original);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// Property 18: Overdue Days Calculation
// =====================================================

describe('Property 18: Overdue Days Calculation', () => {
  /**
   * Feature: hse-audit-inspection, Property 18: Overdue Days Calculation
   * For any finding with a due_date that is before the current date and status not 
   * in {closed, verified}, days_overdue SHALL equal the number of days between 
   * due_date and current_date.
   * Validates: Requirements 5.6
   */
  it('should return positive days for overdue findings', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        (daysOverdue) => {
          const currentDate = new Date('2025-01-15');
          const dueDate = new Date(currentDate);
          dueDate.setDate(dueDate.getDate() - daysOverdue);
          
          const result = calculateDaysOverdue(dueDate, currentDate);
          expect(result).toBe(daysOverdue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return negative days for future due dates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 }),
        (daysUntilDue) => {
          const currentDate = new Date('2025-01-15');
          const dueDate = new Date(currentDate);
          dueDate.setDate(dueDate.getDate() + daysUntilDue);
          
          const result = calculateDaysOverdue(dueDate, currentDate);
          expect(result).toBe(-daysUntilDue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 for due today', () => {
    const currentDate = new Date('2025-01-15');
    const result = calculateDaysOverdue(currentDate, currentDate);
    expect(result).toBe(0);
  });
});

// =====================================================
// Property 19: Open Findings Identification
// =====================================================

describe('Property 19: Open Findings Identification', () => {
  /**
   * Feature: hse-audit-inspection, Property 19: Open Findings Identification
   * For any set of findings, the open findings view SHALL include exactly those 
   * findings with status NOT in {closed, verified} and exclude all others.
   * Validates: Requirements 5.7, 6.2
   */
  it('should include only open and in_progress findings', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 1, maxLength: 20 }),
        (findings) => {
          const openFindings = filterOpenFindings(findings);
          
          openFindings.forEach((finding) => {
            expect(['open', 'in_progress']).toContain(finding.status);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude closed and verified findings', () => {
    fc.assert(
      fc.property(
        fc.array(
          auditFindingGenerator({ status: fc.constantFrom('closed', 'verified') as unknown as FindingStatus }),
          { minLength: 1, maxLength: 10 }
        ),
        (findings) => {
          // Force status to be closed or verified
          const closedFindings = findings.map((f) => ({
            ...f,
            status: Math.random() > 0.5 ? 'closed' : 'verified' as FindingStatus,
          }));
          
          const openFindings = filterOpenFindings(closedFindings);
          expect(openFindings.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all open findings', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 1, maxLength: 20 }),
        (findings) => {
          const expectedOpenCount = findings.filter(
            (f) => f.status !== 'closed' && f.status !== 'verified'
          ).length;
          
          const openFindings = filterOpenFindings(findings);
          expect(openFindings.length).toBe(expectedOpenCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// Property 20: Critical Findings Count
// =====================================================

describe('Property 20: Critical Findings Count', () => {
  /**
   * Feature: hse-audit-inspection, Property 20: Critical Findings Count
   * For any set of findings, the critical findings count SHALL equal the number of 
   * findings with severity='critical' AND status NOT in {closed, verified}.
   * Validates: Requirements 6.3
   */
  it('should count only critical open findings', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 1, maxLength: 20 }),
        (findings) => {
          const expectedCount = findings.filter(
            (f) => f.severity === 'critical' && f.status !== 'closed' && f.status !== 'verified'
          ).length;
          
          const count = countCriticalOpenFindings(findings);
          expect(count).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 when no critical open findings', () => {
    fc.assert(
      fc.property(
        fc.array(
          auditFindingGenerator({ severity: 'minor' }),
          { minLength: 0, maxLength: 10 }
        ),
        (findings) => {
          const count = countCriticalOpenFindings(findings);
          expect(count).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// Property 21: Average Score Calculation
// =====================================================

describe('Property 21: Average Score Calculation', () => {
  /**
   * Feature: hse-audit-inspection, Property 21: Average Score Calculation
   * For any set of completed audits within a date range, the average score SHALL 
   * equal the sum of all overall_score values divided by the count of audits.
   * Validates: Requirements 6.4
   */
  const completedAuditGenerator = fc.record({
    id: fc.uuid(),
    audit_number: fc.string(),
    audit_type_id: fc.uuid(),
    scheduled_date: fc.constant(null),
    conducted_date: safeDateStringGenerator,
    location: fc.constant(null),
    department_id: fc.constant(null),
    asset_id: fc.constant(null),
    job_order_id: fc.constant(null),
    auditor_id: fc.constant(null),
    auditor_name: fc.constant(null),
    checklist_responses: fc.constant([]),
    overall_score: fc.float({ min: 0, max: 100 }),
    overall_rating: fc.constantFrom('pass', 'conditional_pass', 'fail') as fc.Arbitrary<'pass' | 'conditional_pass' | 'fail'>,
    summary: fc.constant(null),
    critical_findings: fc.constant(0),
    major_findings: fc.constant(0),
    minor_findings: fc.constant(0),
    observations: fc.constant(0),
    status: fc.constant('completed' as const),
    completed_at: safeTimestampGenerator,
    photos: fc.constant([]),
    documents: fc.constant([]),
    created_by: fc.constant(null),
    created_at: safeTimestampGenerator,
  });

  it('should calculate correct average for completed audits', () => {
    fc.assert(
      fc.property(
        fc.array(completedAuditGenerator, { minLength: 1, maxLength: 10 }),
        (audits) => {
          const expectedAvg = audits.reduce((sum, a) => sum + (a.overall_score || 0), 0) / audits.length;
          const roundedExpected = Math.round(expectedAvg * 100) / 100;
          
          const result = calculateAverageScore(audits);
          expect(result).toBeCloseTo(roundedExpected, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return 0 for empty array', () => {
    const result = calculateAverageScore([]);
    expect(result).toBe(0);
  });
});

// =====================================================
// Property 22: Critical and Major Findings Filter
// =====================================================

describe('Property 22: Critical and Major Findings Filter', () => {
  /**
   * Feature: hse-audit-inspection, Property 22: Critical and Major Findings Filter
   * For any set of open findings, filtering for critical and major SHALL include 
   * exactly those findings with severity in {critical, major} and exclude minor 
   * and observation findings.
   * Validates: Requirements 6.6
   */
  it('should include only critical and major findings', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 1, maxLength: 20 }),
        (findings) => {
          const filtered = filterCriticalMajorFindings(findings);
          
          filtered.forEach((finding) => {
            expect(['critical', 'major']).toContain(finding.severity);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should exclude minor and observation findings', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 1, maxLength: 20 }),
        (findings) => {
          const filtered = filterCriticalMajorFindings(findings);
          
          filtered.forEach((finding) => {
            expect(['minor', 'observation']).not.toContain(finding.severity);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve count of critical and major findings', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 1, maxLength: 20 }),
        (findings) => {
          const expectedCount = findings.filter(
            (f) => f.severity === 'critical' || f.severity === 'major'
          ).length;
          
          const filtered = filterCriticalMajorFindings(findings);
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// Property 23: Audit List Filtering
// =====================================================

describe('Property 23: Audit List Filtering', () => {
  /**
   * Feature: hse-audit-inspection, Property 23: Audit List Filtering
   * For any set of audits and filter criteria (type, status, date range, location), 
   * the filtered list SHALL include exactly those audits matching ALL specified criteria.
   * Validates: Requirements 7.1
   */
  const auditGenerator = fc.record({
    id: fc.uuid(),
    audit_number: fc.string(),
    audit_type_id: fc.uuid(),
    scheduled_date: fc.option(safeDateStringGenerator, { nil: null }),
    conducted_date: fc.option(safeDateStringGenerator, { nil: null }),
    location: fc.option(fc.string({ minLength: 1 }), { nil: null }),
    department_id: fc.option(fc.uuid(), { nil: null }),
    asset_id: fc.option(fc.uuid(), { nil: null }),
    job_order_id: fc.option(fc.uuid(), { nil: null }),
    auditor_id: fc.option(fc.uuid(), { nil: null }),
    auditor_name: fc.option(fc.string(), { nil: null }),
    checklist_responses: fc.constant([]),
    overall_score: fc.option(fc.float({ min: 0, max: 100 }), { nil: null }),
    overall_rating: fc.option(fc.constantFrom('pass', 'conditional_pass', 'fail') as fc.Arbitrary<'pass' | 'conditional_pass' | 'fail'>, { nil: null }),
    summary: fc.option(fc.string(), { nil: null }),
    critical_findings: fc.integer({ min: 0, max: 10 }),
    major_findings: fc.integer({ min: 0, max: 10 }),
    minor_findings: fc.integer({ min: 0, max: 10 }),
    observations: fc.integer({ min: 0, max: 10 }),
    status: fc.constantFrom('scheduled', 'in_progress', 'completed', 'cancelled') as fc.Arbitrary<'scheduled' | 'in_progress' | 'completed' | 'cancelled'>,
    completed_at: fc.option(safeTimestampGenerator, { nil: null }),
    photos: fc.constant([]),
    documents: fc.constant([]),
    created_by: fc.option(fc.uuid(), { nil: null }),
    created_at: safeTimestampGenerator,
  });

  it('should filter by status correctly', () => {
    fc.assert(
      fc.property(
        fc.array(auditGenerator, { minLength: 1, maxLength: 20 }),
        fc.constantFrom('scheduled', 'in_progress', 'completed', 'cancelled') as fc.Arbitrary<'scheduled' | 'in_progress' | 'completed' | 'cancelled'>,
        (audits, status) => {
          const filtered = filterAudits(audits, { status });
          
          filtered.forEach((audit) => {
            expect(audit.status).toBe(status);
          });
          
          const expectedCount = audits.filter((a) => a.status === status).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should filter by audit_type_id correctly', () => {
    fc.assert(
      fc.property(
        fc.array(auditGenerator, { minLength: 1, maxLength: 20 }),
        fc.uuid(),
        (audits, typeId) => {
          const filtered = filterAudits(audits, { audit_type_id: typeId });
          
          filtered.forEach((audit) => {
            expect(audit.audit_type_id).toBe(typeId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =====================================================
// Property 24: Finding List Filtering
// =====================================================

describe('Property 24: Finding List Filtering', () => {
  /**
   * Feature: hse-audit-inspection, Property 24: Finding List Filtering
   * For any set of findings and filter criteria (severity, status, responsible person), 
   * the filtered list SHALL include exactly those findings matching ALL specified criteria.
   * Validates: Requirements 7.3
   */
  it('should filter by severity correctly', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 1, maxLength: 20 }),
        findingSeverityGenerator,
        (findings, severity) => {
          const filtered = filterFindings(findings, { severity });
          
          filtered.forEach((finding) => {
            expect(finding.severity).toBe(severity);
          });
          
          const expectedCount = findings.filter((f) => f.severity === severity).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should filter by status correctly', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 1, maxLength: 20 }),
        findingStatusGenerator,
        (findings, status) => {
          const filtered = filterFindings(findings, { status });
          
          filtered.forEach((finding) => {
            expect(finding.status).toBe(status);
          });
          
          const expectedCount = findings.filter((f) => f.status === status).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should filter by multiple criteria (AND logic)', () => {
    fc.assert(
      fc.property(
        fc.array(auditFindingGenerator(), { minLength: 1, maxLength: 20 }),
        findingSeverityGenerator,
        findingStatusGenerator,
        (findings, severity, status) => {
          const filtered = filterFindings(findings, { severity, status });
          
          filtered.forEach((finding) => {
            expect(finding.severity).toBe(severity);
            expect(finding.status).toBe(status);
          });
          
          const expectedCount = findings.filter(
            (f) => f.severity === severity && f.status === status
          ).length;
          expect(filtered.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
