// lib/notification-sender-utils.ts
// Notification sending utilities for n8n Notification Workflows (v0.67)

import type {
  NotificationTemplate,
  NotificationWorkflowPreference,
  NotificationChannel,
  RenderedNotification,
  SendNotificationResult,
  NotificationEventType,
} from '@/types/notification-workflows';
import { renderTemplate, getTemplateSupportedChannels } from './notification-template-utils';
import { 
  getEnabledChannels, 
  isTimeInQuietHours, 
  shouldBatchNotification,
  createDefaultPreference,
} from './notification-preference-utils';
import { validatePhoneNumber } from './phone-validation-utils';

// ============================================================================
// Channel Filtering
// ============================================================================

/**
 * Get channels that should receive the notification based on:
 * 1. User preferences (enabled channels)
 * 2. Template support (channels with content)
 * 3. Recipient availability (email/phone provided)
 */
export function getDeliveryChannels(
  template: NotificationTemplate,
  preference: NotificationWorkflowPreference,
  recipientEmail?: string,
  recipientPhone?: string
): NotificationChannel[] {
  // Get channels enabled by user preference
  const enabledChannels = getEnabledChannels(preference);
  
  // Get channels supported by template
  const supportedChannels = getTemplateSupportedChannels(template);
  
  // Filter to channels that are both enabled and supported
  const availableChannels = enabledChannels.filter(ch => supportedChannels.includes(ch));
  
  // Further filter based on recipient availability
  return availableChannels.filter(channel => {
    switch (channel) {
      case 'email':
        return !!recipientEmail && isValidEmail(recipientEmail);
      case 'whatsapp':
        return !!recipientPhone && validatePhoneNumber(recipientPhone).valid;
      case 'in_app':
        return true; // Always available for authenticated users
      case 'push':
        return true; // Assume push is available if enabled
      default:
        return false;
    }
  });
}

/**
 * Get channels that will be skipped and reasons
 */
export function getSkippedChannels(
  template: NotificationTemplate,
  preference: NotificationWorkflowPreference,
  recipientEmail?: string,
  recipientPhone?: string
): Array<{ channel: NotificationChannel; reason: string }> {
  const skipped: Array<{ channel: NotificationChannel; reason: string }> = [];
  const supportedChannels = getTemplateSupportedChannels(template);
  const allChannels: NotificationChannel[] = ['email', 'whatsapp', 'in_app', 'push'];

  for (const channel of allChannels) {
    // Check if template supports this channel
    if (!supportedChannels.includes(channel)) {
      skipped.push({ channel, reason: 'Template does not support this channel' });
      continue;
    }

    // Check if user has enabled this channel
    const isEnabled = isChannelEnabledInPreference(preference, channel);
    if (!isEnabled) {
      skipped.push({ channel, reason: 'Channel disabled in user preferences' });
      continue;
    }

    // Check recipient availability
    if (channel === 'email' && (!recipientEmail || !isValidEmail(recipientEmail))) {
      skipped.push({ channel, reason: 'No valid email address provided' });
      continue;
    }

    if (channel === 'whatsapp' && (!recipientPhone || !validatePhoneNumber(recipientPhone).valid)) {
      skipped.push({ channel, reason: 'No valid phone number provided' });
      continue;
    }
  }

  return skipped;
}

function isChannelEnabledInPreference(
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

// ============================================================================
// Quiet Hours and Batching
// ============================================================================

/**
 * Check if notification should be delayed due to quiet hours
 */
export function shouldDelayForQuietHours(
  preference: NotificationWorkflowPreference,
  sendTime: Date = new Date()
): boolean {
  return isTimeInQuietHours(preference, sendTime);
}

/**
 * Check if notification should be batched for digest
 */
export function shouldBatchForDigest(preference: NotificationWorkflowPreference): boolean {
  return shouldBatchNotification(preference);
}

/**
 * Determine delivery timing based on preferences
 */
export type DeliveryTiming = 'immediate' | 'delayed_quiet_hours' | 'batched_digest';

export function getDeliveryTiming(
  preference: NotificationWorkflowPreference,
  sendTime: Date = new Date()
): DeliveryTiming {
  // Check quiet hours first
  if (shouldDelayForQuietHours(preference, sendTime)) {
    return 'delayed_quiet_hours';
  }
  
  // Check digest batching
  if (shouldBatchForDigest(preference)) {
    return 'batched_digest';
  }
  
  return 'immediate';
}

// ============================================================================
// Notification Rendering
// ============================================================================

/**
 * Render notifications for all delivery channels
 */
export function renderNotificationsForChannels(
  template: NotificationTemplate,
  data: Record<string, string>,
  channels: NotificationChannel[]
): RenderedNotification[] {
  const rendered: RenderedNotification[] = [];

  for (const channel of channels) {
    const notification = renderTemplate({ template, data, channel });
    if (notification) {
      rendered.push(notification);
    }
  }

  return rendered;
}

/**
 * Prepare notification for sending
 * Returns rendered notifications and delivery info
 */
export interface PreparedNotification {
  rendered: RenderedNotification[];
  deliveryChannels: NotificationChannel[];
  skippedChannels: Array<{ channel: NotificationChannel; reason: string }>;
  timing: DeliveryTiming;
  shouldSendNow: boolean;
}

export function prepareNotification(
  template: NotificationTemplate,
  preference: NotificationWorkflowPreference,
  data: Record<string, string>,
  recipientEmail?: string,
  recipientPhone?: string,
  sendTime: Date = new Date()
): PreparedNotification {
  // Get delivery channels
  const deliveryChannels = getDeliveryChannels(template, preference, recipientEmail, recipientPhone);
  const skippedChannels = getSkippedChannels(template, preference, recipientEmail, recipientPhone);
  
  // Get timing
  const timing = getDeliveryTiming(preference, sendTime);
  const shouldSendNow = timing === 'immediate';
  
  // Render notifications
  const rendered = renderNotificationsForChannels(template, data, deliveryChannels);

  return {
    rendered,
    deliveryChannels,
    skippedChannels,
    timing,
    shouldSendNow,
  };
}

// ============================================================================
// Email Validation Helper
// ============================================================================

/**
 * Basic email validation
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

// ============================================================================
// Notification Result Builder
// ============================================================================

/**
 * Build a successful notification result
 */
export function buildSuccessResult(
  channelsSent: NotificationChannel[],
  channelsSkipped: NotificationChannel[],
  logIds: string[]
): SendNotificationResult {
  return {
    success: true,
    channels_sent: channelsSent,
    channels_skipped: channelsSkipped,
    log_ids: logIds,
    errors: [],
  };
}

/**
 * Build a partial success result (some channels failed)
 */
export function buildPartialResult(
  channelsSent: NotificationChannel[],
  channelsSkipped: NotificationChannel[],
  logIds: string[],
  errors: Array<{ channel: NotificationChannel; error: string }>
): SendNotificationResult {
  return {
    success: channelsSent.length > 0,
    channels_sent: channelsSent,
    channels_skipped: channelsSkipped,
    log_ids: logIds,
    errors,
  };
}

/**
 * Build a failure result
 */
export function buildFailureResult(
  error: string,
  channelsSkipped: NotificationChannel[] = []
): SendNotificationResult {
  return {
    success: false,
    channels_sent: [],
    channels_skipped: channelsSkipped,
    log_ids: [],
    errors: [{ channel: 'email', error }], // Generic error
  };
}

// ============================================================================
// Default Preference Helper
// ============================================================================

/**
 * Get preference or create default for notification sending
 */
export function getPreferenceForSending(
  preference: NotificationWorkflowPreference | null,
  userId: string,
  eventType: string
): NotificationWorkflowPreference {
  if (preference) {
    return preference;
  }
  
  // Return default preference
  return createDefaultPreference(userId, eventType as NotificationEventType);
}
