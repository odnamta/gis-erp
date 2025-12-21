// =====================================================
// v0.36: ONBOARDING UTILS PROPERTY TESTS
// =====================================================
// Feature: onboarding-checklist
// Property tests for onboarding utility functions

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  filterStepsByRole,
  calculatePercentComplete,
  calculateTotalPoints,
  groupStepsByCategory,
  getNextSteps,
  validateCompletionType,
  shouldAutoCompleteOnRoute,
  shouldIncrementCount,
  shouldCompleteCountStep,
} from '@/lib/onboarding-utils';
import {
  OnboardingStep,
  OnboardingProgressWithStep,
  OnboardingCategory,
  CompletionType,
  ProgressStatus,
  ONBOARDING_CATEGORIES,
  COMPLETION_TYPES,
} from '@/types/onboarding';

// Arbitrary generators
const roleArb = fc.constantFrom('owner', 'admin', 'manager', 'finance', 'ops', 'sales');
const categoryArb = fc.constantFrom<OnboardingCategory>('profile', 'explore', 'first_action', 'advanced');
const completionTypeArb = fc.constantFrom<CompletionType>('manual', 'auto_route', 'auto_action', 'auto_count');
const statusArb = fc.constantFrom<ProgressStatus>('pending', 'in_progress', 'completed', 'skipped');

// Use constant ISO date strings to avoid date generation issues
const isoDateArb = fc.constantFrom(
  '2024-01-15T10:30:00.000Z',
  '2024-06-20T14:45:00.000Z',
  '2025-03-10T08:00:00.000Z',
  '2025-12-01T16:30:00.000Z'
);

const onboardingStepArb: fc.Arbitrary<OnboardingStep> = fc.record({
  id: fc.uuid(),
  step_code: fc.string({ minLength: 1, maxLength: 50 }),
  step_name: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string(), { nil: null }),
  category: categoryArb,
  step_order: fc.integer({ min: 1, max: 100 }),
  applicable_roles: fc.array(roleArb, { minLength: 0, maxLength: 6 }),
  completion_type: completionTypeArb,
  completion_route: fc.option(fc.string({ minLength: 1 }), { nil: null }),
  completion_action: fc.option(fc.string(), { nil: null }),
  completion_count: fc.integer({ min: 1, max: 10 }),
  completion_table: fc.option(fc.string({ minLength: 1 }), { nil: null }),
  icon: fc.option(fc.string(), { nil: null }),
  action_label: fc.option(fc.string(), { nil: null }),
  action_route: fc.option(fc.string(), { nil: null }),
  points: fc.integer({ min: 0, max: 100 }),
  badge_on_complete: fc.option(fc.string(), { nil: null }),
  is_required: fc.boolean(),
  is_active: fc.boolean(),
  created_at: isoDateArb,
});

const progressWithStepArb: fc.Arbitrary<OnboardingProgressWithStep> = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  step_id: fc.uuid(),
  status: statusArb,
  started_at: fc.option(isoDateArb, { nil: null }),
  completed_at: fc.option(isoDateArb, { nil: null }),
  current_count: fc.integer({ min: 0, max: 10 }),
  created_at: isoDateArb,
  step: onboardingStepArb,
});

describe('Onboarding Utils Property Tests', () => {
  /**
   * Property 1: Role-Based Step Filtering
   * For any user role and for any onboarding step, the step should be included
   * if and only if the user's role is in the step's applicable_roles array
   * Validates: Requirements 1.2, 10.1, 10.5
   */
  describe('Property 1: Role-Based Step Filtering', () => {
    it('should include step if role is in applicable_roles', () => {
      fc.assert(
        fc.property(
          fc.array(onboardingStepArb, { minLength: 0, maxLength: 20 }),
          roleArb,
          (steps, role) => {
            const filtered = filterStepsByRole(steps, role);
            
            // Every filtered step should have the role in applicable_roles or have '*'
            for (const step of filtered) {
              expect(
                step.applicable_roles.includes(role) || 
                step.applicable_roles.includes('*')
              ).toBe(true);
            }
            
            // Every step with the role should be in filtered
            for (const step of steps) {
              if (step.applicable_roles.includes(role) || step.applicable_roles.includes('*')) {
                expect(filtered).toContainEqual(step);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude steps where role is not in applicable_roles', () => {
      fc.assert(
        fc.property(
          fc.array(onboardingStepArb, { minLength: 0, maxLength: 20 }),
          roleArb,
          (steps, role) => {
            const filtered = filterStepsByRole(steps, role);
            const excluded = steps.filter(s => !filtered.includes(s));
            
            // Every excluded step should NOT have the role
            for (const step of excluded) {
              expect(step.applicable_roles.includes(role)).toBe(false);
              expect(step.applicable_roles.includes('*')).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Completion Type Validation
   * For any step with completion_type 'auto_route', it must have completion_route
   * For any step with completion_type 'auto_count', it must have completion_table and completion_count >= 1
   * Validates: Requirements 1.3, 1.4, 1.5
   */
  describe('Property 2: Completion Type Validation', () => {
    it('should validate auto_route steps require completion_route', () => {
      fc.assert(
        fc.property(
          onboardingStepArb,
          (step) => {
            const result = validateCompletionType(step);
            
            if (step.completion_type === 'auto_route' && !step.completion_route) {
              expect(result.valid).toBe(false);
              expect(result.errors).toContain('auto_route steps require completion_route');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate auto_count steps require completion_table', () => {
      fc.assert(
        fc.property(
          onboardingStepArb,
          (step) => {
            const result = validateCompletionType(step);
            
            if (step.completion_type === 'auto_count' && !step.completion_table) {
              expect(result.valid).toBe(false);
              expect(result.errors).toContain('auto_count steps require completion_table');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate completion_type is one of valid types', () => {
      fc.assert(
        fc.property(
          onboardingStepArb,
          (step) => {
            const result = validateCompletionType(step);
            
            if (COMPLETION_TYPES.includes(step.completion_type)) {
              // Valid type - may still have other errors
            } else {
              expect(result.valid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 9: Summary Consistency
   * percent_complete should equal Math.round((completed / total) * 100)
   * Validates: Requirements 2.5, 9.2
   */
  describe('Property 9: Summary Consistency', () => {
    it('should calculate percentage correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (completed, total) => {
            const percent = calculatePercentComplete(completed, total);
            
            if (total === 0) {
              expect(percent).toBe(0);
            } else {
              const expected = Math.round((completed / total) * 100);
              expect(percent).toBe(expected);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate total points from completed steps only', () => {
      fc.assert(
        fc.property(
          fc.array(progressWithStepArb, { minLength: 0, maxLength: 20 }),
          (progress) => {
            const totalPoints = calculateTotalPoints(progress);
            
            const expectedPoints = progress
              .filter(p => p.status === 'completed')
              .reduce((sum, p) => sum + (p.step?.points || 0), 0);
            
            expect(totalPoints).toBe(expectedPoints);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Category Grouping
   * Each step should appear in exactly one category group matching its category field
   * Validates: Requirements 7.1
   */
  describe('Property 10: Category Grouping', () => {
    it('should group steps by category correctly', () => {
      fc.assert(
        fc.property(
          fc.array(progressWithStepArb, { minLength: 0, maxLength: 20 }),
          (progress) => {
            const grouped = groupStepsByCategory(progress);
            
            // Each step should appear in exactly one category
            for (const p of progress) {
              const category = p.step?.category;
              if (category && ONBOARDING_CATEGORIES.includes(category)) {
                expect(grouped[category]).toContainEqual(p);
                
                // Should not appear in other categories
                for (const otherCat of ONBOARDING_CATEGORIES) {
                  if (otherCat !== category) {
                    expect(grouped[otherCat]).not.toContainEqual(p);
                  }
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sort steps within each category by step_order', () => {
      fc.assert(
        fc.property(
          fc.array(progressWithStepArb, { minLength: 0, maxLength: 20 }),
          (progress) => {
            const grouped = groupStepsByCategory(progress);
            
            for (const category of ONBOARDING_CATEGORIES) {
              const categorySteps = grouped[category];
              for (let i = 1; i < categorySteps.length; i++) {
                const prevOrder = categorySteps[i - 1].step?.step_order || 0;
                const currOrder = categorySteps[i].step?.step_order || 0;
                expect(prevOrder).toBeLessThanOrEqual(currOrder);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 11: Next Steps Selection
   * Next steps should be the first N pending/in_progress steps ordered by step_order
   * Validates: Requirements 6.3
   */
  describe('Property 11: Next Steps Selection', () => {
    it('should return only pending or in_progress steps', () => {
      fc.assert(
        fc.property(
          fc.array(progressWithStepArb, { minLength: 0, maxLength: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (progress, limit) => {
            const nextSteps = getNextSteps(progress, limit);
            
            for (const step of nextSteps) {
              expect(['pending', 'in_progress']).toContain(step.status);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect the limit parameter', () => {
      fc.assert(
        fc.property(
          fc.array(progressWithStepArb, { minLength: 0, maxLength: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (progress, limit) => {
            const nextSteps = getNextSteps(progress, limit);
            expect(nextSteps.length).toBeLessThanOrEqual(limit);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should order by step_order', () => {
      fc.assert(
        fc.property(
          fc.array(progressWithStepArb, { minLength: 0, maxLength: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (progress, limit) => {
            const nextSteps = getNextSteps(progress, limit);
            
            for (let i = 1; i < nextSteps.length; i++) {
              const prevOrder = nextSteps[i - 1].step?.step_order || 0;
              const currOrder = nextSteps[i].step?.step_order || 0;
              expect(prevOrder).toBeLessThanOrEqual(currOrder);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Route-Based Auto-Completion
   * Steps with auto_route type and matching route should auto-complete
   * Validates: Requirements 4.1, 4.2, 4.3
   */
  describe('Property 5: Route-Based Auto-Completion', () => {
    it('should only match auto_route completion type', () => {
      fc.assert(
        fc.property(
          onboardingStepArb,
          fc.string({ minLength: 1 }),
          (step, route) => {
            const shouldComplete = shouldAutoCompleteOnRoute(step, route);
            
            if (step.completion_type !== 'auto_route') {
              expect(shouldComplete).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should match when routes are equal (normalized)', () => {
      fc.assert(
        fc.property(
          onboardingStepArb.filter(s => s.completion_type === 'auto_route' && s.completion_route !== null),
          (step) => {
            if (step.completion_route) {
              const shouldComplete = shouldAutoCompleteOnRoute(step, step.completion_route);
              expect(shouldComplete).toBe(true);
              
              // Also test with trailing slash (normalize first to avoid double slashes)
              const normalizedRoute = step.completion_route.replace(/\/+$/, '');
              const withSlash = normalizedRoute + '/';
              const shouldCompleteWithSlash = shouldAutoCompleteOnRoute(step, withSlash);
              expect(shouldCompleteWithSlash).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Count-Based Completion
   * Steps with auto_count type should increment on create actions only
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4
   */
  describe('Property 6: Count-Based Completion', () => {
    it('should only track create actions', () => {
      fc.assert(
        fc.property(
          onboardingStepArb,
          fc.string({ minLength: 1 }),
          fc.constantFrom<'create' | 'update' | 'delete'>('create', 'update', 'delete'),
          (step, table, action) => {
            const shouldIncrement = shouldIncrementCount(step, table, action);
            
            if (action !== 'create') {
              expect(shouldIncrement).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should complete when count reaches target', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 1, max: 10 }),
          (currentCount, completionCount) => {
            const shouldComplete = shouldCompleteCountStep(currentCount, completionCount);
            expect(shouldComplete).toBe(currentCount >= completionCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
