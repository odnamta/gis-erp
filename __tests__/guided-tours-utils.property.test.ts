// =====================================================
// v0.37: GUIDED TOURS UTILS PROPERTY TESTS
// =====================================================
// Feature: guided-tours
// Property tests for guided tours utility functions

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  filterToursByRole,
  sortToursByDisplayOrder,
  isSortedByDisplayOrder,
  getNavigationState,
  calculateNextStepIndex,
  calculatePrevStepIndex,
  getStepAtIndex,
  validateTourData,
  validateStepData,
  validateAllSteps,
  getStartTourStatus,
  getSkipTourStatus,
  getCompleteTourStatus,
  isTourResumable,
  isTourCompleted,
  getResumeStepIndex,
  combineTourWithProgress,
  mapDbRowToTour,
  mapDbRowToProgress,
} from '@/lib/guided-tours-utils';
import {
  GuidedTour,
  GuidedTourRow,
  TourProgress,
  TourProgressRow,
  TourStep,
  TourStepPlacement,
  TourStatus,
} from '@/types/guided-tours';

// Arbitrary generators
const roleArb = fc.constantFrom('owner', 'admin', 'manager', 'finance', 'ops', 'sales');
const placementArb = fc.constantFrom<TourStepPlacement>('top', 'bottom', 'left', 'right');
const statusArb = fc.constantFrom<TourStatus>('not_started', 'in_progress', 'completed', 'skipped');

const isoDateArb = fc.constantFrom(
  '2024-01-15T10:30:00.000Z',
  '2024-06-20T14:45:00.000Z',
  '2025-03-10T08:00:00.000Z',
  '2025-12-01T16:30:00.000Z'
);

const tourStepArb: fc.Arbitrary<TourStep> = fc.record({
  target: fc.string({ minLength: 1, maxLength: 100 }),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  placement: placementArb,
  action: fc.option(fc.constantFrom('click', 'input', 'wait'), { nil: undefined }),
  nextRoute: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
});

const guidedTourArb: fc.Arbitrary<GuidedTour> = fc.record({
  id: fc.uuid(),
  tourCode: fc.string({ minLength: 1, maxLength: 50 }),
  tourName: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string(), { nil: null }),
  applicableRoles: fc.array(roleArb, { minLength: 0, maxLength: 6 }),
  startRoute: fc.string({ minLength: 1, maxLength: 200 }),
  steps: fc.array(tourStepArb, { minLength: 1, maxLength: 10 }),
  estimatedMinutes: fc.integer({ min: 1, max: 30 }),
  isActive: fc.boolean(),
  displayOrder: fc.integer({ min: 0, max: 100 }),
  createdAt: isoDateArb,
});

const tourProgressArb: fc.Arbitrary<TourProgress> = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  tourId: fc.uuid(),
  status: statusArb,
  currentStep: fc.integer({ min: 0, max: 20 }),
  startedAt: fc.option(isoDateArb, { nil: null }),
  completedAt: fc.option(isoDateArb, { nil: null }),
});

const guidedTourRowArb: fc.Arbitrary<GuidedTourRow> = fc.record({
  id: fc.uuid(),
  tour_code: fc.string({ minLength: 1, maxLength: 50 }),
  tour_name: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string(), { nil: null }),
  applicable_roles: fc.array(roleArb, { minLength: 0, maxLength: 6 }),
  start_route: fc.string({ minLength: 1, maxLength: 200 }),
  steps: fc.array(tourStepArb, { minLength: 1, maxLength: 10 }),
  estimated_minutes: fc.integer({ min: 1, max: 30 }),
  is_active: fc.boolean(),
  display_order: fc.integer({ min: 0, max: 100 }),
  created_at: isoDateArb,
});

const tourProgressRowArb: fc.Arbitrary<TourProgressRow> = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  tour_id: fc.uuid(),
  status: statusArb,
  current_step: fc.integer({ min: 0, max: 20 }),
  started_at: fc.option(isoDateArb, { nil: null }),
  completed_at: fc.option(isoDateArb, { nil: null }),
});

describe('Guided Tours Utils Property Tests', () => {
  /**
   * Property 1: Role-Based Tour Filtering
   * For any user with a given role and any list of tours, every tour in the list
   * SHALL either have the user's role in its applicable_roles array OR have an
   * empty applicable_roles array, AND no tour SHALL have is_active=false.
   * Validates: Requirements 3.1, 7.1, 7.2, 7.3
   */
  describe('Property 1: Role-Based Tour Filtering', () => {
    it('should include tour if role is in applicable_roles or roles is empty', () => {
      fc.assert(
        fc.property(
          fc.array(guidedTourArb, { minLength: 0, maxLength: 20 }),
          roleArb,
          (tours, role) => {
            const filtered = filterToursByRole(tours, role);
            
            // Every filtered tour should have the role OR empty applicable_roles
            for (const tour of filtered) {
              const hasRole = tour.applicableRoles.includes(role);
              const hasEmptyRoles = tour.applicableRoles.length === 0;
              expect(hasRole || hasEmptyRoles).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should exclude inactive tours', () => {
      fc.assert(
        fc.property(
          fc.array(guidedTourArb, { minLength: 0, maxLength: 20 }),
          roleArb,
          (tours, role) => {
            const filtered = filterToursByRole(tours, role);
            
            // No filtered tour should be inactive
            for (const tour of filtered) {
              expect(tour.isActive).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include all matching active tours', () => {
      fc.assert(
        fc.property(
          fc.array(guidedTourArb, { minLength: 0, maxLength: 20 }),
          roleArb,
          (tours, role) => {
            const filtered = filterToursByRole(tours, role);
            
            // Every active tour with matching role should be included
            for (const tour of tours) {
              if (tour.isActive) {
                const hasRole = tour.applicableRoles.includes(role);
                const hasEmptyRoles = tour.applicableRoles.length === 0;
                if (hasRole || hasEmptyRoles) {
                  expect(filtered).toContainEqual(tour);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Tour Ordering Consistency
   * For any list of tours returned, the tours SHALL be sorted in ascending
   * order by their display_order field.
   * Validates: Requirements 3.6
   */
  describe('Property 2: Tour Ordering Consistency', () => {
    it('should sort tours by display_order ascending', () => {
      fc.assert(
        fc.property(
          fc.array(guidedTourArb, { minLength: 0, maxLength: 20 }),
          (tours) => {
            const sorted = sortToursByDisplayOrder(tours);
            
            // Verify sorted order
            for (let i = 1; i < sorted.length; i++) {
              expect(sorted[i].displayOrder).toBeGreaterThanOrEqual(sorted[i - 1].displayOrder);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify sorted arrays', () => {
      fc.assert(
        fc.property(
          fc.array(guidedTourArb, { minLength: 0, maxLength: 20 }),
          (tours) => {
            const sorted = sortToursByDisplayOrder(tours);
            expect(isSortedByDisplayOrder(sorted)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all tours after sorting', () => {
      fc.assert(
        fc.property(
          fc.array(guidedTourArb, { minLength: 0, maxLength: 20 }),
          (tours) => {
            const sorted = sortToursByDisplayOrder(tours);
            expect(sorted.length).toBe(tours.length);
            
            // All original tours should be in sorted array
            for (const tour of tours) {
              expect(sorted).toContainEqual(tour);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Tour Data Completeness
   * For any TourWithProgress object, the tour SHALL contain non-null values for:
   * tourName, startRoute, and steps array, AND each step SHALL contain non-null
   * values for: target, title, content, and placement.
   * Validates: Requirements 3.2, 4.3
   */
  describe('Property 3: Tour Data Completeness', () => {
    it('should validate tour has required fields', () => {
      fc.assert(
        fc.property(
          guidedTourArb,
          (tour) => {
            const result = validateTourData(tour);
            
            // If tour has all required fields, should be valid
            if (tour.tourName && tour.startRoute && Array.isArray(tour.steps)) {
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate step has required fields', () => {
      fc.assert(
        fc.property(
          tourStepArb,
          (step) => {
            const result = validateStepData(step);
            
            // If step has all required fields, should be valid
            if (step.target && step.title && step.content && step.placement) {
              expect(result.valid).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate all steps in a tour', () => {
      fc.assert(
        fc.property(
          guidedTourArb,
          (tour) => {
            const allValid = validateAllSteps(tour);
            
            // Should match individual step validations
            const expectedValid = tour.steps.every(step => validateStepData(step).valid);
            expect(allValid).toBe(expectedValid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 4: Navigation Button Visibility Rules
   * For any active tour step at index N in a tour with T total steps:
   * - Back button visible if N > 0
   * - Skip button always visible
   * - Next button visible if N < T-1
   * - Finish button visible if N = T-1
   * Validates: Requirements 4.4
   */
  describe('Property 4: Navigation Button Visibility Rules', () => {
    it('should show back button only when not on first step', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (stepIndex, totalSteps) => {
            // Ensure stepIndex is valid
            const validStepIndex = Math.min(stepIndex, totalSteps - 1);
            const nav = getNavigationState(validStepIndex, totalSteps);
            
            expect(nav.showBack).toBe(validStepIndex > 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always show skip button', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (stepIndex, totalSteps) => {
            const validStepIndex = Math.min(stepIndex, totalSteps - 1);
            const nav = getNavigationState(validStepIndex, totalSteps);
            
            expect(nav.showSkip).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show next button only when not on last step', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (stepIndex, totalSteps) => {
            const validStepIndex = Math.min(stepIndex, totalSteps - 1);
            const nav = getNavigationState(validStepIndex, totalSteps);
            
            expect(nav.showNext).toBe(validStepIndex < totalSteps - 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should show finish button only on last step', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (stepIndex, totalSteps) => {
            const validStepIndex = Math.min(stepIndex, totalSteps - 1);
            const nav = getNavigationState(validStepIndex, totalSteps);
            
            expect(nav.showFinish).toBe(validStepIndex === totalSteps - 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have mutually exclusive next and finish buttons', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 20 }),
          fc.integer({ min: 1, max: 20 }),
          (stepIndex, totalSteps) => {
            const validStepIndex = Math.min(stepIndex, totalSteps - 1);
            const nav = getNavigationState(validStepIndex, totalSteps);
            
            // Next and Finish should never both be true
            expect(nav.showNext && nav.showFinish).toBe(false);
            // One of them should always be true
            expect(nav.showNext || nav.showFinish).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Step Advancement Increments Progress
   * For any tour with progress at step N (where N < total_steps - 1),
   * calling advanceTourStep SHALL result in current_step being N+1.
   * Validates: Requirements 5.1, 6.2
   */
  describe('Property 5: Step Advancement Increments Progress', () => {
    it('should increment step index by 1 when not at last step', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 18 }),
          fc.integer({ min: 2, max: 20 }),
          (currentStep, totalSteps) => {
            // Ensure currentStep is not the last step
            const validCurrentStep = Math.min(currentStep, totalSteps - 2);
            const nextIndex = calculateNextStepIndex(validCurrentStep, totalSteps);
            
            expect(nextIndex).toBe(validCurrentStep + 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null when at last step', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (totalSteps) => {
            const lastStepIndex = totalSteps - 1;
            const nextIndex = calculateNextStepIndex(lastStepIndex, totalSteps);
            
            expect(nextIndex).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Step Back Decrements Progress
   * For any tour with progress at step N (where N > 0),
   * calling goBackTourStep SHALL result in current_step being N-1.
   * Validates: Requirements 5.2
   */
  describe('Property 6: Step Back Decrements Progress', () => {
    it('should decrement step index by 1 when not at first step', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (currentStep) => {
            const prevIndex = calculatePrevStepIndex(currentStep);
            
            expect(prevIndex).toBe(currentStep - 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null when at first step', () => {
      const prevIndex = calculatePrevStepIndex(0);
      expect(prevIndex).toBeNull();
    });
  });

  /**
   * Property 7: Status Transitions
   * - Starting a tour SHALL set status to 'in_progress'
   * - Skipping a tour SHALL set status to 'skipped'
   * - Completing the final step SHALL set status to 'completed'
   * Validates: Requirements 5.3, 5.4, 6.1
   */
  describe('Property 7: Status Transitions', () => {
    it('should return in_progress status when starting', () => {
      expect(getStartTourStatus()).toBe('in_progress');
    });

    it('should return skipped status when skipping', () => {
      expect(getSkipTourStatus()).toBe('skipped');
    });

    it('should return completed status when completing', () => {
      expect(getCompleteTourStatus()).toBe('completed');
    });

    it('should correctly identify resumable tours', () => {
      fc.assert(
        fc.property(
          tourProgressArb,
          (progress) => {
            const resumable = isTourResumable(progress);
            expect(resumable).toBe(progress.status === 'in_progress');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify completed tours', () => {
      fc.assert(
        fc.property(
          tourProgressArb,
          (progress) => {
            const completed = isTourCompleted(progress);
            expect(completed).toBe(progress.status === 'completed');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Resume From Saved Step
   * For any tour with status 'in_progress' and current_step = N,
   * when a user continues the tour, the system SHALL start from step N.
   * Validates: Requirements 6.4
   */
  describe('Property 8: Resume From Saved Step', () => {
    it('should resume from saved step for in_progress tours', () => {
      fc.assert(
        fc.property(
          tourProgressArb.filter(p => p.status === 'in_progress'),
          (progress) => {
            const resumeIndex = getResumeStepIndex(progress);
            expect(resumeIndex).toBe(progress.currentStep);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for non-in_progress tours', () => {
      fc.assert(
        fc.property(
          tourProgressArb.filter(p => p.status !== 'in_progress'),
          (progress) => {
            const resumeIndex = getResumeStepIndex(progress);
            expect(resumeIndex).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for null progress', () => {
      const resumeIndex = getResumeStepIndex(null);
      expect(resumeIndex).toBe(0);
    });
  });

  /**
   * Additional Property Tests: Data Transformation
   */
  describe('Data Transformation', () => {
    it('should correctly map DB row to tour', () => {
      fc.assert(
        fc.property(
          guidedTourRowArb,
          (row) => {
            const tour = mapDbRowToTour(row);
            
            expect(tour.id).toBe(row.id);
            expect(tour.tourCode).toBe(row.tour_code);
            expect(tour.tourName).toBe(row.tour_name);
            expect(tour.description).toBe(row.description);
            expect(tour.applicableRoles).toEqual(row.applicable_roles);
            expect(tour.startRoute).toBe(row.start_route);
            expect(tour.steps).toEqual(row.steps);
            expect(tour.estimatedMinutes).toBe(row.estimated_minutes);
            expect(tour.isActive).toBe(row.is_active);
            expect(tour.displayOrder).toBe(row.display_order);
            expect(tour.createdAt).toBe(row.created_at);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly map DB row to progress', () => {
      fc.assert(
        fc.property(
          tourProgressRowArb,
          (row) => {
            const progress = mapDbRowToProgress(row);
            
            expect(progress.id).toBe(row.id);
            expect(progress.userId).toBe(row.user_id);
            expect(progress.tourId).toBe(row.tour_id);
            expect(progress.status).toBe(row.status);
            expect(progress.currentStep).toBe(row.current_step);
            expect(progress.startedAt).toBe(row.started_at);
            expect(progress.completedAt).toBe(row.completed_at);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property Tests: Combine Tours with Progress
   */
  describe('Combine Tours with Progress', () => {
    it('should match progress to correct tour', () => {
      fc.assert(
        fc.property(
          fc.array(guidedTourArb, { minLength: 1, maxLength: 10 }),
          (tours) => {
            // Create progress for some tours
            const progressRecords: TourProgress[] = tours.slice(0, Math.ceil(tours.length / 2)).map(tour => ({
              id: 'progress-' + tour.id,
              userId: 'user-1',
              tourId: tour.id,
              status: 'in_progress' as TourStatus,
              currentStep: 1,
              startedAt: '2024-01-15T10:30:00.000Z',
              completedAt: null,
            }));

            const combined = combineTourWithProgress(tours, progressRecords);
            
            expect(combined.length).toBe(tours.length);
            
            for (const item of combined) {
              if (item.progress) {
                expect(item.progress.tourId).toBe(item.tour.id);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
