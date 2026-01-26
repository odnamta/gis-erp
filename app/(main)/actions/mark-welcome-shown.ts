'use server'

/**
 * Server Action for Welcome Modal Dismissal
 * v0.86: Welcome Flow
 * 
 * Records when a user has seen and dismissed the welcome modal.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Result type for markWelcomeShown action
 */
interface MarkWelcomeShownResult {
  success: boolean
  error?: string
}

/**
 * Record that user has seen the welcome modal
 * 
 * Requirements:
 * - 5.1: Update welcome_shown_at column with current server timestamp
 * - 5.2: Return error if user is not authenticated
 * - 5.3: Return success when database update succeeds
 * - 5.4: Return error with descriptive message when database update fails
 * 
 * @returns Result indicating success or failure with error message
 */
export async function markWelcomeShown(): Promise<MarkWelcomeShownResult> {
  const supabase = await createClient()
  
  // Requirement 5.2: Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Requirement 5.2: Return error if not authenticated
  if (authError || !user) {
    return {
      success: false,
      error: 'Not authenticated',
    }
  }
  
  // Requirement 5.1: Update welcome_shown_at with current server timestamp
  // Note: welcome_shown_at column was added in migration for v0.86
  // but types haven't been regenerated yet
  const updateResult = await supabase
    .from('user_profiles')
    .update({
      welcome_shown_at: new Date().toISOString(), // 5.1: Current server timestamp
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .eq('user_id', user.id)
  
  const updateError = updateResult.error
  
  // Requirement 5.4: Return error with descriptive message on failure
  if (updateError) {
    console.error('[markWelcomeShown] Error updating user_profiles:', updateError)
    return {
      success: false,
      error: 'Failed to record welcome shown status',
    }
  }
  
  // Revalidate the current path to refresh the page after dismissal
  revalidatePath('/')
  
  // Requirement 5.3: Return success when database update succeeds
  return { success: true }
}
