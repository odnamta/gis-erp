// lib/notification-log-utils.ts
// Notification logging utilities for n8n Notification Workflows (v0.67)

import { createClient } from '@/lib/supabase/client';
import type {
  NotificationLogEntry,
  NotificationLogInsert,
  NotificationLogUpdate,
  NotificationStatus,
  NotificationChannel,
} from '@/types/notification-workflows';

// Re-export valid transitions
export { VALID_STATUS_TRANSITIONS } from '@/types/notification-workflows';

// ============================================================================
// Log Entry CRUD Operations
// ============================================================================

/**
 * Create a new notification log entry
 */
export async function createLogEntry(
  entry: NotificationLogInsert
): Promise<{ data: NotificationLogEntry | null; error: string | null }> {
  const validation = validateLogEntry(entry);
  if (!validation.valid) {
    return { data: null, error: validation.error! };
  }

  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_log')
    .insert(entry)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as NotificationLogEntry, error: null };
}

/**
 * Get a log entry by ID
 */
export async function getLogEntry(
  id: string
): Promise<{ data: NotificationLogEntry | null; error: string | null }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_log')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: error.message };
  }

  return { data: data as NotificationLogEntry | null, error: null };
}

/**
 * Update log entry status
 */
export async function updateLogStatus(
  id: string,
  newStatus: NotificationStatus,
  additionalUpdates?: Partial<NotificationLogUpdate>
): Promise<{ data: NotificationLogEntry | null; error: string | null }> {
  // First get current entry to validate transition
  const { data: current, error: fetchError } = await getLogEntry(id);
  
  if (fetchError) {
    return { data: null, error: fetchError };
  }
  
  if (!current) {
    return { data: null, error: 'Log entry not found' };
  }

  // Validate status transition
  if (!isValidStatusTransition(current.status, newStatus)) {
    return { 
      data: null, 
      error: `Invalid status transition from ${current.status} to ${newStatus}` 
    };
  }

  const supabase = createClient();
  
  const updates: NotificationLogUpdate = {
    status: newStatus,
    ...additionalUpdates,
  };

  // Set timestamps based on status
  if (newStatus === 'sent' && !updates.sent_at) {
    updates.sent_at = new Date().toISOString();
  }
  if (newStatus === 'delivered' && !updates.delivered_at) {
    updates.delivered_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('notification_log')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as NotificationLogEntry, error: null };
}

/**
 * Mark log entry as failed with error message
 */
export async function markLogFailed(
  id: string,
  errorMessage: string
): Promise<{ data: NotificationLogEntry | null; error: string | null }> {
  return updateLogStatus(id, 'failed', { error_message: errorMessage });
}

/**
 * Mark log entry as delivered
 */
export async function markLogDelivered(
  id: string,
  externalId?: string
): Promise<{ data: NotificationLogEntry | null; error: string | null }> {
  return updateLogStatus(id, 'delivered', { 
    external_id: externalId,
    delivered_at: new Date().toISOString(),
  });
}

/**
 * Mark log entry as sent
 */
export async function markLogSent(
  id: string,
  externalId?: string
): Promise<{ data: NotificationLogEntry | null; error: string | null }> {
  return updateLogStatus(id, 'sent', { 
    external_id: externalId,
    sent_at: new Date().toISOString(),
  });
}

// ============================================================================
// Log Entry Queries
// ============================================================================

/**
 * Get logs by entity (e.g., all notifications for a specific job order)
 */
export async function getLogsByEntity(
  entityType: string,
  entityId: string
): Promise<{ data: NotificationLogEntry[]; error: string | null }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('notification_log')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as NotificationLogEntry[]) || [], error: null };
}

/**
 * Get logs by recipient user
 */
export async function getLogsByRecipient(
  userId: string,
  options?: {
    limit?: number;
    status?: NotificationStatus;
    channel?: NotificationChannel;
  }
): Promise<{ data: NotificationLogEntry[]; error: string | null }> {
  const supabase = createClient();
  
  let query = supabase
    .from('notification_log')
    .select('*')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.channel) {
    query = query.eq('channel', options.channel);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as NotificationLogEntry[]) || [], error: null };
}

/**
 * Get logs by status
 */
export async function getLogsByStatus(
  status: NotificationStatus,
  options?: {
    limit?: number;
    channel?: NotificationChannel;
    startDate?: string;
    endDate?: string;
  }
): Promise<{ data: NotificationLogEntry[]; error: string | null }> {
  const supabase = createClient();
  
  let query = supabase
    .from('notification_log')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (options?.channel) {
    query = query.eq('channel', options.channel);
  }

  if (options?.startDate) {
    query = query.gte('created_at', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: (data as NotificationLogEntry[]) || [], error: null };
}

/**
 * Get recent logs with pagination
 */
export async function getRecentLogs(
  options?: {
    limit?: number;
    offset?: number;
    channel?: NotificationChannel;
    status?: NotificationStatus;
  }
): Promise<{ data: NotificationLogEntry[]; total: number; error: string | null }> {
  const supabase = createClient();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;
  
  let query = supabase
    .from('notification_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.channel) {
    query = query.eq('channel', options.channel);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, count, error } = await query;

  if (error) {
    return { data: [], total: 0, error: error.message };
  }

  return { 
    data: (data as NotificationLogEntry[]) || [], 
    total: count || 0, 
    error: null 
  };
}

// ============================================================================
// Status Transition Validation
// ============================================================================

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(
  currentStatus: NotificationStatus,
  newStatus: NotificationStatus
): boolean {
  const validTransitions: Record<NotificationStatus, NotificationStatus[]> = {
    pending: ['sent', 'failed'],
    sent: ['delivered', 'failed', 'bounced'],
    delivered: [],
    failed: [],
    bounced: [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) ?? false;
}

/**
 * Get valid next statuses for a given status
 */
export function getValidNextStatuses(currentStatus: NotificationStatus): NotificationStatus[] {
  const validTransitions: Record<NotificationStatus, NotificationStatus[]> = {
    pending: ['sent', 'failed'],
    sent: ['delivered', 'failed', 'bounced'],
    delivered: [],
    failed: [],
    bounced: [],
  };

  return validTransitions[currentStatus] || [];
}

/**
 * Check if a status is terminal (no further transitions)
 */
export function isTerminalStatus(status: NotificationStatus): boolean {
  return ['delivered', 'failed', 'bounced'].includes(status);
}

// ============================================================================
// Log Entry Validation
// ============================================================================

export interface LogValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a log entry before creation
 */
export function validateLogEntry(entry: NotificationLogInsert): LogValidationResult {
  // Channel is required
  if (!entry.channel) {
    return { valid: false, error: 'Channel is required' };
  }

  const validChannels: NotificationChannel[] = ['email', 'whatsapp', 'in_app', 'push'];
  if (!validChannels.includes(entry.channel)) {
    return { valid: false, error: `Invalid channel: ${entry.channel}` };
  }

  // Status validation if provided
  if (entry.status) {
    const validStatuses: NotificationStatus[] = ['pending', 'sent', 'delivered', 'failed', 'bounced'];
    if (!validStatuses.includes(entry.status)) {
      return { valid: false, error: `Invalid status: ${entry.status}` };
    }
  }

  // Failed status requires error message
  if (entry.status === 'failed' && !entry.error_message) {
    return { valid: false, error: 'Error message is required for failed status' };
  }

  return { valid: true };
}

/**
 * Check if log entry has complete information
 */
export function isLogEntryComplete(entry: NotificationLogEntry): boolean {
  // Must have channel
  if (!entry.channel) return false;

  // Must have at least one recipient identifier
  if (!entry.recipient_user_id && !entry.recipient_email && !entry.recipient_phone) {
    return false;
  }

  // Must have body content
  if (!entry.body) return false;

  return true;
}

// ============================================================================
// Log Entry Helpers
// ============================================================================

/**
 * Create a pending log entry for a notification
 */
export function buildPendingLogEntry(
  templateId: string | null,
  recipientUserId: string | null,
  channel: NotificationChannel,
  subject: string | null,
  body: string,
  options?: {
    recipientEmail?: string;
    recipientPhone?: string;
    entityType?: string;
    entityId?: string;
  }
): NotificationLogInsert {
  return {
    template_id: templateId,
    recipient_user_id: recipientUserId,
    recipient_email: options?.recipientEmail || null,
    recipient_phone: options?.recipientPhone || null,
    channel,
    subject,
    body,
    status: 'pending',
    entity_type: options?.entityType || null,
    entity_id: options?.entityId || null,
  };
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: NotificationStatus): string {
  const labels: Record<NotificationStatus, string> = {
    pending: 'Pending',
    sent: 'Sent',
    delivered: 'Delivered',
    failed: 'Failed',
    bounced: 'Bounced',
  };
  return labels[status] || status;
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: NotificationStatus): string {
  const colors: Record<NotificationStatus, string> = {
    pending: 'yellow',
    sent: 'blue',
    delivered: 'green',
    failed: 'red',
    bounced: 'orange',
  };
  return colors[status] || 'gray';
}
