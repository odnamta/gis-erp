'use server';

// app/actions/notification-workflow-actions.ts
// Server actions for n8n Notification Workflows (v0.67)

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  NotificationTemplate,
  NotificationWorkflowPreference,
  NotificationLogEntry,
  SendNotificationInput,
  SendNotificationResult,
  EventType,
  NotificationChannel,
} from '@/types/notification-workflows';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type helper for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;
import {
  getTemplateByCode,
  renderTemplate,
  getTemplateSupportedChannels,
} from '@/lib/notification-template-utils';
import {
  getPreferenceOrDefault,
  getEnabledChannels,
  isTimeInQuietHours,
  shouldBatchNotification,
} from '@/lib/notification-preference-utils';
import {
  getDeliveryChannels,
  prepareNotification,
  isValidEmail,
  buildSuccessResult,
  buildPartialResult,
  buildFailureResult,
} from '@/lib/notification-sender-utils';
import {
  createLogEntry,
  markLogSent,
  markLogFailed,
  buildPendingLogEntry,
} from '@/lib/notification-log-utils';
import { validatePhoneNumber } from '@/lib/phone-validation-utils';

// ============================================================================
// Send Notification Action
// ============================================================================

/**
 * Send a notification to a user based on template and preferences
 */
export async function sendNotification(
  input: SendNotificationInput
): Promise<SendNotificationResult> {
  try {
    // Get template
    const { data: template, error: templateError } = await getTemplateByCode(input.template_code);
    
    if (templateError || !template) {
      return buildFailureResult(`Template not found: ${input.template_code}`);
    }

    if (!template.is_active) {
      return buildFailureResult(`Template is inactive: ${input.template_code}`);
    }

    // Get user preference
    const { data: preference } = await getPreferenceOrDefault(
      input.recipient_user_id,
      template.event_type
    );

    // Prepare notification
    const prepared = prepareNotification(
      template,
      preference,
      input.data,
      input.recipient_email,
      input.recipient_phone
    );

    // If no channels to send to, return early
    if (prepared.deliveryChannels.length === 0) {
      return buildSuccessResult(
        [],
        prepared.skippedChannels.map(s => s.channel),
        []
      );
    }

    // Check if should delay or batch
    if (!prepared.shouldSendNow) {
      // Queue for later delivery (in real implementation, this would add to a queue)
    }

    // Send to each channel and log results
    const logIds: string[] = [];
    const channelsSent: NotificationChannel[] = [];
    const errors: Array<{ channel: NotificationChannel; error: string }> = [];

    for (const rendered of prepared.rendered) {
      // Create log entry
      const logEntry = buildPendingLogEntry(
        template.id,
        input.recipient_user_id,
        rendered.channel,
        rendered.subject || null,
        rendered.body,
        {
          recipientEmail: input.recipient_email,
          recipientPhone: input.recipient_phone,
          entityType: input.entity_type,
          entityId: input.entity_id,
        }
      );

      const { data: log, error: logError } = await createLogEntry(logEntry);
      
      if (logError || !log) {
        errors.push({ channel: rendered.channel, error: logError || 'Failed to create log entry' });
        continue;
      }

      logIds.push(log.id);

      // In a real implementation, this would call the actual delivery service
      // For now, we'll simulate successful sending
      try {
        await simulateChannelDelivery(rendered.channel, rendered, input);
        await markLogSent(log.id);
        channelsSent.push(rendered.channel);
      } catch (deliveryError) {
        const errorMsg = deliveryError instanceof Error ? deliveryError.message : 'Delivery failed';
        await markLogFailed(log.id, errorMsg);
        errors.push({ channel: rendered.channel, error: errorMsg });
      }
    }

    if (errors.length > 0 && channelsSent.length > 0) {
      return buildPartialResult(
        channelsSent,
        prepared.skippedChannels.map(s => s.channel),
        logIds,
        errors
      );
    }

    if (channelsSent.length === 0) {
      return buildFailureResult('All delivery channels failed', prepared.skippedChannels.map(s => s.channel));
    }

    return buildSuccessResult(
      channelsSent,
      prepared.skippedChannels.map(s => s.channel),
      logIds
    );
  } catch (error) {
    console.error('sendNotification error:', error);
    return buildFailureResult(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Simulate channel delivery (placeholder for actual implementation)
 */
async function simulateChannelDelivery(
  channel: NotificationChannel,
  rendered: { body: string; subject?: string; title?: string },
  input: SendNotificationInput
): Promise<void> {
  // In production, this would call:
  // - Email: SendGrid, AWS SES, etc.
  // - WhatsApp: WhatsApp Business API via n8n
  // - In-app: Insert into notifications table
  // - Push: Firebase Cloud Messaging, etc.
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
}

// ============================================================================
// Trigger Event Notification Action
// ============================================================================

/**
 * Trigger notifications for a business event
 * This is called by database triggers or application code when events occur
 */
export async function triggerEventNotification(
  eventType: EventType,
  recipientUserIds: string[],
  data: Record<string, string>,
  entityType?: string,
  entityId?: string
): Promise<{ success: boolean; results: SendNotificationResult[] }> {
  const results: SendNotificationResult[] = [];

  // Map event type to template code
  const templateCodeMap: Record<EventType, string> = {
    'job_order.assigned': 'JO_ASSIGNED',
    'job_order.status_changed': 'JO_STATUS_UPDATE',
    'invoice.sent': 'INVOICE_SENT',
    'invoice.overdue': 'INVOICE_OVERDUE',
    'incident.created': 'INCIDENT_REPORTED',
    'document.expiring': 'DOCUMENT_EXPIRING',
    'maintenance.due': 'MAINTENANCE_DUE',
    'approval.required': 'APPROVAL_REQUIRED',
  };

  const templateCode = templateCodeMap[eventType];
  if (!templateCode) {
    return { success: false, results: [] };
  }

  // Get user emails/phones from database
  const supabase = await createClient();
  
  for (const userId of recipientUserIds) {
    // Get user profile for email (phone may not exist in all setups)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single();

    const result = await sendNotification({
      template_code: templateCode,
      recipient_user_id: userId,
      recipient_email: profile?.email,
      recipient_phone: undefined, // Phone not available in user_profiles
      data: {
        ...data,
        action_url: data.action_url || `/${entityType}s/${entityId}`,
      },
      entity_type: entityType,
      entity_id: entityId,
    });

    results.push(result);
  }

  const allSuccess = results.every(r => r.success);
  return { success: allSuccess, results };
}

// ============================================================================
// Preference Management Actions
// ============================================================================

/**
 * Get user's notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<{ data: NotificationWorkflowPreference[]; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
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
 * Update user's notification preference for an event type
 */
export async function updateNotificationPreference(
  userId: string,
  eventType: EventType,
  updates: {
    email_enabled?: boolean;
    whatsapp_enabled?: boolean;
    in_app_enabled?: boolean;
    push_enabled?: boolean;
    quiet_hours_start?: string | null;
    quiet_hours_end?: string | null;
    digest_frequency?: 'immediate' | 'hourly' | 'daily';
  }
): Promise<{ data: NotificationWorkflowPreference | null; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
  const { data, error } = await supabase
    .from('notification_workflow_preferences')
    .upsert(
      {
        user_id: userId,
        event_type: eventType,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,event_type' }
    )
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/settings/notifications');
  return { data: data as NotificationWorkflowPreference, error: null };
}

/**
 * Bulk update notification preferences
 */
export async function bulkUpdateNotificationPreferences(
  userId: string,
  preferences: Array<{
    event_type: EventType;
    email_enabled?: boolean;
    whatsapp_enabled?: boolean;
    in_app_enabled?: boolean;
    push_enabled?: boolean;
  }>
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
  const updates = preferences.map(pref => ({
    user_id: userId,
    event_type: pref.event_type,
    email_enabled: pref.email_enabled,
    whatsapp_enabled: pref.whatsapp_enabled,
    in_app_enabled: pref.in_app_enabled,
    push_enabled: pref.push_enabled,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('notification_workflow_preferences')
    .upsert(updates, { onConflict: 'user_id,event_type' });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings/notifications');
  return { success: true, error: null };
}

// ============================================================================
// Log Query Actions
// ============================================================================

/**
 * Get notification logs for current user
 */
export async function getMyNotificationLogs(
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
    channel?: string;
  }
): Promise<{ data: NotificationLogEntry[]; total: number; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: [], total: 0, error: 'Not authenticated' };
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  let query = supabase
    .from('notification_log')
    .select('*', { count: 'exact' })
    .eq('recipient_user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.channel) {
    query = query.eq('channel', options.channel);
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

/**
 * Get notification logs for an entity (admin only)
 */
export async function getEntityNotificationLogs(
  entityType: string,
  entityId: string
): Promise<{ data: NotificationLogEntry[]; error: string | null }> {
  const supabase = await createClient() as AnySupabaseClient;
  
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
