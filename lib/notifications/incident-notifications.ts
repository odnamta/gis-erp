'use server';

// =====================================================
// v0.46: HSE INCIDENT NOTIFICATION TRIGGERS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { createNotification, createBulkNotifications } from './notification-service';
import { NotificationType, NotificationPriority } from '@/types/notifications';

/**
 * Notify HSE team and supervisor when a new incident is reported
 */
export async function notifyIncidentReported(
  incidentId: string,
  incidentNumber: string,
  title: string,
  severity: string,
  supervisorId?: string
): Promise<void> {
  try {
    const supabase = await createClient();

    // Determine priority based on severity
    const priority: NotificationPriority = 
      severity === 'critical' || severity === 'high' ? 'urgent' :
      severity === 'medium' ? 'high' : 'normal';

    // Notify managers and admins (HSE team)
    await createBulkNotifications(
      {
        title: `Insiden Baru: ${incidentNumber}`,
        message: `${title} - Severity: ${severity.toUpperCase()}`,
        type: 'status_change' as NotificationType,
        priority,
        entityType: 'jo', // Using 'jo' as closest entity type
        entityId: incidentId,
        actionUrl: `/hse/incidents/${incidentId}`,
        metadata: {
          incidentNumber,
          severity,
          type: 'incident_reported',
        },
      },
      { roles: ['owner', 'admin', 'manager'] }
    );

    // Notify supervisor if assigned
    if (supervisorId) {
      // Get supervisor's user_id
      const { data: supervisor } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', supervisorId)
        .single();

      if (supervisor?.user_id) {
        await createNotification({
          userId: supervisor.user_id,
          title: `Insiden Dilaporkan: ${incidentNumber}`,
          message: `Anda ditunjuk sebagai supervisor untuk insiden: ${title}`,
          type: 'status_change' as NotificationType,
          priority,
          entityType: 'jo',
          entityId: incidentId,
          actionUrl: `/hse/incidents/${incidentId}`,
          metadata: {
            incidentNumber,
            severity,
            type: 'supervisor_assigned',
          },
        });
      }
    }
  } catch (error) {
    console.error('Error sending incident reported notifications:', error);
  }
}

/**
 * Notify investigator when assigned to an incident
 */
export async function notifyInvestigatorAssigned(
  incidentId: string,
  incidentNumber: string,
  title: string,
  investigatorId: string
): Promise<void> {
  try {
    const supabase = await createClient();

    // Get investigator's user_id
    const { data: investigator } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', investigatorId)
      .single();

    if (investigator?.user_id) {
      await createNotification({
        userId: investigator.user_id,
        title: `Investigasi Ditugaskan: ${incidentNumber}`,
        message: `Anda ditugaskan untuk menginvestigasi insiden: ${title}`,
        type: 'approval' as NotificationType,
        priority: 'high',
        entityType: 'jo',
        entityId: incidentId,
        actionUrl: `/hse/incidents/${incidentId}`,
        metadata: {
          incidentNumber,
          type: 'investigator_assigned',
        },
      });
    }
  } catch (error) {
    console.error('Error sending investigator assigned notification:', error);
  }
}

/**
 * Notify responsible person when assigned to an action
 */
export async function notifyActionAssigned(
  incidentId: string,
  incidentNumber: string,
  actionDescription: string,
  responsibleId: string,
  actionType: 'corrective' | 'preventive',
  dueDate: string
): Promise<void> {
  try {
    const supabase = await createClient();

    // Get responsible person's user_id
    const { data: responsible } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', responsibleId)
      .single();

    if (responsible?.user_id) {
      const actionLabel = actionType === 'corrective' ? 'Korektif' : 'Preventif';
      
      await createNotification({
        userId: responsible.user_id,
        title: `Tindakan ${actionLabel} Ditugaskan`,
        message: `${actionDescription} - Deadline: ${dueDate}`,
        type: 'approval' as NotificationType,
        priority: 'high',
        entityType: 'jo',
        entityId: incidentId,
        actionUrl: `/hse/incidents/${incidentId}`,
        metadata: {
          incidentNumber,
          actionType,
          dueDate,
          type: 'action_assigned',
        },
      });
    }
  } catch (error) {
    console.error('Error sending action assigned notification:', error);
  }
}

/**
 * Notify when incident is closed
 */
export async function notifyIncidentClosed(
  incidentId: string,
  incidentNumber: string,
  title: string,
  reportedById: string
): Promise<void> {
  try {
    const supabase = await createClient();

    // Get reporter's user_id
    const { data: reporter } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', reportedById)
      .single();

    if (reporter?.user_id) {
      await createNotification({
        userId: reporter.user_id,
        title: `Insiden Ditutup: ${incidentNumber}`,
        message: `Insiden "${title}" telah ditutup`,
        type: 'info' as NotificationType,
        priority: 'normal',
        entityType: 'jo',
        entityId: incidentId,
        actionUrl: `/hse/incidents/${incidentId}`,
        metadata: {
          incidentNumber,
          type: 'incident_closed',
        },
      });
    }
  } catch (error) {
    console.error('Error sending incident closed notification:', error);
  }
}
