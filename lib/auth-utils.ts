/**
 * Auth Utilities
 * Server-side utilities for getting current user profile
 *
 * Note: No 'use server' directive — these are server-only utilities
 * imported by server components, not server actions called from client.
 */

import { cookies } from 'next/headers';
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

/**
 * Check if explorer mode is active (co-builder competition).
 * Reads from cookie set by sidebar toggle.
 */
export async function isExplorerMode(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get('gama-explorer-mode')?.value === 'true';
}

/**
 * Multi-role aware role check. Use this instead of allowedRoles.includes(profile.role).
 * Returns true if ANY of the user's roles matches ANY of the allowed roles.
 */
export function profileHasRole(profile: UserProfile | null, allowedRoles: string[]): boolean {
  if (!profile) return false;
  const userRoles: string[] = (profile.roles?.length ? profile.roles : [profile.role]).filter(Boolean);
  return userRoles.some(r => allowedRoles.includes(r));
}

/**
 * Guard a page with permission check + explorer mode bypass.
 * Returns { allowed: true } if user has native permission,
 * { allowed: true, explorerReadOnly: true } if accessed via explorer mode,
 * or calls redirect() if neither applies.
 *
 * Usage:
 *   const { explorerReadOnly } = await guardPage(canViewPIB(profile))
 */
export async function guardPage(
  hasPermission: boolean,
  redirectTo: string = '/dashboard'
): Promise<{ allowed: true; explorerReadOnly: boolean }> {
  if (hasPermission) {
    return { allowed: true, explorerReadOnly: false };
  }
  const explorer = await isExplorerMode();
  if (explorer) {
    return { allowed: true, explorerReadOnly: true };
  }
  const { redirect } = await import('next/navigation');
  redirect(redirectTo);
  // redirect() throws and never returns, but TS needs this
  throw new Error('unreachable');
}
