/**
 * Security Event Logger
 *
 * Provides security event logging functionality for tracking and monitoring
 * security-related events in the system. Supports event classification,
 * severity levels, and investigation tracking.
 *
 * @module lib/security/event-logger
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
  LogSecurityEventParams,
  SecurityEventInsert,
} from './types';

// Helper type for untyped Supabase queries (security tables not yet in generated types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// =============================================================================
// Event Logging Functions
// =============================================================================

/**
 * Logs a security event to the database
 *
 * @param params - Event parameters including type, severity, and description
 * @returns The created security event or null if failed
 */
export async function logEvent(
  params: LogSecurityEventParams
): Promise<{ data: SecurityEvent | null; error: string | null }> {
  // Validate required fields
  if (!params.eventType || !params.severity || !params.description) {
    return {
      data: null,
      error: 'Missing required fields: eventType, severity, and description are required',
    };
  }

  // Validate severity level
  const validSeverities: SecuritySeverity[] = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(params.severity)) {
    return {
      data: null,
      error: `Invalid severity level: ${params.severity}`,
    };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  // Truncate payload sample if too long (max 1000 chars)
  const payloadSample = params.payloadSample
    ? params.payloadSample.substring(0, 1000)
    : null;

  const eventData: SecurityEventInsert = {
    event_type: params.eventType,
    severity: params.severity,
    description: params.description,
    ip_address: params.ipAddress || null,
    user_agent: params.userAgent || null,
    user_id: params.userId || null,
    request_path: params.requestPath || null,
    request_method: params.requestMethod || null,
    payload_sample: payloadSample,
    action_taken: params.actionTaken || null,
  };

  const { data, error } = await supabase
    .from('security_events')
    .insert(eventData)
    .select()
    .single();

  if (error) {
    console.error('Failed to log security event:', error);
    return { data: null, error: error.message };
  }

  const event = data as SecurityEvent;

  // Trigger alert for critical events
  if (params.severity === 'critical') {
    // Fire and forget - don't block on alert sending
    sendSecurityAlert(event).catch((err) => {
      console.error('Failed to send security alert:', err);
    });
  }

  return { data: event, error: null };
}

/**
 * Logs a security event without database access (for testing/utility purposes)
 * Returns a mock event object with the provided parameters
 *
 * @param params - Event parameters
 * @returns A security event object (not persisted)
 */
export function createEventObject(params: LogSecurityEventParams): SecurityEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    event_type: params.eventType,
    severity: params.severity,
    description: params.description,
    ip_address: params.ipAddress || null,
    user_agent: params.userAgent || null,
    user_id: params.userId || null,
    request_path: params.requestPath || null,
    request_method: params.requestMethod || null,
    payload_sample: params.payloadSample?.substring(0, 1000) || null,
    action_taken: params.actionTaken || null,
    investigated: false,
    investigated_by: null,
    investigation_notes: null,
  };
}

// =============================================================================
// Event Query Functions
// =============================================================================

/**
 * Gets security events filtered by event type
 *
 * @param type - The event type to filter by
 * @param limit - Maximum number of events to return (default: 100)
 * @returns Array of security events matching the type
 */
export async function getEventsByType(
  type: SecurityEventType,
  limit: number = 100
): Promise<{ data: SecurityEvent[]; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('security_events')
    .select('*')
    .eq('event_type', type)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as SecurityEvent[], error: null };
}

/**
 * Gets security events filtered by severity level
 *
 * @param severity - The severity level to filter by
 * @param limit - Maximum number of events to return (default: 100)
 * @returns Array of security events matching the severity
 */
export async function getEventsBySeverity(
  severity: SecuritySeverity,
  limit: number = 100
): Promise<{ data: SecurityEvent[]; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('security_events')
    .select('*')
    .eq('severity', severity)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as SecurityEvent[], error: null };
}

/**
 * Gets all security events with optional filtering
 *
 * @param filters - Optional filters for type, severity, date range
 * @param limit - Maximum number of events to return (default: 100)
 * @returns Array of security events
 */
export async function getEvents(
  filters?: {
    eventType?: SecurityEventType;
    severity?: SecuritySeverity;
    investigated?: boolean;
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    ipAddress?: string;
  },
  limit: number = 100
): Promise<{ data: SecurityEvent[]; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  let query = supabase
    .from('security_events')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (filters?.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters?.investigated !== undefined) {
    query = query.eq('investigated', filters.investigated);
  }
  if (filters?.dateFrom) {
    query = query.gte('timestamp', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('timestamp', filters.dateTo);
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters?.ipAddress) {
    query = query.eq('ip_address', filters.ipAddress);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as SecurityEvent[], error: null };
}

/**
 * Gets a single security event by ID
 *
 * @param eventId - The event ID to retrieve
 * @returns The security event or null if not found
 */
export async function getEventById(
  eventId: string
): Promise<{ data: SecurityEvent | null; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('security_events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as SecurityEvent, error: null };
}

/**
 * Gets uninvestigated events, optionally filtered by severity
 *
 * @param minSeverity - Minimum severity level to include
 * @param limit - Maximum number of events to return
 * @returns Array of uninvestigated security events
 */
export async function getUninvestigatedEvents(
  minSeverity?: SecuritySeverity,
  limit: number = 100
): Promise<{ data: SecurityEvent[]; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  let query = supabase
    .from('security_events')
    .select('*')
    .eq('investigated', false)
    .order('timestamp', { ascending: false })
    .limit(limit);

  // Filter by minimum severity if specified
  if (minSeverity) {
    const severityOrder: SecuritySeverity[] = ['low', 'medium', 'high', 'critical'];
    const minIndex = severityOrder.indexOf(minSeverity);
    const includedSeverities = severityOrder.slice(minIndex);
    query = query.in('severity', includedSeverities);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data || []) as SecurityEvent[], error: null };
}

// =============================================================================
// Investigation Functions
// =============================================================================

/**
 * Marks a security event as investigated with notes
 *
 * @param eventId - The event ID to mark as investigated
 * @param investigatedBy - User ID of the investigator
 * @param notes - Investigation notes
 * @returns The updated security event
 */
export async function markInvestigated(
  eventId: string,
  investigatedBy: string,
  notes: string
): Promise<{ data: SecurityEvent | null; error: string | null }> {
  if (!eventId || !investigatedBy) {
    return {
      data: null,
      error: 'Event ID and investigator ID are required',
    };
  }

  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('security_events')
    .update({
      investigated: true,
      investigated_by: investigatedBy,
      investigation_notes: notes || '',
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as SecurityEvent, error: null };
}

/**
 * Updates investigation notes for an already investigated event
 *
 * @param eventId - The event ID to update
 * @param notes - Updated investigation notes
 * @returns The updated security event
 */
export async function updateInvestigationNotes(
  eventId: string,
  notes: string
): Promise<{ data: SecurityEvent | null; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const { data, error } = await supabase
    .from('security_events')
    .update({
      investigation_notes: notes,
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as SecurityEvent, error: null };
}

// =============================================================================
// Alert Functions
// =============================================================================

/**
 * Sends a security alert for critical events
 * This function can be extended to integrate with external alerting systems
 *
 * @param event - The security event to alert on
 */
export async function sendSecurityAlert(event: SecurityEvent): Promise<void> {
  // Log the alert (in production, this would integrate with alerting systems)
  console.warn('🚨 SECURITY ALERT:', {
    id: event.id,
    type: event.event_type,
    severity: event.severity,
    description: event.description,
    timestamp: event.timestamp,
    ipAddress: event.ip_address,
    userId: event.user_id,
  });

  // In a production environment, this would:
  // 1. Send email to security team
  // 2. Post to Slack/Teams channel
  // 3. Create PagerDuty incident
  // 4. Log to SIEM system

  // For now, we'll create a notification in the system if the notifications table exists
  try {
    const supabase = await createClient() as unknown as AnySupabaseClient;

    // Try to create a notification for admins
    await supabase.from('notifications').insert({
      type: 'security_alert',
      title: `Security Alert: ${event.event_type}`,
      message: `${event.severity.toUpperCase()}: ${event.description}`,
      priority: 'urgent',
      data: {
        event_id: event.id,
        event_type: event.event_type,
        severity: event.severity,
        ip_address: event.ip_address,
      },
    });
  } catch {
    // Notifications table may not exist, ignore error
  }
}

// =============================================================================
// Statistics Functions
// =============================================================================

/**
 * Gets event statistics for a given time period
 *
 * @param dateFrom - Start date for statistics
 * @param dateTo - End date for statistics
 * @returns Event statistics grouped by type and severity
 */
export async function getEventStatistics(
  dateFrom?: string,
  dateTo?: string
): Promise<{
  data: {
    totalEvents: number;
    byType: Record<string, number>;
    bySeverity: Record<SecuritySeverity, number>;
    investigatedCount: number;
    uninvestigatedCount: number;
  } | null;
  error: string | null;
}> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  let query = supabase.from('security_events').select('*');

  if (dateFrom) {
    query = query.gte('timestamp', dateFrom);
  }
  if (dateTo) {
    query = query.lte('timestamp', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  const events = (data || []) as SecurityEvent[];

  // Calculate statistics
  const byType: Record<string, number> = {};
  const bySeverity: Record<SecuritySeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  let investigatedCount = 0;
  let uninvestigatedCount = 0;

  for (const event of events) {
    // Count by type
    byType[event.event_type] = (byType[event.event_type] || 0) + 1;

    // Count by severity
    bySeverity[event.severity]++;

    // Count investigated status
    if (event.investigated) {
      investigatedCount++;
    } else {
      uninvestigatedCount++;
    }
  }

  return {
    data: {
      totalEvents: events.length,
      byType,
      bySeverity,
      investigatedCount,
      uninvestigatedCount,
    },
    error: null,
  };
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Deletes old security events beyond retention period
 *
 * @param retentionDays - Number of days to retain events (default: 90)
 * @returns Number of deleted events
 */
export async function cleanupOldEvents(
  retentionDays: number = 90
): Promise<{ deletedCount: number; error: string | null }> {
  const supabase = await createClient() as unknown as AnySupabaseClient;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const { data, error } = await supabase
    .from('security_events')
    .delete()
    .lt('timestamp', cutoffDate.toISOString())
    .select('id');

  if (error) {
    return { deletedCount: 0, error: error.message };
  }

  return { deletedCount: data?.length || 0, error: null };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validates that an event has all required fields
 *
 * @param event - The event to validate
 * @returns Whether the event is valid
 */
export function isValidEvent(event: Partial<SecurityEvent>): boolean {
  return !!(
    event.timestamp &&
    event.event_type &&
    event.severity &&
    event.description
  );
}

/**
 * Gets the severity level as a numeric value for comparison
 *
 * @param severity - The severity level
 * @returns Numeric severity (0-3)
 */
export function getSeverityLevel(severity: SecuritySeverity): number {
  const levels: Record<SecuritySeverity, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };
  return levels[severity] ?? 0;
}

/**
 * Compares two severity levels
 *
 * @param a - First severity
 * @param b - Second severity
 * @returns Negative if a < b, positive if a > b, 0 if equal
 */
export function compareSeverity(
  a: SecuritySeverity,
  b: SecuritySeverity
): number {
  return getSeverityLevel(a) - getSeverityLevel(b);
}
