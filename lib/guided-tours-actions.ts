'use server';

/**
 * Guided Tours Server Actions
 * v0.37: Training Mode / Guided Tours
 */

import { createClient } from '@/lib/supabase/server';
import {
  GuidedTour,
  GuidedTourRow,
  TourProgress,
  TourProgressRow,
  TourWithProgress,
  TourStep,
  AdvanceStepResult,
} from '@/types/guided-tours';
import {
  mapDbRowToTour,
  mapDbRowToProgress,
  filterToursByRole,
  sortToursByDisplayOrder,
  combineTourWithProgress,
  calculateNextStepIndex,
  calculatePrevStepIndex,
  getStepAtIndex,
} from '@/lib/guided-tours-utils';

// =====================================================
// Tour Fetching Functions
// =====================================================

/**
 * Get all available tours for the current user based on their role
 */
export async function getAvailableTours(): Promise<{
  data: TourWithProgress[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get user's role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return { data: null, error: 'User profile not found' };
    }

    // Get all active tours
    const { data: tourRows, error: toursError } = await supabase
      .from('guided_tours')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (toursError) {
      return { data: null, error: toursError.message };
    }

    // Get user's progress for all tours
    const { data: progressRows, error: progressError } = await supabase
      .from('user_tour_progress')
      .select('*')
      .eq('user_id', user.id);

    if (progressError) {
      return { data: null, error: progressError.message };
    }

    // Transform and filter tours
    const tours = (tourRows as unknown as GuidedTourRow[]).map(mapDbRowToTour);
    const filteredTours = filterToursByRole(tours, profile.role);
    const sortedTours = sortToursByDisplayOrder(filteredTours);

    // Transform progress
    const progress = (progressRows as TourProgressRow[] || []).map(mapDbRowToProgress);

    // Combine tours with progress
    const toursWithProgress = combineTourWithProgress(sortedTours, progress);

    return { data: toursWithProgress, error: null };
  } catch (error) {
    console.error('Error fetching tours:', error);
    return { data: null, error: 'Failed to fetch tours' };
  }
}

/**
 * Get a single tour by its code
 */
export async function getTourByCode(tourCode: string): Promise<{
  data: GuidedTour | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: tourRow, error } = await supabase
      .from('guided_tours')
      .select('*')
      .eq('tour_code', tourCode)
      .eq('is_active', true)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const tour = mapDbRowToTour(tourRow as unknown as GuidedTourRow);
    return { data: tour, error: null };
  } catch (error) {
    console.error('Error fetching tour:', error);
    return { data: null, error: 'Failed to fetch tour' };
  }
}

/**
 * Get a single tour by its ID
 */
export async function getTourById(tourId: string): Promise<{
  data: GuidedTour | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: tourRow, error } = await supabase
      .from('guided_tours')
      .select('*')
      .eq('id', tourId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const tour = mapDbRowToTour(tourRow as unknown as GuidedTourRow);
    return { data: tour, error: null };
  } catch (error) {
    console.error('Error fetching tour:', error);
    return { data: null, error: 'Failed to fetch tour' };
  }
}

// =====================================================
// Tour Progress Functions
// =====================================================

/**
 * Start a tour - creates or updates progress to in_progress
 */
export async function startTour(tourId: string): Promise<{
  data: { steps: TourStep[]; currentStep: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get the tour
    const { data: tourRow, error: tourError } = await supabase
      .from('guided_tours')
      .select('steps')
      .eq('id', tourId)
      .single();

    if (tourError || !tourRow) {
      return { data: null, error: 'Tour not found' };
    }

    // Check for existing progress
    const { data: existingProgress } = await supabase
      .from('user_tour_progress')
      .select('current_step, status')
      .eq('user_id', user.id)
      .eq('tour_id', tourId)
      .single();

    let currentStep = 0;
    
    // If resuming an in_progress tour, use saved step
    if (existingProgress?.status === 'in_progress') {
      currentStep = existingProgress.current_step ?? 0;
    }

    // Upsert progress record
    const { error: upsertError } = await supabase
      .from('user_tour_progress')
      .upsert({
        user_id: user.id,
        tour_id: tourId,
        status: 'in_progress',
        current_step: currentStep,
        started_at: new Date().toISOString(),
        completed_at: null,
      }, {
        onConflict: 'user_id,tour_id',
      });

    if (upsertError) {
      return { data: null, error: upsertError.message };
    }

    return { 
      data: { 
        steps: tourRow.steps as unknown as TourStep[], 
        currentStep 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error starting tour:', error);
    return { data: null, error: 'Failed to start tour' };
  }
}

/**
 * Advance to the next step in a tour
 */
export async function advanceTourStep(tourId: string): Promise<{
  data: AdvanceStepResult | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get current progress
    const { data: progress, error: progressError } = await supabase
      .from('user_tour_progress')
      .select('current_step')
      .eq('user_id', user.id)
      .eq('tour_id', tourId)
      .single();

    if (progressError || !progress) {
      return { data: null, error: 'Tour progress not found' };
    }

    // Get tour steps
    const { data: tourRow, error: tourError } = await supabase
      .from('guided_tours')
      .select('steps')
      .eq('id', tourId)
      .single();

    if (tourError || !tourRow) {
      return { data: null, error: 'Tour not found' };
    }

    const steps = tourRow.steps as unknown as TourStep[];
    const nextStepIndex = calculateNextStepIndex(progress.current_step ?? 0, steps.length);

    if (nextStepIndex === null) {
      // Tour complete
      const { error: updateError } = await supabase
        .from('user_tour_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('tour_id', tourId);

      if (updateError) {
        return { data: null, error: updateError.message };
      }

      return { 
        data: { step: null, isComplete: true, stepIndex: progress.current_step ?? 0 }, 
        error: null 
      };
    }

    // Update to next step
    const { error: updateError } = await supabase
      .from('user_tour_progress')
      .update({ current_step: nextStepIndex })
      .eq('user_id', user.id)
      .eq('tour_id', tourId);

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    return { 
      data: { 
        step: steps[nextStepIndex], 
        isComplete: false, 
        stepIndex: nextStepIndex 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error advancing tour step:', error);
    return { data: null, error: 'Failed to advance step' };
  }
}

/**
 * Go back to the previous step in a tour
 */
export async function goBackTourStep(tourId: string): Promise<{
  data: { step: TourStep; stepIndex: number } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    // Get current progress
    const { data: progress, error: progressError } = await supabase
      .from('user_tour_progress')
      .select('current_step')
      .eq('user_id', user.id)
      .eq('tour_id', tourId)
      .single();

    if (progressError || !progress) {
      return { data: null, error: 'Tour progress not found' };
    }

    const prevStepIndex = calculatePrevStepIndex(progress.current_step ?? 0);

    if (prevStepIndex === null) {
      return { data: null, error: 'Already at first step' };
    }

    // Get tour steps
    const { data: tourRow, error: tourError } = await supabase
      .from('guided_tours')
      .select('steps')
      .eq('id', tourId)
      .single();

    if (tourError || !tourRow) {
      return { data: null, error: 'Tour not found' };
    }

    const steps = tourRow.steps as unknown as TourStep[];

    // Update to previous step
    const { error: updateError } = await supabase
      .from('user_tour_progress')
      .update({ current_step: prevStepIndex })
      .eq('user_id', user.id)
      .eq('tour_id', tourId);

    if (updateError) {
      return { data: null, error: updateError.message };
    }

    return { 
      data: { 
        step: steps[prevStepIndex], 
        stepIndex: prevStepIndex 
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error going back tour step:', error);
    return { data: null, error: 'Failed to go back' };
  }
}

/**
 * Skip/abandon a tour
 */
export async function skipTour(tourId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Upsert progress as skipped
    const { error: upsertError } = await supabase
      .from('user_tour_progress')
      .upsert({
        user_id: user.id,
        tour_id: tourId,
        status: 'skipped',
      }, {
        onConflict: 'user_id,tour_id',
      });

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error skipping tour:', error);
    return { success: false, error: 'Failed to skip tour' };
  }
}

/**
 * Get user's progress for a specific tour
 */
export async function getTourProgress(tourId: string): Promise<{
  data: TourProgress | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data: progressRow, error } = await supabase
      .from('user_tour_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('tour_id', tourId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No progress found - return null (not an error)
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    const progress = mapDbRowToProgress(progressRow as TourProgressRow);
    return { data: progress, error: null };
  } catch (error) {
    console.error('Error fetching tour progress:', error);
    return { data: null, error: 'Failed to fetch progress' };
  }
}
