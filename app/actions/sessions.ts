'use server'

/**
 * Session Management Server Actions
 * 
 * v0.79: Security Hardening Module
 * Requirements: 5.1, 5.5
 * 
 * Provides server actions for:
 * - Getting user sessions
 * - Terminating sessions
 * - Getting session statistics
 */

import { createClient } from '@/lib/supabase/server'
import {
  getUserSessions as getUserSessionsUtil,
  getSessionById,
  terminateSessionById,
  terminateAllUserSessions as terminateAllUserSessionsUtil,
  countUserSessions,
  getSessionStatistics,
} from '@/lib/security/session-manager'
import type { UserSession } from '@/lib/security/types'

/**
 * Get sessions for the current user
 * Requirements: 5.1 - Track session metadata
 */
export async function getMyUserSessions(): Promise<{
  success: boolean
  data?: UserSession[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }
    
    const result = await getUserSessionsUtil(profile.id)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error fetching user sessions:', error)
    return { success: false, error: 'Failed to fetch sessions' }
  }
}

/**
 * Get sessions for a specific user (admin only)
 * Requirements: 5.1 - Track session metadata
 */
export async function getUserSessions(
  userId: string
): Promise<{ success: boolean; data?: UserSession[]; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile for authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await getUserSessionsUtil(userId)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error fetching user sessions:', error)
    return { success: false, error: 'Failed to fetch sessions' }
  }
}

/**
 * Terminate a specific session
 * Requirements: 5.5 - Record termination reason and timestamp
 */
export async function terminateSession(
  sessionId: string,
  reason: string = 'user_requested'
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }
    
    // Get the session to verify ownership
    const sessionResult = await getSessionById(sessionId)
    if (sessionResult.error || !sessionResult.data) {
      return { success: false, error: 'Session not found' }
    }
    
    // Only allow terminating own sessions unless admin/owner
    if (sessionResult.data.user_id !== profile.id && !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Cannot terminate another user\'s session' }
    }
    
    const result = await terminateSessionById(sessionId, reason)
    
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to terminate session' }
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error terminating session:', error)
    return { success: false, error: 'Failed to terminate session' }
  }
}

/**
 * Terminate all sessions for a user (admin only)
 * Requirements: 5.5 - Record termination reason and timestamp
 */
export async function terminateAllUserSessions(
  userId: string,
  reason: string = 'admin_requested'
): Promise<{ success: boolean; terminatedCount?: number; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile for authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await terminateAllUserSessionsUtil(userId, reason)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, terminatedCount: result.terminatedCount }
  } catch (error) {
    console.error('Error terminating all user sessions:', error)
    return { success: false, error: 'Failed to terminate sessions' }
  }
}

/**
 * Terminate all of my sessions except the current one
 */
export async function terminateOtherSessions(): Promise<{
  success: boolean
  terminatedCount?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }
    
    // Get all sessions for this user
    const sessionsResult = await getUserSessionsUtil(profile.id)
    if (sessionsResult.error) {
      return { success: false, error: sessionsResult.error }
    }
    
    // Terminate all sessions (the current Supabase session is separate from our custom sessions)
    const result = await terminateAllUserSessionsUtil(profile.id, 'user_requested_logout_all')
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, terminatedCount: result.terminatedCount }
  } catch (error) {
    console.error('Error terminating other sessions:', error)
    return { success: false, error: 'Failed to terminate sessions' }
  }
}

/**
 * Get session count for the current user
 */
export async function getMySessionCount(): Promise<{
  success: boolean
  count?: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }
    
    const result = await countUserSessions(profile.id)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, count: result.count }
  } catch (error) {
    console.error('Error counting sessions:', error)
    return { success: false, error: 'Failed to count sessions' }
  }
}

/**
 * Get session statistics for the current user
 */
export async function getMySessionStats(): Promise<{
  success: boolean
  data?: {
    activeCount: number
    totalCount: number
    oldestActiveSession: string | null
    newestActiveSession: string | null
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }
    
    const result = await getSessionStatistics(profile.id)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data || undefined }
  } catch (error) {
    console.error('Error fetching session statistics:', error)
    return { success: false, error: 'Failed to fetch statistics' }
  }
}

/**
 * Get session statistics for a specific user (admin only)
 */
export async function getUserSessionStats(
  userId: string
): Promise<{
  success: boolean
  data?: {
    activeCount: number
    totalCount: number
    oldestActiveSession: string | null
    newestActiveSession: string | null
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile for authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await getSessionStatistics(userId)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data || undefined }
  } catch (error) {
    console.error('Error fetching session statistics:', error)
    return { success: false, error: 'Failed to fetch statistics' }
  }
}
