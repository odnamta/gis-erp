'use server'

/**
 * Server Action for Terms & Conditions Acceptance
 * v0.85: Terms & Conditions System
 * 
 * Records user acceptance of Terms & Conditions in the database.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { TERMS_VERSION } from '@/lib/terms-conditions'

/**
 * Result type for acceptTerms action
 */
interface AcceptTermsResult {
  success: boolean
  error?: string
}

/**
 * Record user acceptance of Terms & Conditions
 * 
 * Requirements:
 * - 4.1: Update user_profiles table with tc_accepted_at and tc_version
 * - 4.2: Use current server timestamp for tc_accepted_at
 * - 4.3: Use current TERMS_VERSION constant for tc_version
 * - 4.4: Verify user is authenticated before updating
 * - 4.5: Return error if user is not authenticated
 * - 4.6: Return success when acceptance is recorded successfully
 * 
 * @returns Result indicating success or failure with error message
 */
export async function acceptTerms(): Promise<AcceptTermsResult> {
  const supabase = await createClient()
  
  // Requirement 4.4: Verify user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Requirement 4.5: Return error if not authenticated
  if (authError || !user) {
    return {
      success: false,
      error: 'Not authenticated',
    }
  }
  
  // Requirements 4.1, 4.2, 4.3: Update user_profiles with timestamp and version
  // Note: tc_accepted_at and tc_version columns were added in migration 
  // 20260125000004 but types haven't been regenerated yet
  const updateResult = await supabase
    .from('user_profiles')
    .update({
      tc_accepted_at: new Date().toISOString(), // 4.2: Current server timestamp
      tc_version: TERMS_VERSION,                 // 4.3: Current TERMS_VERSION
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .eq('user_id', user.id)
  
  const updateError = updateResult.error
  
  if (updateError) {
    console.error('[acceptTerms] Error updating user_profiles:', updateError)
    return {
      success: false,
      error: 'Failed to record acceptance',
    }
  }
  
  // Revalidate the current path to refresh the page after acceptance
  revalidatePath('/')
  
  // Requirement 4.6: Return success
  return { success: true }
}
