'use server';

// =====================================================
// v0.47: HSE SAFETY DOCUMENT NOTIFICATION TRIGGERS
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { createNotification, createBulkNotifications } from './notification-service';
import { NotificationType, NotificationPriority } from '@/types/notifications';

/**
 * Notify reviewers when a document is submitted for review
 */
export async function notifyDocumentSubmittedForReview(
  documentId: string,
  documentNumber: string,
  title: string,
  categoryName: string
): Promise<void> {
  try {
    await createBulkNotifications(
      {
        title: `Dokumen Perlu Review: ${documentNumber}`,
        message: `${title} (${categoryName}) menunggu persetujuan`,
        type: 'approval' as NotificationType,
        priority: 'high' as NotificationPriority,
        entityType: 'jo',
        entityId: documentId,
        actionUrl: `/hse/documents/${documentId}`,
        metadata: {
          documentNumber,
          categoryName,
          type: 'document_review_required',
        },
      },
      { roles: ['owner', 'director', 'sysadmin', 'operations_manager', 'hse'] }
    );
  } catch (_error) {
  }
}

/**
 * Notify preparer when document is approved
 */
export async function notifyDocumentApproved(
  documentId: string,
  documentNumber: string,
  title: string,
  preparedById: string
): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: preparer } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', preparedById)
      .single();

    if (preparer?.user_id) {
      await createNotification({
        userId: preparer.user_id,
        title: `Dokumen Disetujui: ${documentNumber}`,
        message: `Dokumen "${title}" telah disetujui`,
        type: 'info' as NotificationType,
        priority: 'normal' as NotificationPriority,
        entityType: 'jo',
        entityId: documentId,
        actionUrl: `/hse/documents/${documentId}`,
        metadata: {
          documentNumber,
          type: 'document_approved',
        },
      });
    }
  } catch (_error) {
  }
}

/**
 * Notify HSE team about expiring documents
 */
export async function notifyExpiringDocuments(
  documents: Array<{
    id: string;
    documentNumber: string;
    title: string;
    expiryDate: string;
    daysUntilExpiry: number;
  }>
): Promise<void> {
  try {
    if (documents.length === 0) return;

    const message = documents.length === 1
      ? `${documents[0].title} akan kadaluarsa dalam ${documents[0].daysUntilExpiry} hari`
      : `${documents.length} dokumen akan kadaluarsa dalam 30 hari`;

    await createBulkNotifications(
      {
        title: 'Dokumen Akan Kadaluarsa',
        message,
        type: 'reminder' as NotificationType,
        priority: 'high' as NotificationPriority,
        entityType: 'jo',
        entityId: documents[0].id,
        actionUrl: '/hse/documents?filter=expiring',
        metadata: {
          documentCount: documents.length,
          type: 'documents_expiring',
        },
      },
      { roles: ['owner', 'director', 'sysadmin', 'operations_manager', 'hse'] }
    );
  } catch (_error) {
  }
}

/**
 * Notify approvers when a permit is requested
 */
export async function notifyPermitRequested(
  permitId: string,
  permitNumber: string,
  permitType: string,
  workDescription: string,
  workLocation: string
): Promise<void> {
  try {
    await createBulkNotifications(
      {
        title: `Izin Kerja Baru: ${permitNumber}`,
        message: `${permitType} di ${workLocation}: ${workDescription}`,
        type: 'approval' as NotificationType,
        priority: 'urgent' as NotificationPriority,
        entityType: 'jo',
        entityId: permitId,
        actionUrl: `/hse/permits/${permitId}`,
        metadata: {
          permitNumber,
          permitType,
          workLocation,
          type: 'permit_requested',
        },
      },
      { roles: ['owner', 'director', 'sysadmin', 'operations_manager', 'hse'] }
    );
  } catch (_error) {
  }
}

/**
 * Notify requester when permit is approved
 */
export async function notifyPermitApproved(
  permitId: string,
  permitNumber: string,
  requestedById: string
): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: requester } = await supabase
      .from('employees')
      .select('user_id')
      .eq('id', requestedById)
      .single();

    if (requester?.user_id) {
      await createNotification({
        userId: requester.user_id,
        title: `Izin Kerja Disetujui: ${permitNumber}`,
        message: 'Izin kerja Anda telah disetujui dan siap diaktifkan',
        type: 'info' as NotificationType,
        priority: 'high' as NotificationPriority,
        entityType: 'jo',
        entityId: permitId,
        actionUrl: `/hse/permits/${permitId}`,
        metadata: {
          permitNumber,
          type: 'permit_approved',
        },
      });
    }
  } catch (_error) {
  }
}

/**
 * Notify when permit is activated
 */
export async function notifyPermitActivated(
  permitId: string,
  permitNumber: string,
  workLocation: string,
  validTo: string
): Promise<void> {
  try {
    await createBulkNotifications(
      {
        title: `Izin Kerja Aktif: ${permitNumber}`,
        message: `Pekerjaan di ${workLocation} dapat dimulai. Berlaku sampai ${validTo}`,
        type: 'info' as NotificationType,
        priority: 'normal' as NotificationPriority,
        entityType: 'jo',
        entityId: permitId,
        actionUrl: `/hse/permits/${permitId}`,
        metadata: {
          permitNumber,
          workLocation,
          validTo,
          type: 'permit_activated',
        },
      },
      { roles: ['owner', 'admin', 'manager', 'ops'] }
    );
  } catch (_error) {
  }
}
