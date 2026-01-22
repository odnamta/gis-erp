'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionType, ResourceType } from '@/types/activity';

/**
 * Activity Logger Utility (v0.13.1)
 * 
 * Server-side utility for logging user activities.
 * Uses async non-blocking pattern to avoid impacting response times.
 */

/**
 * Log a user activity (create, update, delete, approve, reject, etc.)
 * This function is async and non-blocking - errors are logged but not thrown.
 */
export async function logActivity(
  userId: string,
  actionType: ActionType,
  resourceType?: ResourceType,
  resourceId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get user email from profile (non-blocking lookup)
    let userEmail: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('user_id', userId)
        .single();
      userEmail = profile?.email ?? null;
    } catch {
      // Continue without email if lookup fails
    }

    // Insert activity log (fire-and-forget pattern)
    // Note: user_activity_log table exists in DB but not in generated types
    const { error } = await (supabase as any).from('user_activity_log').insert({
      user_id: userId,
      user_email: userEmail,
      action_type: actionType,
      resource_type: resourceType ?? null,
      resource_id: resourceId ?? null,
      metadata: metadata ?? {},
    });

    if (error) {
      console.error('[ActivityLogger] Failed to log activity:', error.message);
    }
  } catch (error) {
    // Log error but don't throw to avoid disrupting user actions
    console.error('[ActivityLogger] Error:', error);
  }
}

/**
 * Log a page view activity with rate limiting support.
 * Called from middleware for automatic page view tracking.
 */
export async function logPageView(
  userId: string,
  pagePath: string,
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get user email from profile
    let userEmail: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('user_id', userId)
        .single();
      userEmail = profile?.email ?? null;
    } catch {
      // Continue without email if lookup fails
    }

    // Insert page view log
    // Note: user_activity_log table exists in DB but not in generated types
    const { error } = await (supabase as any).from('user_activity_log').insert({
      user_id: userId,
      user_email: userEmail,
      action_type: 'page_view',
      page_path: pagePath,
      session_id: sessionId ?? null,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
      metadata: {},
    });

    if (error) {
      console.error('[ActivityLogger] Failed to log page view:', error.message);
    }
  } catch (error) {
    console.error('[ActivityLogger] Error logging page view:', error);
  }
}
