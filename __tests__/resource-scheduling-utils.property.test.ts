/**
 * Property-Based Tests for Resource Scheduling Utilities
 * Feature: engineering-resource-scheduling
 * 
 * These tests validate the correctness properties defined in the design document.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  generateResourceCode,
  getNextSequence,
  validateResourceInput,
  validateAssignmentInput,
  validateUnavailabilityInput,
  isValidAssignmentStatus,
  isValidUnavailabilityType,
  calculatePlannedHours,
  countWorkingDays,
  dateRangesOverlap,
  getDatesInRange,
  detectConflicts,
  checkAvailability,
  detectOverAllocation,
  calculateUtilization,
  isOverAllocated,
  calculateWeeklyUtilization,
  aggregateUtilizationByType,
  filterResources,
  filterCalendarResources,
  filterResourcesBySkills,
  generateCalendarCell,
  createUnavailabilityRecords,
  detectUnavailabilityConflicts,
  getCertificationStatus,
  validateSkillStructure,
  formatDateString,
  getWeekStart,
} from '@/lib/resource-scheduling-utils';
import {
  ResourceType,
  AssignmentStatus,
  UnavailabilityType,
  EngineeringResource,
  ResourceAssignment,
  ResourceAvailability,
  ResourceSkill,
  Certification,
  RESOURCE_TYPES,
  ASSIGNMENT_STATUSES,
  UNAVAILABILITY_TYPES,
  RESOURCE_TYPE_PREFIXES,
} from '@/types/resource-scheduling';

// =====================================================
// GENERATORS
// =====================================================

const resourceTypeGen = fc.constantFrom<ResourceType>(...RESOURCE_TYPES);
const assignmentStatusGen = fc.constantFrom<AssignmentStatus>(...ASSIGNMENT_STATUSES);
const unavailabilityTypeGen = fc.constantFrom<UnavailabilityType>(...UNAVAILABILITY_TYPES);

const uuidGen = fc.uuid();

// Helper to create valid date string
const toDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateGen = fc.date({
  min: new Date('2025-01-01'),
  max: new Date('2025-12-31')
}).map(d => toDateString(d));

const dateRangeGen = fc.tuple(
  fc.date({ min: new Date('2025-01-01'), max: new Date('2025-06-30') }),
  fc.integer({ min: 1, max: 30 })
).map(([start, days]) => {
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return {
    start_date: toDateString(start),
    end_date: toDateString(end)
  };
});

// Safe date generator that always produces valid dates
const safeDateGen = fc.integer({ min: 0, max: 364 }).map(days => {
  const d = new Date('2025-01-01');
  d.setDate(d.getDate() + days);
  return toDateString(d);
});

const safeIsoDateGen = fc.integer({ min: 0, max: 364 }).map(days => {
  const d = new Date('2025-01-01');
  d.setDate(d.getDate() + days);
  return d.toISOString();
});

const certificationGen = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  issued_date: fc.option(safeDateGen, { nil: undefined }),
  expiry_date: fc.option(safeDateGen, { nil: undefined }),
  issuing_body: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined })
});

const resourceInputGen = fc.record({
  resource_type: resourceTypeGen,
  resource_name: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  daily_capacity: fc.float({ min: 1, max: 24, noNaN: true }),
  skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
  certifications: fc.array(certificationGen, { maxLength: 5 })
});

const resourceGen = fc.record({
  id: uuidGen,
  resource_type: resourceTypeGen,
  resource_code: fc.string({ minLength: 5, maxLength: 20 }),
  resource_name: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  employee_id: fc.option(uuidGen, { nil: undefined }),
  asset_id: fc.option(uuidGen, { nil: undefined }),
  skills: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
  certifications: fc.array(certificationGen, { maxLength: 5 }),
  capacity_unit: fc.constantFrom('hours', 'days') as fc.Arbitrary<'hours' | 'days'>,
  daily_capacity: fc.float({ min: 1, max: 24, noNaN: true }),
  hourly_rate: fc.option(fc.float({ min: 0, max: 1000, noNaN: true }), { nil: undefined }),
  daily_rate: fc.option(fc.float({ min: 0, max: 10000, noNaN: true }), { nil: undefined }),
  is_available: fc.boolean(),
  unavailable_reason: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  unavailable_until: fc.option(safeDateGen, { nil: undefined }),
  base_location: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  is_active: fc.boolean(),
  created_at: safeIsoDateGen,
  updated_at: safeIsoDateGen
});

const assignmentGen = (resourceId?: string) => fc.record({
  id: uuidGen,
  resource_id: resourceId ? fc.constant(resourceId) : uuidGen,
  project_id: fc.option(uuidGen, { nil: undefined }),
  job_order_id: fc.option(uuidGen, { nil: undefined }),
  assessment_id: fc.option(uuidGen, { nil: undefined }),
  route_survey_id: fc.option(uuidGen, { nil: undefined }),
  jmp_id: fc.option(uuidGen, { nil: undefined }),
  task_description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  start_date: safeDateGen,
  end_date: safeDateGen,
  start_time: fc.option(fc.constant('09:00'), { nil: undefined }),
  end_time: fc.option(fc.constant('17:00'), { nil: undefined }),
  planned_hours: fc.option(fc.float({ min: 1, max: 100, noNaN: true }), { nil: undefined }),
  actual_hours: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), { nil: undefined }),
  work_location: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  status: assignmentStatusGen,
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  assigned_by: fc.option(uuidGen, { nil: undefined }),
  created_at: safeIsoDateGen,
  updated_at: safeIsoDateGen
}).map(a => ({
  ...a,
  end_date: a.start_date > a.end_date ? a.start_date : a.end_date
}));

const unavailabilityGen = (resourceId?: string) => fc.record({
  id: uuidGen,
  resource_id: resourceId ? fc.constant(resourceId) : uuidGen,
  date: safeDateGen,
  is_available: fc.boolean(),
  available_hours: fc.float({ min: 0, max: 24, noNaN: true }),
  unavailability_type: fc.option(unavailabilityTypeGen, { nil: undefined }),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined })
});

const skillGen = fc.record({
  id: uuidGen,
  skill_code: fc.string({ minLength: 1, maxLength: 30 }),
  skill_name: fc.string({ minLength: 1, maxLength: 100 }),
  skill_category: fc.constantFrom('engineering', 'design', 'field', 'operation') as fc.Arbitrary<'engineering' | 'design' | 'field' | 'operation'>,
  is_active: fc.boolean(),
  created_at: safeIsoDateGen
});


// =====================================================
// PROPERTY TESTS
// =====================================================

describe('Resource Scheduling - Property Tests', () => {
  
  // Feature: engineering-resource-scheduling, Property 5: Resource Code Uniqueness
  describe('Property 5: Resource Code Uniqueness', () => {
    it('generates unique codes for the same resource type', () => {
      fc.assert(
        fc.property(
          resourceTypeGen,
          fc.array(fc.integer({ min: 1, max: 9999 }), { minLength: 2, maxLength: 100 }),
          (type, sequences) => {
            const codes = sequences.map(seq => generateResourceCode(type, seq));
            const uniqueCodes = new Set(codes);
            // All codes should be unique if sequences are unique
            const uniqueSequences = new Set(sequences);
            return uniqueCodes.size === uniqueSequences.size;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('generates codes with correct prefix for each type', () => {
      fc.assert(
        fc.property(
          resourceTypeGen,
          fc.integer({ min: 1, max: 9999 }),
          (type, sequence) => {
            const code = generateResourceCode(type, sequence);
            const expectedPrefix = RESOURCE_TYPE_PREFIXES[type];
            return code.startsWith(expectedPrefix);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getNextSequence returns incrementing values', () => {
      fc.assert(
        fc.property(
          resourceTypeGen,
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 20 }),
          (type, sequences) => {
            const codes = sequences.map(seq => generateResourceCode(type, seq));
            const nextSeq = getNextSequence(codes, type);
            const maxSeq = Math.max(...sequences);
            return nextSeq === maxSeq + 1;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 7: Assignment Validation
  describe('Property 7: Assignment Validation', () => {
    it('fails validation when resource_id is missing', () => {
      fc.assert(
        fc.property(
          dateRangeGen,
          uuidGen,
          ({ start_date, end_date }, targetId) => {
            const input = {
              resource_id: '',
              target_type: 'project' as const,
              target_id: targetId,
              start_date,
              end_date
            };
            const result = validateAssignmentInput(input);
            return !result.isValid && result.errors.some(e => e.field === 'resource_id');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('fails validation when target_id is missing', () => {
      fc.assert(
        fc.property(
          dateRangeGen,
          uuidGen,
          ({ start_date, end_date }, resourceId) => {
            const input = {
              resource_id: resourceId,
              target_type: 'project' as const,
              target_id: '', // Empty string
              start_date,
              end_date
            };
            const result = validateAssignmentInput(input);
            return !result.isValid && result.errors.some(e => e.field === 'target_id');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('fails validation when start_date is missing', () => {
      fc.assert(
        fc.property(
          uuidGen,
          uuidGen,
          dateGen,
          (resourceId, targetId, endDate) => {
            const input = {
              resource_id: resourceId,
              target_type: 'project' as const,
              target_id: targetId,
              start_date: '', // Empty string
              end_date: endDate
            };
            const result = validateAssignmentInput(input);
            return !result.isValid && result.errors.some(e => e.field === 'start_date');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('fails validation when end_date is before start_date', () => {
      fc.assert(
        fc.property(
          uuidGen,
          uuidGen,
          (resourceId, targetId) => {
            const input = {
              resource_id: resourceId,
              target_type: 'project' as const,
              target_id: targetId,
              start_date: '2025-06-15',
              end_date: '2025-06-01' // Before start
            };
            const result = validateAssignmentInput(input);
            return !result.isValid && result.errors.some(e => e.field === 'end_date');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('passes validation with all required fields', () => {
      fc.assert(
        fc.property(
          uuidGen,
          uuidGen,
          dateRangeGen,
          (resourceId, targetId, { start_date, end_date }) => {
            const input = {
              resource_id: resourceId,
              target_type: 'project' as const,
              target_id: targetId,
              start_date,
              end_date
            };
            const result = validateAssignmentInput(input);
            return result.isValid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 16: Unavailability Input Validation
  describe('Property 16: Unavailability Input Validation', () => {
    it('fails validation when resource_id is missing', () => {
      fc.assert(
        fc.property(
          fc.array(dateGen, { minLength: 1, maxLength: 5 }),
          unavailabilityTypeGen,
          (dates, type) => {
            const input = {
              resource_id: '',
              dates,
              unavailability_type: type
            };
            const result = validateUnavailabilityInput(input);
            return !result.isValid && result.errors.some(e => e.field === 'resource_id');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('fails validation when dates array is empty', () => {
      fc.assert(
        fc.property(
          uuidGen,
          unavailabilityTypeGen,
          (resourceId, type) => {
            const input = {
              resource_id: resourceId,
              dates: [] as string[],
              unavailability_type: type
            };
            const result = validateUnavailabilityInput(input);
            return !result.isValid && result.errors.some(e => e.field === 'dates');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('fails validation when unavailability_type is invalid', () => {
      fc.assert(
        fc.property(
          uuidGen,
          fc.array(dateGen, { minLength: 1, maxLength: 5 }),
          (resourceId, dates) => {
            const input = {
              resource_id: resourceId,
              dates,
              unavailability_type: 'invalid_type' as UnavailabilityType
            };
            const result = validateUnavailabilityInput(input);
            return !result.isValid && result.errors.some(e => e.field === 'unavailability_type');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('passes validation with all required fields', () => {
      fc.assert(
        fc.property(
          uuidGen,
          fc.array(dateGen, { minLength: 1, maxLength: 5 }),
          unavailabilityTypeGen,
          (resourceId, dates, type) => {
            const input = {
              resource_id: resourceId,
              dates,
              unavailability_type: type
            };
            const result = validateUnavailabilityInput(input);
            return result.isValid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // Feature: engineering-resource-scheduling, Property 8: Planned Hours Calculation
  describe('Property 8: Planned Hours Calculation', () => {
    it('calculates planned hours as working days * daily capacity', () => {
      fc.assert(
        fc.property(
          dateRangeGen,
          fc.float({ min: 1, max: 24, noNaN: true }),
          ({ start_date, end_date }, dailyCapacity) => {
            const plannedHours = calculatePlannedHours(start_date, end_date, dailyCapacity);
            const workingDays = countWorkingDays(start_date, end_date);
            const expected = workingDays * dailyCapacity;
            return Math.abs(plannedHours - expected) < 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns zero for zero capacity', () => {
      fc.assert(
        fc.property(
          dateRangeGen,
          ({ start_date, end_date }) => {
            const plannedHours = calculatePlannedHours(start_date, end_date, 0);
            return plannedHours === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 9: Assignment Overlap Detection
  describe('Property 9: Assignment Overlap Detection', () => {
    it('detects overlapping assignments', () => {
      fc.assert(
        fc.property(
          uuidGen,
          safeDateGen,
          fc.integer({ min: 1, max: 10 }),
          (resourceId, startDate, duration) => {
            const endDate = (() => {
              const d = new Date(startDate);
              d.setDate(d.getDate() + duration);
              return toDateString(d);
            })();
            
            // Create an existing assignment
            const existingAssignment: ResourceAssignment = {
              id: 'existing-1',
              resource_id: resourceId,
              start_date: startDate,
              end_date: endDate,
              status: 'scheduled',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Try to create overlapping assignment
            const result = detectConflicts(
              resourceId,
              startDate,
              endDate,
              [existingAssignment],
              []
            );

            return result.has_conflict && result.conflicts.some(c => c.type === 'assignment');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not detect conflict for non-overlapping assignments', () => {
      fc.assert(
        fc.property(
          uuidGen,
          (resourceId) => {
            const existingAssignment: ResourceAssignment = {
              id: 'existing-1',
              resource_id: resourceId,
              start_date: '2025-01-15',
              end_date: '2025-01-20',
              status: 'scheduled',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const result = detectConflicts(
              resourceId,
              '2025-06-01',
              '2025-06-05',
              [existingAssignment],
              []
            );

            return !result.has_conflict;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 10: Unavailability Blocks Assignment
  describe('Property 10: Unavailability Blocks Assignment', () => {
    it('detects conflict when resource is unavailable', () => {
      fc.assert(
        fc.property(
          uuidGen,
          dateGen,
          unavailabilityTypeGen,
          (resourceId, date, unavailType) => {
            const unavailability: ResourceAvailability = {
              id: 'unavail-1',
              resource_id: resourceId,
              date,
              is_available: false,
              available_hours: 0,
              unavailability_type: unavailType
            };

            const result = detectConflicts(
              resourceId,
              date,
              date,
              [],
              [unavailability]
            );

            return result.has_conflict && 
                   result.conflicts.some(c => 
                     c.type === 'unavailability' && 
                     c.unavailability_type === unavailType
                   );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 11: Valid Assignment Status Transitions
  describe('Property 11: Valid Assignment Status Transitions', () => {
    it('validates all defined assignment statuses', () => {
      fc.assert(
        fc.property(
          assignmentStatusGen,
          (status) => {
            return isValidAssignmentStatus(status);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects invalid assignment statuses', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !ASSIGNMENT_STATUSES.includes(s as AssignmentStatus)),
          (invalidStatus) => {
            return !isValidAssignmentStatus(invalidStatus);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 12: Non-Overlapping Assignments Allowed
  describe('Property 12: Non-Overlapping Assignments Allowed', () => {
    it('allows multiple non-overlapping assignments', () => {
      fc.assert(
        fc.property(
          uuidGen,
          fc.array(
            fc.tuple(
              fc.integer({ min: 1, max: 28 }),
              fc.integer({ min: 1, max: 3 })
            ),
            { minLength: 2, maxLength: 5 }
          ),
          (resourceId, monthDayPairs) => {
            // Create non-overlapping assignments in different months
            const assignments: ResourceAssignment[] = monthDayPairs.map((pair, idx) => {
              const month = (idx * 2 + 1).toString().padStart(2, '0');
              const day = pair[0].toString().padStart(2, '0');
              const duration = pair[1];
              const startDate = `2025-${month}-${day}`;
              const endDay = Math.min(pair[0] + duration, 28).toString().padStart(2, '0');
              const endDate = `2025-${month}-${endDay}`;
              
              return {
                id: `assignment-${idx}`,
                resource_id: resourceId,
                start_date: startDate,
                end_date: endDate,
                status: 'scheduled' as AssignmentStatus,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            });

            // Check that a new assignment in a different month has no conflicts
            const newStart = '2025-12-01';
            const newEnd = '2025-12-05';
            
            const result = detectConflicts(
              resourceId,
              newStart,
              newEnd,
              assignments,
              []
            );

            return !result.has_conflict;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // Feature: engineering-resource-scheduling, Property 14: Remaining Hours Formula
  describe('Property 14: Remaining Hours Formula', () => {
    it('remaining hours equals available minus assigned', () => {
      fc.assert(
        fc.property(
          resourceGen,
          dateGen,
          (resource, date) => {
            const cell = generateCalendarCell(
              resource as EngineeringResource,
              date,
              [],
              []
            );
            
            return Math.abs(cell.remaining_hours - (cell.available_hours - cell.assigned_hours)) < 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 17: Bulk Unavailability Date Range
  describe('Property 17: Bulk Unavailability Date Range', () => {
    it('creates unavailability record for each date in range', () => {
      fc.assert(
        fc.property(
          uuidGen,
          dateRangeGen,
          unavailabilityTypeGen,
          (resourceId, { start_date, end_date }, type) => {
            const dates = getDatesInRange(start_date, end_date);
            const records = createUnavailabilityRecords(resourceId, dates, type);
            
            return records.length === dates.length &&
                   records.every(r => r.resource_id === resourceId) &&
                   records.every(r => r.unavailability_type === type) &&
                   records.every(r => !r.is_available);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 19: Valid Unavailability Types
  describe('Property 19: Valid Unavailability Types', () => {
    it('validates all defined unavailability types', () => {
      fc.assert(
        fc.property(
          unavailabilityTypeGen,
          (type) => {
            return isValidUnavailabilityType(type);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects invalid unavailability types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !UNAVAILABILITY_TYPES.includes(s as UnavailabilityType)),
          (invalidType) => {
            return !isValidUnavailabilityType(invalidType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 20: Utilization Percentage Calculation
  describe('Property 20: Utilization Percentage Calculation', () => {
    it('calculates utilization as (assigned / available) * 100', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          fc.float({ min: 1, max: 100, noNaN: true }),
          (assigned, available) => {
            const utilization = calculateUtilization(assigned, available);
            const expected = (assigned / available) * 100;
            return Math.abs(utilization - expected) < 0.001;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns zero when available hours is zero', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (assigned) => {
            const utilization = calculateUtilization(assigned, 0);
            return utilization === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('flags over-allocation when utilization exceeds 100%', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 101, max: 200, noNaN: true }),
          (percentage) => {
            return isOverAllocated(percentage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not flag over-allocation when utilization is 100% or less', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          (percentage) => {
            return !isOverAllocated(percentage);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 6: Resource Filtering Correctness
  describe('Property 6: Resource Filtering Correctness', () => {
    it('filters by resource type correctly', () => {
      fc.assert(
        fc.property(
          fc.array(resourceGen, { minLength: 1, maxLength: 20 }),
          resourceTypeGen,
          (resources, filterType) => {
            const filtered = filterResources(resources as EngineeringResource[], { resource_type: filterType });
            return filtered.every(r => r.resource_type === filterType);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filters by availability correctly', () => {
      fc.assert(
        fc.property(
          fc.array(resourceGen, { minLength: 1, maxLength: 20 }),
          fc.boolean(),
          (resources, isAvailable) => {
            const filtered = filterResources(resources as EngineeringResource[], { is_available: isAvailable });
            return filtered.every(r => r.is_available === isAvailable);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filters by skills - resource must have ALL required skills', () => {
      fc.assert(
        fc.property(
          fc.array(resourceGen, { minLength: 1, maxLength: 20 }),
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
          (resources, requiredSkills) => {
            const filtered = filterResources(resources as EngineeringResource[], { skills: requiredSkills });
            return filtered.every(r => 
              requiredSkills.every(skill => (r.skills || []).includes(skill))
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 29: Skill-Based Resource Filtering
  describe('Property 29: Skill-Based Resource Filtering', () => {
    it('returns only resources with ALL required skills', () => {
      fc.assert(
        fc.property(
          fc.array(resourceGen, { minLength: 1, maxLength: 20 }),
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
          (resources, requiredSkills) => {
            const filtered = filterResourcesBySkills(resources as EngineeringResource[], requiredSkills);
            return filtered.every(r => 
              requiredSkills.every(skill => (r.skills || []).includes(skill))
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns all resources when no skills required', () => {
      fc.assert(
        fc.property(
          fc.array(resourceGen, { minLength: 1, maxLength: 20 }),
          (resources) => {
            const filtered = filterResourcesBySkills(resources as EngineeringResource[], []);
            return filtered.length === resources.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  // Feature: engineering-resource-scheduling, Property 15: Calendar Filtering
  describe('Property 15: Calendar Filtering', () => {
    it('filters calendar resources by type', () => {
      fc.assert(
        fc.property(
          fc.array(resourceGen, { minLength: 1, maxLength: 20 }),
          fc.array(resourceTypeGen, { minLength: 1, maxLength: 3 }),
          (resources, filterTypes) => {
            const uniqueTypes = [...new Set(filterTypes)];
            const filtered = filterCalendarResources(resources as EngineeringResource[], { resource_types: uniqueTypes });
            return filtered.every(r => uniqueTypes.includes(r.resource_type));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filters calendar resources by skills', () => {
      fc.assert(
        fc.property(
          fc.array(resourceGen, { minLength: 1, maxLength: 20 }),
          fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
          (resources, filterSkills) => {
            const filtered = filterCalendarResources(resources as EngineeringResource[], { skills: filterSkills });
            return filtered.every(r => 
              filterSkills.every(skill => (r.skills || []).includes(skill))
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 13: Calendar Cell Unavailability Type
  describe('Property 13: Calendar Cell Unavailability Type', () => {
    it('includes unavailability type when resource is unavailable', () => {
      fc.assert(
        fc.property(
          resourceGen,
          dateGen,
          unavailabilityTypeGen,
          (resource, date, unavailType) => {
            const unavailability: ResourceAvailability = {
              id: 'unavail-1',
              resource_id: resource.id,
              date,
              is_available: false,
              available_hours: 0,
              unavailability_type: unavailType
            };

            const cell = generateCalendarCell(
              resource as EngineeringResource,
              date,
              [],
              [unavailability]
            );

            return !cell.is_available && cell.unavailability_type === unavailType;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 18: Unavailability Conflict Detection
  describe('Property 18: Unavailability Conflict Detection', () => {
    it('detects assignments affected by unavailability', () => {
      fc.assert(
        fc.property(
          uuidGen,
          safeDateGen,
          (resourceId, date) => {
            const assignment: ResourceAssignment = {
              id: 'assignment-1',
              resource_id: resourceId,
              start_date: date,
              end_date: date,
              status: 'scheduled',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const affected = detectUnavailabilityConflicts(resourceId, [date], [assignment]);
            return affected.length === 1 && affected[0].id === assignment.id;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not detect completed or cancelled assignments', () => {
      fc.assert(
        fc.property(
          uuidGen,
          safeDateGen,
          fc.constantFrom<AssignmentStatus>('completed', 'cancelled'),
          (resourceId, date, status) => {
            const assignment: ResourceAssignment = {
              id: 'assignment-1',
              resource_id: resourceId,
              start_date: date,
              end_date: date,
              status,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const affected = detectUnavailabilityConflicts(resourceId, [date], [assignment]);
            return affected.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 26: Availability Considers Both Sources
  describe('Property 26: Availability Considers Both Sources', () => {
    it('considers both assignments and unavailability records', () => {
      fc.assert(
        fc.property(
          uuidGen,
          safeDateGen,
          fc.float({ min: 1, max: 24, noNaN: true }),
          (resourceId, date, dailyCapacity) => {
            const resource: EngineeringResource = {
              id: resourceId,
              resource_type: 'personnel',
              resource_code: 'TEST-001',
              resource_name: 'Test Resource',
              skills: [],
              certifications: [],
              daily_capacity: dailyCapacity,
              is_available: true,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            // Create an assignment with explicit planned hours
            const assignment: ResourceAssignment = {
              id: 'assignment-1',
              resource_id: resourceId,
              start_date: date,
              end_date: date,
              planned_hours: 4,
              status: 'scheduled',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            const unavailability: ResourceAvailability = {
              id: 'unavail-1',
              resource_id: resourceId,
              date,
              is_available: false,
              available_hours: 0,
              unavailability_type: 'leave'
            };

            // Check availability with unavailability record
            const statusWithUnavail = checkAvailability(
              resourceId,
              date,
              resource,
              [],
              [unavailability]
            );

            // Check availability with assignment (only on working days)
            const dateObj = new Date(date);
            const isWorkingDay = dateObj.getDay() !== 0 && dateObj.getDay() !== 6;
            
            const statusWithAssignment = checkAvailability(
              resourceId,
              date,
              resource,
              [assignment],
              []
            );

            // Unavailability should make resource unavailable
            // Assignment should have assigned hours (on working days)
            const unavailCheck = !statusWithUnavail.is_available;
            const assignmentCheck = isWorkingDay ? statusWithAssignment.assigned_hours > 0 : true;
            
            return unavailCheck && assignmentCheck;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 27: Capacity Exceeded Warning
  describe('Property 27: Capacity Exceeded Warning', () => {
    it('warns when assignment would exceed daily capacity', () => {
      fc.assert(
        fc.property(
          resourceGen,
          dateGen,
          (resource, date) => {
            const res = resource as EngineeringResource;
            const additionalHours = res.daily_capacity + 1;

            const result = detectOverAllocation(
              res.id,
              date,
              additionalHours,
              res,
              [],
              []
            );

            return result.is_over_allocated && result.excess_hours > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not warn when within capacity', () => {
      fc.assert(
        fc.property(
          resourceGen,
          dateGen,
          (resource, date) => {
            const res = resource as EngineeringResource;
            const additionalHours = res.daily_capacity * 0.5;

            const result = detectOverAllocation(
              res.id,
              date,
              additionalHours,
              res,
              [],
              []
            );

            return !result.is_over_allocated;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 28: Skill Data Structure
  describe('Property 28: Skill Data Structure', () => {
    it('validates skill has required fields', () => {
      fc.assert(
        fc.property(
          skillGen,
          (skill) => {
            return validateSkillStructure(skill as ResourceSkill);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('fails validation when skill_code is missing', () => {
      fc.assert(
        fc.property(
          skillGen,
          (skill) => {
            const invalidSkill = { ...skill, skill_code: '' } as ResourceSkill;
            return !validateSkillStructure(invalidSkill);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: engineering-resource-scheduling, Property 30: Certification Expiry Status
  describe('Property 30: Certification Expiry Status', () => {
    it('returns valid for certifications without expiry date', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            issued_date: fc.option(dateGen, { nil: undefined })
          }),
          (cert) => {
            const status = getCertificationStatus(cert as Certification);
            return status === 'valid';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns expired for past expiry dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 31);
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (name) => {
            const cert: Certification = {
              name,
              expiry_date: formatDateString(pastDate)
            };
            const status = getCertificationStatus(cert);
            return status === 'expired';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns expiring_soon for dates within 30 days', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (name) => {
            const cert: Certification = {
              name,
              expiry_date: formatDateString(soonDate)
            };
            const status = getCertificationStatus(cert);
            return status === 'expiring_soon';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns valid for dates more than 30 days away', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (name) => {
            const cert: Certification = {
              name,
              expiry_date: formatDateString(futureDate)
            };
            const status = getCertificationStatus(cert);
            return status === 'valid';
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
