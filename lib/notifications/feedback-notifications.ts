/**
 * Feedback Notification Functions
 * v0.81 Bug Report & Improvement Request System
 */

import { createClient } from '@/lib/supabase/server';
import { createNotification, createBulkNotifications, getUsersByRoles } from './notification-service';
import { NotificationPriority } from '@/types/notifications';
import type { FeedbackType, FeedbackStatus, Severity } from '@/types/feedback';

/**
 * Notify admins when a new feedback is submitted
 */
export async function notifyNewFeedback(
  ticketNumber: string,
  feedbackType: FeedbackType,
  title: string,
  severity: Severity | null,
  submitterName: string
): Promise<void> {
  try {
    // Get admin users
    const adminUsers = await getUsersByRoles(['admin', 'super_admin']);
    
    if (adminUsers.length === 0) return;

    const typeLabel = feedbackType === 'bug' ? 'Bug Report' : 
                      feedbackType === 'improvement' ? 'Improvement Request' : 
                      feedbackType === 'question' ? 'Question' : 'Feedback';
    
    const priority: NotificationPriority = severity === 'critical' ? 'urgent' : 
                                           severity === 'high' ? 'high' : 'normal';

    await createBulkNotifications(
      {
        title: `New ${typeLabel}: ${ticketNumber}`,
        message: `${submitterName} submitted: "${title}"${severity ? ` (${severity} severity)` : ''}`,
        type: 'info',
        priority,
        actionUrl: `/admin/feedback`,
        entityType: 'feedback',
        entityId: ticketNumber,
      },
      { userIds: adminUsers.map(u => u.id) }
    );
  } catch (error) {
    console.error('Failed to send new feedback notification:', error);
  }
}

/**
 * Notify submitter when feedback status changes
 */
export async function notifyFeedbackStatusChange(
  feedbackId: string,
  ticketNumber: string,
  submitterId: string,
  oldStatus: FeedbackStatus,
  newStatus: FeedbackStatus,
  resolutionNotes?: string
): Promise<void> {
  try {
    const statusLabels: Record<FeedbackStatus, string> = {
      new: 'New',
      reviewing: 'Under Review',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
      wont_fix: "Won't Fix",
      duplicate: 'Duplicate',
    };

    const isResolved = ['resolved', 'closed', 'wont_fix'].includes(newStatus);
    const priority: NotificationPriority = isResolved ? 'normal' : 'low';

    let message = `Your ticket ${ticketNumber} status changed from "${statusLabels[oldStatus]}" to "${statusLabels[newStatus]}"`;
    if (resolutionNotes && isResolved) {
      message += `. Resolution: ${resolutionNotes.substring(0, 100)}${resolutionNotes.length > 100 ? '...' : ''}`;
    }

    await createNotification({
      userId: submitterId,
      title: `Feedback Status Updated: ${ticketNumber}`,
      message,
      type: 'status_change',
      priority,
      actionUrl: `/feedback`,
      entityType: 'feedback',
      entityId: feedbackId,
    });
  } catch (error) {
    console.error('Failed to send status change notification:', error);
  }
}

/**
 * Notify when a comment is added to feedback
 */
export async function notifyFeedbackComment(
  feedbackId: string,
  ticketNumber: string,
  recipientId: string,
  commenterName: string,
  isInternal: boolean
): Promise<void> {
  try {
    // Don't notify for internal comments to submitters
    if (isInternal) return;

    await createNotification({
      userId: recipientId,
      title: `New Comment on ${ticketNumber}`,
      message: `${commenterName} commented on your feedback`,
      type: 'info',
      priority: 'low',
      actionUrl: `/feedback`,
      entityType: 'feedback',
      entityId: feedbackId,
    });
  } catch (error) {
    console.error('Failed to send comment notification:', error);
  }
}

/**
 * Notify when feedback is assigned to someone
 */
export async function notifyFeedbackAssignment(
  feedbackId: string,
  ticketNumber: string,
  title: string,
  assigneeId: string,
  severity: Severity | null
): Promise<void> {
  try {
    const priority: NotificationPriority = severity === 'critical' ? 'urgent' : 
                                           severity === 'high' ? 'high' : 'normal';

    await createNotification({
      userId: assigneeId,
      title: `Feedback Assigned: ${ticketNumber}`,
      message: `You have been assigned to: "${title}"${severity ? ` (${severity} severity)` : ''}`,
      type: 'approval',
      priority,
      actionUrl: `/admin/feedback`,
      entityType: 'feedback',
      entityId: feedbackId,
    });
  } catch (error) {
    console.error('Failed to send assignment notification:', error);
  }
}
