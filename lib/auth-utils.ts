'use server';

/**
 * Auth Utilities
 * Server-side utilities for getting current user profile
 */

import { createClient } from '@/lib/supabase/server';
import { UserProfile } from '@/types/permissions';

/**
 * Get current user profile with role and permissions
 * Returns null if user is not authenticated or profile not found
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!profile) {
    return null;
  }

  return profile as unknown as UserProfile;
}

/**
 * Get current user ID
 * Returns null if user is not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  return user?.id || null;
}
