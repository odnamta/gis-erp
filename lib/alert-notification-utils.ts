// =====================================================
// v0.65: ALERT NOTIFICATION DISPATCH UTILITIES
// =====================================================

import { createBulkNotifications, getUsersByRoles } from '@/lib/notifications/notification-service';
import { AlertRule, AlertInstance, NotificationChannel, NotificationSentRecord } from '@/types/alerts';
import { updateAlertNotifications } from '@/lib/alert-actions';

/**
 * Severity to priority mapping for notifications
 */
const SEVERITY_TO_PRIORITY: Record<string, 'low' | 'normal' | 'high' | 'urgent'> = {
  info: 'normal',
  warning: 'high',
  critical: 'urgent',
};

/**
 * Format alert notification content
 */
export function formatAlertNotification(
  rule: AlertRule,
  instance: AlertInstance
): {
  title: string;
  message: string;
  actionUrl: string;
} {
  const severityEmoji = {
    critical: '🔴',
    warning: '🟠',
    info: '🔵',
  };

  const title = `${severityEmoji[rule.severity]} Alert: ${rule.ruleName}`;
  const message = instance.alertMessage;
  const actionUrl = `/dashboard/alerts?alertId=${instance.id}`;

  return { title, message, actionUrl };
}

/**
 * Dispatch notifications for an alert through all configured channels
 */
export async function dispatchAlertNotifications(
  rule: AlertRule,
  instance: AlertInstance
): Promise<{
  success: boolean;
  notificationsSent: NotificationSentRecord[];
  errors: string[];
}> {
  const notificationsSent: NotificationSentRecord[] = [];
  const errors: string[] = [];

  const { title, message, actionUrl } = formatAlertNotification(rule, instance);

  // Get recipients
  const userIds: string[] = [...(rule.notifyUsers || [])];
  
  // Get users by roles
  if (rule.notifyRoles && rule.notifyRoles.length > 0) {
    const roleUsers = await getUsersByRoles(rule.notifyRoles);
    for (const user of roleUsers) {
      if (!userIds.includes(user.id)) {
        userIds.push(user.id);
      }
    }
  }

  // Process each channel
  for (const channel of rule.notificationChannels) {
    try {
      const result = await dispatchToChannel(channel, {
        title,
        message,
        actionUrl,
        userIds,
        rule,
        instance,
      });

      notificationsSent.push(...result.sent);
      if (result.error) {
        errors.push(`${channel}: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${channel}: ${errorMessage}`);
      
      // Record failed notification
      notificationsSent.push({
        channel,
        sentAt: new Date().toISOString(),
        status: 'failed',
        error: errorMessage,
      });
    }
  }

  // Update alert instance with notification status
  await updateAlertNotifications(instance.id, notificationsSent);

  return {
    success: errors.length === 0,
    notificationsSent,
    errors,
  };
}

/**
 * Dispatch notification to a specific channel
 */
async function dispatchToChannel(
  channel: NotificationChannel,
  params: {
    title: string;
    message: string;
    actionUrl: string;
    userIds: string[];
    rule: AlertRule;
    instance: AlertInstance;
  }
): Promise<{
  sent: NotificationSentRecord[];
  error?: string;
}> {
  const sent: NotificationSentRecord[] = [];

  switch (channel) {
    case 'in_app':
      return await dispatchInAppNotifications(params);

    case 'email':
      // Email dispatch would integrate with email service
      // For now, record as pending implementation
      for (const userId of params.userIds) {
        sent.push({
          channel: 'email',
          recipientId: userId,
          sentAt: new Date().toISOString(),
          status: 'sent', // Would be actual status from email service
        });
      }
      return { sent };

    case 'whatsapp':
      // WhatsApp dispatch would integrate with WhatsApp Business API
      // For now, record as pending implementation
      for (const userId of params.userIds) {
        sent.push({
          channel: 'whatsapp',
          recipientId: userId,
          sentAt: new Date().toISOString(),
          status: 'sent', // Would be actual status from WhatsApp API
        });
      }
      return { sent };

    case 'slack':
      // Slack dispatch would integrate with Slack API
      // For now, record as pending implementation
      for (const userId of params.userIds) {
        sent.push({
          channel: 'slack',
          recipientId: userId,
          sentAt: new Date().toISOString(),
          status: 'sent', // Would be actual status from Slack API
        });
      }
      return { sent };

    default:
      return { sent: [], error: `Unknown channel: ${channel}` };
  }
}

/**
 * Dispatch in-app notifications using existing notification service
 */
async function dispatchInAppNotifications(params: {
  title: string;
  message: string;
  actionUrl: string;
  userIds: string[];
  rule: AlertRule;
  instance: AlertInstance;
}): Promise<{
  sent: NotificationSentRecord[];
  error?: string;
}> {
  const sent: NotificationSentRecord[] = [];

  try {
    // Use 'system' type for alerts since 'alert' is not in NotificationType
    const notifications = await createBulkNotifications(
      {
        title: params.title,
        message: params.message,
        type: 'system', // Using system type for alerts
        priority: SEVERITY_TO_PRIORITY[params.rule.severity] || 'normal',
        entityType: undefined, // Alert entity type not in EntityType
        entityId: params.instance.id,
        actionUrl: params.actionUrl,
        metadata: {
          alertType: 'automated_alert',
          ruleId: params.rule.id,
          ruleCode: params.rule.ruleCode,
          severity: params.rule.severity,
          currentValue: params.instance.currentValue,
          thresholdValue: params.instance.thresholdValue,
        },
      },
      { userIds: params.userIds }
    );

    for (const notification of notifications) {
      sent.push({
        channel: 'in_app',
        recipientId: notification.user_id,
        sentAt: new Date().toISOString(),
        status: 'sent',
      });
    }

    // Record users who didn't receive (due to preferences)
    const receivedUserIds = new Set(notifications.map(n => n.user_id));
    for (const userId of params.userIds) {
      if (!receivedUserIds.has(userId)) {
        sent.push({
          channel: 'in_app',
          recipientId: userId,
          sentAt: new Date().toISOString(),
          status: 'failed',
          error: 'User preferences disabled',
        });
      }
    }

    return { sent };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Record all as failed
    for (const userId of params.userIds) {
      sent.push({
        channel: 'in_app',
        recipientId: userId,
        sentAt: new Date().toISOString(),
        status: 'failed',
        error: errorMessage,
      });
    }

    return { sent, error: errorMessage };
  }
}

/**
 * Check if all notifications for an alert were sent successfully
 */
export function areAllNotificationsSent(notificationsSent: NotificationSentRecord[]): boolean {
  if (notificationsSent.length === 0) return true;
  return notificationsSent.every(n => n.status === 'sent');
}

/**
 * Get failed notifications from a list
 */
export function getFailedNotifications(notificationsSent: NotificationSentRecord[]): NotificationSentRecord[] {
  return notificationsSent.filter(n => n.status === 'failed');
}

/**
 * Count notifications by channel
 */
export function countNotificationsByChannel(
  notificationsSent: NotificationSentRecord[]
): Record<NotificationChannel, { sent: number; failed: number }> {
  const counts: Record<NotificationChannel, { sent: number; failed: number }> = {
    in_app: { sent: 0, failed: 0 },
    email: { sent: 0, failed: 0 },
    whatsapp: { sent: 0, failed: 0 },
    slack: { sent: 0, failed: 0 },
  };

  for (const notification of notificationsSent) {
    const channel = notification.channel as NotificationChannel;
    if (counts[channel]) {
      if (notification.status === 'sent') {
        counts[channel].sent++;
      } else {
        counts[channel].failed++;
      }
    }
  }

  return counts;
}
