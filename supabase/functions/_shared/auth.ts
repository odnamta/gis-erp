// Auth helper for Edge Functions
// Extracts JWT, verifies user, fetches profile from user_profiles

import { createUserClient } from './supabase.ts'

export type UserRole =
  | 'owner'
  | 'director'
  | 'marketing_manager'
  | 'finance_manager'
  | 'operations_manager'
  | 'sysadmin'
  | 'administration'
  | 'finance'
  | 'marketing'
  | 'ops'
  | 'engineer'
  | 'hr'
  | 'hse'
  | 'agency'
  | 'customs'

export interface UserProfile {
  id: string
  user_id: string
  full_name: string
  email: string
  role: UserRole
}

/**
 * Extract Authorization header, verify JWT, and fetch user_profiles row.
 * Throws on missing auth, invalid JWT, or missing profile.
 *
 * CRITICAL: user_profiles uses .eq('user_id', user.id), NOT .eq('id', user.id)
 */
export async function getUserProfile(req: Request): Promise<{
  user: { id: string; email?: string }
  profile: UserProfile
  authHeader: string
}> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Missing Authorization header')
  }

  const supabase = createUserClient(authHeader)

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Invalid or expired token')
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, user_id, full_name, email, role')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('User profile not found')
  }

  return {
    user,
    profile: profile as UserProfile,
    authHeader,
  }
}
