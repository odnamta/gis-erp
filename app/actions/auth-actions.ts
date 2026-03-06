'use server';

/**
 * Server Actions for Authentication
 * v0.76: System Audit & Logging Module - Auth Integration
 * 
 * Provides server actions for:
 * - Recording login events on successful authentication
 * - Recording logout events on sign out
 * - Recording failed login attempts
 * 
 * Requirements: 3.1, 3.2, 3.4
 */

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { recordLogin, recordLogout, recordFailedLogin } from './login-history-actions';
import { LoginMethod } from '@/types/login-history';

// =====================================================
// TYPES
// =====================================================

interface AuthActionResult {
  success: boolean;
  error?: string;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Gets client information from request headers.
 * Extracts IP address and user agent for login history tracking.
 */
async function getClientInfo(): Promise<{ ip_address: string | undefined; user_agent: string | undefined }> {
  const headersList = await headers();
  
  // Get IP address from various headers (in order of preference)
  const ip_address = 
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    headersList.get('cf-connecting-ip') || // Cloudflare
    undefined;
  
  // Get user agent
  const user_agent = headersList.get('user-agent') || undefined;
  
  return { ip_address, user_agent };
}

// =====================================================
// LOGIN RECORDING
// =====================================================

/**
 * Records a successful login event.
 * Called from auth callback after successful OAuth exchange.
 * 
 * Requirement 3.1: Record login event with timestamp and method
 */
export async function recordSuccessfulLogin(
  userId: string,
  loginMethod: LoginMethod = 'google'
): Promise<AuthActionResult> {
  try {
    const { ip_address, user_agent } = await getClientInfo();
    
    const result = await recordLogin({
      user_id: userId,
      login_method: loginMethod,
      ip_address,
      user_agent,
    });
    
    if (!result.success) {
      // Don't fail the auth flow if login recording fails
      return { success: true };
    }
    
    return { success: true };
  } catch {
    // Don't fail the auth flow if login recording fails
    return { success: true };
  }
}

// =====================================================
// LOGOUT RECORDING
// =====================================================

/**
 * Records a logout event and signs out the user.
 * Called from the header sign-out button.
 * 
 * Requirement 3.2: Update record with logout time and calculate session duration
 */
export async function signOutWithLogging(): Promise<AuthActionResult> {
  try {
    const supabase = await createClient();
    
    // Get current user before signing out
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Record logout (don't fail if this fails)
      try {
        await recordLogout(user.id);
      } catch {
      }
    }
    
    // Sign out the user
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to sign out' };
  }
}

// =====================================================
// FAILED LOGIN RECORDING
// =====================================================

/**
 * Records a failed login attempt.
 * Called when OAuth authentication fails.
 * 
 * Requirement 3.4: Record failure with reason
 */
export async function recordFailedLoginAttempt(
  email: string | undefined,
  failureReason: string,
  loginMethod: LoginMethod = 'google'
): Promise<AuthActionResult> {
  try {
    const { ip_address, user_agent } = await getClientInfo();
    
    const result = await recordFailedLogin({
      email,
      failure_reason: failureReason,
      login_method: loginMethod,
      ip_address,
      user_agent,
    });
    
    if (!result.success) {
    }
    
    // Always return success - don't expose login recording failures
    return { success: true };
  } catch {
    return { success: true };
  }
}
