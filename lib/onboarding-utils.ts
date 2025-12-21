// =====================================================
// v0.36: ONBOARDING CHECKLIST UTILITY FUNCTIONS
// =====================================================

import {
  OnboardingStep,
  OnboardingProgressWithStep,
  OnboardingCategory,
  ONBOARDING_CATEGORIES,
  COMPLETION_TYPES,
} from '@/types/onboarding';

/**
 * Filter onboarding steps based on user role
 * A step is included if the user's role is in the step's applicable_roles array
 */
export function filterStepsByRole(
  steps: OnboardingStep[],
  userRole: string
): OnboardingStep[] {
  return steps.filter(step => 
    step.applicable_roles.includes(userRole) || 
    step.applicable_roles.includes('*')
  );
}

/**
 * Calculate completion percentage
 * Returns 0 if total is 0 to avoid division by zero
 */
export function calculatePercentComplete(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Calculate total points from completed steps
 */
export function calculateTotalPoints(
  progress: OnboardingProgressWithStep[]
): number {
  return progress
    .filter(p => p.status === 'completed')
    .reduce((total, p) => total + (p.step?.points || 0), 0);
}

/**
 * Group steps by category
 * Returns a record with each category as key and array of steps as value
 */
export function groupStepsByCategory(
  progress: OnboardingProgressWithStep[]
): Record<OnboardingCategory, OnboardingProgressWithStep[]> {
  const grouped: Record<OnboardingCategory, OnboardingProgressWithStep[]> = {
    profile: [],
    explore: [],
    first_action: [],
    advanced: [],
  };

  for (const p of progress) {
    const category = p.step?.category;
    if (category && ONBOARDING_CATEGORIES.includes(category)) {
      grouped[category].push(p);
    }
  }

  // Sort each category by step_order
  for (const category of ONBOARDING_CATEGORIES) {
    grouped[category].sort((a, b) => 
      (a.step?.step_order || 0) - (b.step?.step_order || 0)
    );
  }

  return grouped;
}

/**
 * Get next N pending steps ordered by step_order
 */
export function getNextSteps(
  progress: OnboardingProgressWithStep[],
  limit: number = 3
): OnboardingProgressWithStep[] {
  return progress
    .filter(p => p.status === 'pending' || p.status === 'in_progress')
    .sort((a, b) => (a.step?.step_order || 0) - (b.step?.step_order || 0))
    .slice(0, limit);
}

/**
 * Validate that a step has required fields for its completion type
 */
export function validateCompletionType(step: OnboardingStep): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!COMPLETION_TYPES.includes(step.completion_type)) {
    errors.push(`Invalid completion_type: ${step.completion_type}`);
    return { valid: false, errors };
  }

  switch (step.completion_type) {
    case 'auto_route':
      if (!step.completion_route) {
        errors.push('auto_route steps require completion_route');
      }
      break;
    case 'auto_count':
      if (!step.completion_table) {
        errors.push('auto_count steps require completion_table');
      }
      if (step.completion_count < 1) {
        errors.push('auto_count steps require completion_count >= 1');
      }
      break;
    case 'auto_action':
      if (!step.completion_action && !step.completion_route) {
        // auto_action can use either action or route
      }
      break;
    case 'manual':
      // No additional requirements
      break;
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Check if a category is fully completed
 */
export function isCategoryComplete(
  progress: OnboardingProgressWithStep[],
  category: OnboardingCategory
): boolean {
  const categorySteps = progress.filter(p => p.step?.category === category);
  if (categorySteps.length === 0) return true;
  return categorySteps.every(p => p.status === 'completed' || p.status === 'skipped');
}

/**
 * Get category completion stats
 */
export function getCategoryStats(
  progress: OnboardingProgressWithStep[],
  category: OnboardingCategory
): { completed: number; total: number } {
  const categorySteps = progress.filter(p => p.step?.category === category);
  const completed = categorySteps.filter(p => p.status === 'completed').length;
  return { completed, total: categorySteps.length };
}

/**
 * Check if step should auto-complete based on route
 */
export function shouldAutoCompleteOnRoute(
  step: OnboardingStep,
  currentRoute: string
): boolean {
  if (step.completion_type !== 'auto_route') return false;
  if (!step.completion_route) return false;
  
  // Normalize routes for comparison
  const normalizedStepRoute = step.completion_route.replace(/\/$/, '');
  const normalizedCurrentRoute = currentRoute.replace(/\/$/, '');
  
  return normalizedStepRoute === normalizedCurrentRoute;
}

/**
 * Check if step should increment count based on table action
 */
export function shouldIncrementCount(
  step: OnboardingStep,
  table: string,
  action: 'create' | 'update' | 'delete'
): boolean {
  if (step.completion_type !== 'auto_count') return false;
  if (action !== 'create') return false;
  if (!step.completion_table) return false;
  
  return step.completion_table === table;
}

/**
 * Check if count-based step should be marked complete
 */
export function shouldCompleteCountStep(
  currentCount: number,
  completionCount: number
): boolean {
  return currentCount >= completionCount;
}

/**
 * Format points display
 */
export function formatPoints(points: number): string {
  return `+${points} pts`;
}

/**
 * Get status display info
 */
export function getStatusDisplay(status: string): {
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
    case 'pending':
    default:
      return { icon: '☐', label: 'Pending', className: 'text-gray-600' };
  }
}
