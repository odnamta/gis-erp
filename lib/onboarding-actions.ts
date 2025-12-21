'use server';

// =====================================================
// v0.36: ONBOARDING CHECKLIST SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  OnboardingStatus,
  OnboardingProgressWithStep,
  UserOnboardingData,
} from '@/types/onboarding';
import {
  groupStepsByCategory,
  getNextSteps,
  calculatePercentComplete,
} from '@/lib/onboarding-utils';

/**
 * Get complete onboarding data for a user
 */
export async function getUserOnboardingProgress(
  userId: string
): Promise<UserOnboardingData> {
  const supabase = await createClient();

  // Get status
  const { data: statusData, error: statusError } = await supabase
    .from('user_onboarding_status')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (statusError && statusError.code !== 'PGRST116') {
    console.error('Error fetching onboarding status:', statusError);
  }

  // Get all progress with step details
  const { data: progressData, error: progressError } = await supabase
    .from('user_onboarding_progress')
    .select(`
      *,
      step:onboarding_steps(*)
    `)
    .eq('user_id', userId)
    .order('step(step_order)');

  if (progressError) {
    console.error('Error fetching onboarding progress:', progressError);
  }

  const steps: OnboardingProgressWithStep[] = (progressData || []).map((p: {
    id: string;
    user_id: string;
    step_id: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    current_count: number;
    created_at: string;
    step: OnboardingProgressWithStep['step'];
  }) => ({
    id: p.id,
    user_id: p.user_id,
    step_id: p.step_id,
    status: p.status,
    started_at: p.started_at,
    completed_at: p.completed_at,
    current_count: p.current_count,
    created_at: p.created_at,
    step: p.step,
  }));

  const stepsByCategory = groupStepsByCategory(steps);
  const nextSteps = getNextSteps(steps, 3);
  const percentComplete = calculatePercentComplete(
    statusData?.completed_steps || 0,
    statusData?.total_steps || 0
  );

  return {
    status: statusData as OnboardingStatus | null,
    steps,
    stepsByCategory,
    nextSteps,
    percentComplete,
  };
}

/**
 * Mark a step as completed
 */
export async function completeOnboardingStep(
  userId: string,
  stepCode: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get step
  const { data: step, error: stepError } = await supabase
    .from('onboarding_steps')
    .select('id, points')
    .eq('step_code', stepCode)
    .single();

  if (stepError || !step) {
    return { success: false, error: 'Step not found' };
  }

  // Update progress
  const { error: updateError } = await supabase
    .from('user_onboarding_progress')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('step_id', step.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Track route visit for auto_route completion
 */
export async function trackRouteVisit(
  userId: string,
  route: string
): Promise<void> {
  const supabase = await createClient();

  // Normalize route
  const normalizedRoute = route.replace(/\/$/, '');

  // Find steps with this route
  const { data: steps, error: stepsError } = await supabase
    .from('onboarding_steps')
    .select('id, step_code')
    .eq('completion_type', 'auto_route')
    .eq('completion_route', normalizedRoute);

  if (stepsError || !steps?.length) {
    // Also try with trailing slash
    const { data: stepsWithSlash } = await supabase
      .from('onboarding_steps')
      .select('id, step_code')
      .eq('completion_type', 'auto_route')
      .eq('completion_route', normalizedRoute + '/');
    
    if (!stepsWithSlash?.length) return;
    
    for (const step of stepsWithSlash) {
      await completeStepIfPending(supabase, userId, step.id, step.step_code);
    }
    return;
  }

  for (const step of steps) {
    await completeStepIfPending(supabase, userId, step.id, step.step_code);
  }
}

async function completeStepIfPending(
  supabase: SupabaseClient,
  userId: string,
  stepId: string,
  stepCode: string
): Promise<void> {
  // Check if not already completed
  const { data: progress } = await supabase
    .from('user_onboarding_progress')
    .select('status')
    .eq('user_id', userId)
    .eq('step_id', stepId)
    .single();

  if (progress?.status === 'pending') {
    await completeOnboardingStep(userId, stepCode);
  }
}

/**
 * Track action for auto_count completion
 */
export async function trackAction(
  userId: string,
  table: string,
  action: 'create' | 'update' | 'delete'
): Promise<void> {
  if (action !== 'create') return;

  const supabase = await createClient();

  // Find steps that track this table
  const { data: steps, error: stepsError } = await supabase
    .from('onboarding_steps')
    .select('id, step_code, completion_count')
    .eq('completion_type', 'auto_count')
    .eq('completion_table', table);

  if (stepsError || !steps?.length) return;

  for (const step of steps) {
    // Get current progress
    const { data: progress } = await supabase
      .from('user_onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('step_id', step.id)
      .single();

    if (!progress || progress.status === 'completed') continue;

    const newCount = (progress.current_count || 0) + 1;

    if (newCount >= step.completion_count) {
      // Complete the step
      await supabase
        .from('user_onboarding_progress')
        .update({
          status: 'completed',
          current_count: newCount,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('step_id', step.id);
    } else {
      // Update count and set to in_progress
      await supabase
        .from('user_onboarding_progress')
        .update({
          status: 'in_progress',
          current_count: newCount,
          started_at: progress.started_at || new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('step_id', step.id);
    }
  }
}

/**
 * Skip all remaining onboarding steps
 */
export async function skipOnboarding(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Mark all pending/in_progress steps as skipped
  const { error: progressError } = await supabase
    .from('user_onboarding_progress')
    .update({ status: 'skipped' })
    .eq('user_id', userId)
    .in('status', ['pending', 'in_progress']);

  if (progressError) {
    return { success: false, error: progressError.message };
  }

  // Update status
  const { error: statusError } = await supabase
    .from('user_onboarding_status')
    .update({
      is_onboarding_complete: true,
      show_onboarding_widget: false,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (statusError) {
    return { success: false, error: statusError.message };
  }

  return { success: true };
}

/**
 * Hide the onboarding widget
 */
export async function hideOnboardingWidget(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_onboarding_status')
    .update({
      show_onboarding_widget: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Manually mark a step as completed (for manual completion_type)
 */
export async function markStepComplete(
  userId: string,
  stepCode: string
): Promise<{ success: boolean; error?: string }> {
  return completeOnboardingStep(userId, stepCode);
}

/**
 * Initialize onboarding for existing users who don't have it yet
 */
export async function initializeOnboardingForUser(
  userId: string,
  userRole: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check if user already has onboarding status
  const { data: existingStatus } = await supabase
    .from('user_onboarding_status')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingStatus) {
    return { success: true }; // Already initialized
  }

  // Create status record
  const { error: statusError } = await supabase
    .from('user_onboarding_status')
    .insert({ user_id: userId });

  if (statusError) {
    return { success: false, error: statusError.message };
  }

  // Get applicable steps
  const { data: steps, error: stepsError } = await supabase
    .from('onboarding_steps')
    .select('id')
    .eq('is_active', true)
    .contains('applicable_roles', [userRole]);

  if (stepsError) {
    return { success: false, error: stepsError.message };
  }

  // Create progress entries
  const progressEntries = (steps || []).map((step: { id: string }) => ({
    user_id: userId,
    step_id: step.id,
    status: 'pending',
  }));

  if (progressEntries.length > 0) {
    const { error: progressError } = await supabase
      .from('user_onboarding_progress')
      .insert(progressEntries);

    if (progressError) {
      return { success: false, error: progressError.message };
    }
  }

  // Update total steps
  const { error: updateError } = await supabase
    .from('user_onboarding_status')
    .update({ total_steps: progressEntries.length })
    .eq('user_id', userId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Dismiss welcome modal
 */
export async function dismissWelcomeModal(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_onboarding_status')
    .update({
      show_welcome_modal: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
