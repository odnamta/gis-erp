// lib/notification-preference-utils.ts
// Preference management utilities for n8n Notification Workflows (v0.67)

import { createClient } from '@/lib/supabase/client';
import type {
  NotificationWorkflowPreference,
  NotificationWorkflowPreferenceInsert,
  NotificationWorkflowPreferenceUpdate,
  EventType,
  DigestFrequency,
  NotificationChannel,
} from '@/types/notification-workflows';

// Re-export default preference for convenience
export { DEFAULT_PREFERENCE } from '@/types/notification-workflows';

// ============================================================================
// Preference CRUD Operations
// ============================================================================

/**
 * Get a user's preference for a specific event type
 */
export async function getPreference(
  userId: string,
  eventType: EventType
): Promise<{ data: NotificationWorkflowPreference | null; error: string | null }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_workflow_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: error.message };
  }

  return { data: data as NotificationWorkflowPreference | null, error: null };
}

/**
 * Get a user's preference or return default values if not set
 */
export async function getPreferenceOrDefault(
  userId: string,
  eventType: EventType
): Promise<{ data: NotificationWorkflowPreference; error: string | null }> {
  const { data, error } = await getPreference(userId, eventType);

  if (error) {
    return { data: createDefaultPreference(userId, eventType), error };
  }

  if (!data) {
    return { data: createDefaultPreference(userId, eventType), error: null };
  }

  return { data, error: null };
}

/**
 * Get all preferences for a user
 */
export async function getUserPreferences(
  userId: string
): Promise<{ data: NotificationWorkflowPreference[]; error: string | null }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_workflow_preferences')
    .select('*')
    .eq('user_id', userId)
    .order('event_type');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as NotificationWorkflowPreference[]) || [], error: null };
}

/**
 * Create or update a user's preference (upsert)
 */
export async function upsertPreference(
  preference: NotificationWorkflowPreferenceInsert
): Promise<{ data: NotificationWorkflowPreference | null; error: string | null }> {
  const validation = validatePreference(preference);
  if (!validation.valid) {
    return { data: null, error: validation.error! };
  }

  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_workflow_preferences')
    .upsert(
      {
        ...preference,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,event_type' }
    )
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as NotificationWorkflowPreference, error: null };
}

/**
 * Update an existing preference by ID
 */
export async function updatePreference(
  id: string,
  updates: NotificationWorkflowPreferenceUpdate
): Promise<{ data: NotificationWorkflowPreference | null; error: string | null }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_workflow_preferences')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as NotificationWorkflowPreference, error: null };
}

/**
 * Delete a user's preference for a specific event type
 */
export async function deletePreference(
  userId: string,
  eventType: EventType
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('notification_workflow_preferences')
    .delete()
    .eq('user_id', userId)
    .eq('event_type', eventType);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Bulk update preferences for a user
 */
export async function bulkUpsertPreferences(
  userId: string,
  preferences: Array<Omit<NotificationWorkflowPreferenceInsert, 'user_id'>>
): Promise<{ data: NotificationWorkflowPreference[]; errors: string[] }> {
  const results: NotificationWorkflowPreference[] = [];
  const errors: string[] = [];

  for (const pref of preferences) {
    const { data, error } = await upsertPreference({
      ...pref,
      user_id: userId,
    });

    if (error) {
      errors.push(`${pref.event_type}: ${error}`);
    } else if (data) {
      results.push(data);
    }
  }

  return { data: results, errors };
}

// ============================================================================
// Default Preference Creation
// ============================================================================

/**
 * Create a default preference object (not persisted)
 */
export function createDefaultPreference(
  userId: string,
  eventType: EventType
): NotificationWorkflowPreference {
  const now = new Date().toISOString();
  return {
    id: '', // Empty ID indicates not persisted
    user_id: userId,
    event_type: eventType,
    email_enabled: true,
    whatsapp_enabled: false,
    in_app_enabled: true,
    push_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
    digest_frequency: 'immediate',
    created_at: now,
    updated_at: now,
  };
}

/**
 * Check if a preference is using default values (not customized)
 */
export function isDefaultPreference(preference: NotificationWorkflowPreference): boolean {
  return (
    preference.email_enabled === true &&
    preference.whatsapp_enabled === false &&
    preference.in_app_enabled === true &&
    preference.push_enabled === false &&
    preference.quiet_hours_start === null &&
    preference.quiet_hours_end === null &&
    preference.digest_frequency === 'immediate'
  );
}

// ============================================================================
// Preference Validation
// ============================================================================

export interface PreferenceValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a preference before creation/update
 */
export function validatePreference(
  preference: NotificationWorkflowPreferenceInsert | NotificationWorkflowPreferenceUpdate
): PreferenceValidationResult {
  // Validate event_type if provided
  if ('event_type' in preference && preference.event_type !== undefined) {
    const validEventTypes: EventType[] = [
      'job_order.assigned',
      'job_order.status_changed',
      'invoice.sent',
      'invoice.overdue',
      'incident.created',
      'document.expiring',
      'maintenance.due',
      'approval.required',
    ];
    if (!validEventTypes.includes(preference.event_type)) {
      return { valid: false, error: `Invalid event type: ${preference.event_type}` };
    }
  }

  // Validate digest_frequency if provided
  if ('digest_frequency' in preference && preference.digest_frequency !== undefined) {
    const validFrequencies: DigestFrequency[] = ['immediate', 'hourly', 'daily'];
    if (!validFrequencies.includes(preference.digest_frequency)) {
      return { valid: false, error: `Invalid digest frequency: ${preference.digest_frequency}` };
    }
  }

  // Validate quiet hours format if provided
  if (preference.quiet_hours_start !== undefined && preference.quiet_hours_start !== null) {
    if (!isValidTimeFormat(preference.quiet_hours_start)) {
      return { valid: false, error: 'Invalid quiet hours start time format. Use HH:MM' };
    }
  }

  if (preference.quiet_hours_end !== undefined && preference.quiet_hours_end !== null) {
    if (!isValidTimeFormat(preference.quiet_hours_end)) {
      return { valid: false, error: 'Invalid quiet hours end time format. Use HH:MM' };
    }
  }

  // If one quiet hour is set, both should be set
  const hasStart = preference.quiet_hours_start !== undefined && preference.quiet_hours_start !== null;
  const hasEnd = preference.quiet_hours_end !== undefined && preference.quiet_hours_end !== null;
  if (hasStart !== hasEnd) {
    return { valid: false, error: 'Both quiet hours start and end must be set together' };
  }

  return { valid: true };
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(time);
}

// ============================================================================
// Channel Helpers
// ============================================================================

/**
 * Get enabled channels from a preference
 */
export function getEnabledChannels(preference: NotificationWorkflowPreference): NotificationChannel[] {
  const channels: NotificationChannel[] = [];
  
  if (preference.email_enabled) channels.push('email');
  if (preference.whatsapp_enabled) channels.push('whatsapp');
  if (preference.in_app_enabled) channels.push('in_app');
  if (preference.push_enabled) channels.push('push');
  
  return channels;
}

/**
 * Check if a specific channel is enabled
 */
export function isChannelEnabled(
  preference: NotificationWorkflowPreference,
  channel: NotificationChannel
): boolean {
  switch (channel) {
    case 'email':
      return preference.email_enabled;
    case 'whatsapp':
      return preference.whatsapp_enabled;
    case 'in_app':
      return preference.in_app_enabled;
    case 'push':
      return preference.push_enabled;
    default:
      return false;
  }
}

/**
 * Set channel enabled status in a preference update object
 */
export function setChannelEnabled(
  channel: NotificationChannel,
  enabled: boolean
): NotificationWorkflowPreferenceUpdate {
  switch (channel) {
    case 'email':
      return { email_enabled: enabled };
    case 'whatsapp':
      return { whatsapp_enabled: enabled };
    case 'in_app':
      return { in_app_enabled: enabled };
    case 'push':
      return { push_enabled: enabled };
    default:
      return {};
  }
}

// ============================================================================
// Quiet Hours Helpers
// ============================================================================

/**
 * Check if current time is within quiet hours
 */
export function isInQuietHours(preference: NotificationWorkflowPreference): boolean {
  if (!preference.quiet_hours_start || !preference.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMin] = preference.quiet_hours_start.split(':').map(Number);
  const [endHour, endMin] = preference.quiet_hours_end.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if a specific time is within quiet hours
 */
export function isTimeInQuietHours(
  preference: NotificationWorkflowPreference,
  time: Date
): boolean {
  if (!preference.quiet_hours_start || !preference.quiet_hours_end) {
    return false;
  }

  const currentMinutes = time.getHours() * 60 + time.getMinutes();
  
  const [startHour, startMin] = preference.quiet_hours_start.split(':').map(Number);
  const [endHour, endMin] = preference.quiet_hours_end.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight quiet hours
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ============================================================================
// Digest Frequency Helpers
// ============================================================================

/**
 * Check if notification should be batched based on digest frequency
 */
export function shouldBatchNotification(preference: NotificationWorkflowPreference): boolean {
  return preference.digest_frequency !== 'immediate';
}

/**
 * Get the next digest time based on frequency
 */
export function getNextDigestTime(
  preference: NotificationWorkflowPreference,
  fromTime: Date = new Date()
): Date | null {
  if (preference.digest_frequency === 'immediate') {
    return null;
  }

  const nextTime = new Date(fromTime);

  if (preference.digest_frequency === 'hourly') {
    // Next hour, on the hour
    nextTime.setMinutes(0, 0, 0);
    nextTime.setHours(nextTime.getHours() + 1);
  } else if (preference.digest_frequency === 'daily') {
    // Next day at 9 AM
    nextTime.setHours(9, 0, 0, 0);
    if (nextTime <= fromTime) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
  }

  return nextTime;
}
