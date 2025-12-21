/**
 * Guided Tours Utility Functions
 * v0.37: Training Mode / Guided Tours
 */

import {
  GuidedTour,
  GuidedTourRow,
  TourProgress,
  TourProgressRow,
  TourWithProgress,
  TourStep,
  TourNavigationState,
  AdvanceStepResult,
  TourStatus,
} from '@/types/guided-tours';

// =====================================================
// Data Transformation Functions
// =====================================================

/**
 * Transform database row to GuidedTour interface
 */
export function mapDbRowToTour(row: GuidedTourRow): GuidedTour {
  return {
    id: row.id,
    tourCode: row.tour_code,
    tourName: row.tour_name,
    description: row.description,
    applicableRoles: row.applicable_roles || [],
    startRoute: row.start_route,
    steps: row.steps || [],
    estimatedMinutes: row.estimated_minutes,
    isActive: row.is_active,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

/**
 * Transform database row to TourProgress interface
 */
export function mapDbRowToProgress(row: TourProgressRow): TourProgress {
  return {
    id: row.id,
    userId: row.user_id,
    tourId: row.tour_id,
    status: row.status,
    currentStep: row.current_step,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

// =====================================================
// Role-Based Filtering Functions
// =====================================================

/**
 * Filter tours based on user role
 * A tour is included if:
 * - The user's role is in the tour's applicable_roles array, OR
 * - The tour's applicable_roles array is empty (available to all)
 * AND the tour is active
 */
export function filterToursByRole(
  tours: GuidedTour[],
  userRole: string
): GuidedTour[] {
  return tours.filter(tour => {
    // Must be active
    if (!tour.isActive) return false;
    
    // Empty applicable_roles means available to all
    if (tour.applicableRoles.length === 0) return true;
    
    // Check if user's role is in applicable_roles
    return tour.applicableRoles.includes(userRole);
  });
}

/**
 * Sort tours by display order
 */
export function sortToursByDisplayOrder(tours: GuidedTour[]): GuidedTour[] {
  return [...tours].sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Check if tours are sorted by display order
 */
export function isSortedByDisplayOrder(tours: GuidedTour[]): boolean {
  for (let i = 1; i < tours.length; i++) {
    if (tours[i].displayOrder < tours[i - 1].displayOrder) {
      return false;
    }
  }
  return true;
}

// =====================================================
// Navigation State Functions
// =====================================================

/**
 * Get navigation button visibility state
 * - Back: visible if not on first step
 * - Next: visible if not on last step
 * - Finish: visible only on last step
 * - Skip: always visible
 */
export function getNavigationState(
  stepIndex: number,
  totalSteps: number
): TourNavigationState {
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  return {
    showBack: !isFirstStep,
    showNext: !isLastStep,
    showFinish: isLastStep,
    showSkip: true,
  };
}

// =====================================================
// Step Navigation Functions
// =====================================================

/**
 * Calculate next step index after advancing
 * Returns null if already at last step (tour complete)
 */
export function calculateNextStepIndex(
  currentStep: number,
  totalSteps: number
): number | null {
  const nextStep = currentStep + 1;
  if (nextStep >= totalSteps) {
    return null; // Tour complete
  }
  return nextStep;
}

/**
 * Calculate previous step index after going back
 * Returns null if already at first step
 */
export function calculatePrevStepIndex(currentStep: number): number | null {
  if (currentStep <= 0) {
    return null; // Already at first step
  }
  return currentStep - 1;
}

/**
 * Get step at index from tour
 */
export function getStepAtIndex(
  tour: GuidedTour,
  index: number
): TourStep | null {
  if (index < 0 || index >= tour.steps.length) {
    return null;
  }
  return tour.steps[index];
}

// =====================================================
// Tour Data Validation Functions
// =====================================================

/**
 * Validate that a tour has all required fields
 */
export function validateTourData(tour: GuidedTour): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!tour.tourName) {
    errors.push('Tour name is required');
  }
  if (!tour.startRoute) {
    errors.push('Start route is required');
  }
  if (!Array.isArray(tour.steps)) {
    errors.push('Steps must be an array');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that a tour step has all required fields
 */
export function validateStepData(step: TourStep): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!step.target) {
    errors.push('Step target is required');
  }
  if (!step.title) {
    errors.push('Step title is required');
  }
  if (!step.content) {
    errors.push('Step content is required');
  }
  if (!step.placement) {
    errors.push('Step placement is required');
  }
  if (step.placement && !['top', 'bottom', 'left', 'right'].includes(step.placement)) {
    errors.push('Step placement must be top, bottom, left, or right');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if all steps in a tour are valid
 */
export function validateAllSteps(tour: GuidedTour): boolean {
  return tour.steps.every(step => validateStepData(step).valid);
}

// =====================================================
// Progress Status Functions
// =====================================================

/**
 * Determine the new status after starting a tour
 */
export function getStartTourStatus(): TourStatus {
  return 'in_progress';
}

/**
 * Determine the new status after skipping a tour
 */
export function getSkipTourStatus(): TourStatus {
  return 'skipped';
}

/**
 * Determine the new status after completing a tour
 */
export function getCompleteTourStatus(): TourStatus {
  return 'completed';
}

/**
 * Check if a tour is resumable (in_progress status)
 */
export function isTourResumable(progress: TourProgress | null): boolean {
  return progress?.status === 'in_progress';
}

/**
 * Check if a tour is completed
 */
export function isTourCompleted(progress: TourProgress | null): boolean {
  return progress?.status === 'completed';
}

/**
 * Get the step index to resume from
 * Returns 0 if no progress or not in_progress
 */
export function getResumeStepIndex(progress: TourProgress | null): number {
  if (!progress || progress.status !== 'in_progress') {
    return 0;
  }
  return progress.currentStep;
}

// =====================================================
// Display Helper Functions
// =====================================================

/**
 * Format estimated duration for display
 */
export function formatEstimatedDuration(minutes: number): string {
  return `~${minutes} min`;
}

/**
 * Get status display info
 */
export function getTourStatusDisplay(status: TourStatus | null): {
  icon: string;
  label: string;
  className: string;
} {
  switch (status) {
    case 'completed':
      return { icon: '✅', label: 'Completed', className: 'text-green-600' };
    case 'in_progress':
      return { icon: '🔄', label: 'In Progress', className: 'text-blue-600' };
    case 'skipped':
      return { icon: '⏭️', label: 'Skipped', className: 'text-gray-400' };
    case 'not_started':
    default:
      return { icon: '○', label: 'Not Started', className: 'text-gray-500' };
  }
}

/**
 * Get progress text for in-progress tours
 */
export function getProgressText(currentStep: number, totalSteps: number): string {
  return `Step ${currentStep + 1} of ${totalSteps}`;
}

// =====================================================
// Combine Tours with Progress
// =====================================================

/**
 * Combine tours with their progress records
 */
export function combineTourWithProgress(
  tours: GuidedTour[],
  progressRecords: TourProgress[]
): TourWithProgress[] {
  const progressMap = new Map(
    progressRecords.map(p => [p.tourId, p])
  );

  return tours.map(tour => ({
    tour,
    progress: progressMap.get(tour.id) || null,
  }));
}
