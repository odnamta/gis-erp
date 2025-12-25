'use server'

/**
 * Security Events Server Actions
 * 
 * v0.79: Security Hardening Module
 * Requirements: 3.1, 3.5
 * 
 * Provides server actions for:
 * - Fetching security events with filtering
 * - Marking events as investigated
 * - Getting event statistics
 */

import { createClient } from '@/lib/supabase/server'
import {
  getEvents,
  getEventById,
  markInvestigated,
  getEventStatistics,
} from '@/lib/security/event-logger'
import type { SecurityEventType, SecuritySeverity, SecurityEvent } from '@/lib/security/types'

export interface SecurityEventFilters {
  eventType?: SecurityEventType
  severity?: SecuritySeverity
  investigated?: boolean
  dateFrom?: string
  dateTo?: string
  userId?: string
  ipAddress?: string
}

export interface PaginatedSecurityEvents {
  data: SecurityEvent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Get security events with filtering and pagination
 */
export async function getSecurityEvents(
  filters: SecurityEventFilters = {},
  pagination: { page: number; pageSize: number } = { page: 1, pageSize: 25 }
): Promise<{ success: boolean; data?: PaginatedSecurityEvents; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Check authorization - only admin, owner, manager can view security events
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner', 'manager'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    // Calculate limit based on pagination
    const limit = pagination.pageSize * pagination.page
    
    const result = await getEvents(
      {
        eventType: filters.eventType,
        severity: filters.severity,
        investigated: filters.investigated,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        userId: filters.userId,
        ipAddress: filters.ipAddress,
      },
      limit
    )
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    // Apply pagination
    const startIndex = (pagination.page - 1) * pagination.pageSize
    const paginatedData = result.data.slice(startIndex, startIndex + pagination.pageSize)
    const total = result.data.length
    
    return {
      success: true,
      data: {
        data: paginatedData,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: Math.ceil(total / pagination.pageSize),
      },
    }
  } catch (error) {
    console.error('Error fetching security events:', error)
    return { success: false, error: 'Failed to fetch security events' }
  }
}

/**
 * Get a single security event by ID
 */
export async function getSecurityEventById(
  eventId: string
): Promise<{ success: boolean; data?: SecurityEvent; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Check authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner', 'manager'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await getEventById(eventId)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    if (!result.data) {
      return { success: false, error: 'Event not found' }
    }
    
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error fetching security event:', error)
    return { success: false, error: 'Failed to fetch security event' }
  }
}

/**
 * Mark a security event as investigated
 */
export async function markEventInvestigated(
  eventId: string,
  notes: string
): Promise<{ success: boolean; data?: SecurityEvent; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }
    
    // Get user profile for investigator ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner', 'manager'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await markInvestigated(eventId, profile.id, notes)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data || undefined }
  } catch (error) {
    console.error('Error marking event as investigated:', error)
    return { success: false, error: 'Failed to mark event as investigated' }
  }
}

/**
 * Get security event statistics
 */
export async function getSecurityEventStats(
  dateFrom?: string,
  dateTo?: string
): Promise<{
  success: boolean
  data?: {
    totalEvents: number
    byType: Record<string, number>
    bySeverity: Record<SecuritySeverity, number>
    investigatedCount: number
    uninvestigatedCount: number
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
    
    // Check authorization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    
    if (!profile || !['admin', 'owner', 'manager'].includes(profile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }
    
    const result = await getEventStatistics(dateFrom, dateTo)
    
    if (result.error) {
      return { success: false, error: result.error }
    }
    
    return { success: true, data: result.data || undefined }
  } catch (error) {
    console.error('Error fetching security event statistics:', error)
    return { success: false, error: 'Failed to fetch statistics' }
  }
}
