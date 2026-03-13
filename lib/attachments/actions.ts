'use server';

/**
 * Attachment Server Actions
 * Server-side functions for uploading, deleting, and fetching attachments
 */

import { createClient } from '@/lib/supabase/server';
import type {
  AttachmentEntityType,
  DocumentAttachment,
  AttachmentUploadResult,
  AttachmentDeleteResult,
  AttachmentFetchResult,
  SignedUrlResult,
} from '@/types/attachments';
import {
  STORAGE_BUCKET,
  SIGNED_URL_EXPIRY_SECONDS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '@/types/attachments';

/**
 * Upload a file attachment to an entity
 * 
 * @param entityType - The type of entity (pjo, jo, invoice, customer, project)
 * @param entityId - The UUID of the entity
 * @param formData - FormData containing the file and optional description
 * @returns Upload result with attachment data or error
 */
export async function uploadAttachment(
  entityType: AttachmentEntityType,
  entityId: string,
  formData: FormData
): Promise<AttachmentUploadResult> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return { data: null, error: 'Authentication required' };
    }

    // Get user profile for uploaded_by
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const file = formData.get('file') as File;
    const description = formData.get('description') as string | null;

    if (!file) {
      return { data: null, error: 'No file provided' };
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
      return { data: null, error: 'Format file tidak didukung. Gunakan format: PDF, JPEG, atau PNG.' };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const actualMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxMB = MAX_FILE_SIZE_BYTES / (1024 * 1024);
      return { data: null, error: `Ukuran file ${actualMB}MB melebihi batas maksimum ${maxMB}MB. Pilih file yang lebih kecil.` };
    }

    // Generate unique storage path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const extension = sanitizedFileName.split('.').pop() || '';
    const baseName = sanitizedFileName.replace(/\.[^/.]+$/, '');
    const uniqueFileName = `${baseName}_${timestamp}.${extension}`;
    const storagePath = `${entityType}/${entityId}/${uniqueFileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload failed:', uploadError.message, uploadError);
      // Provide specific error messages based on common Supabase Storage errors
      if (uploadError.message?.includes('Payload too large') || uploadError.message?.includes('413') || uploadError.message?.includes('size')) {
        return { data: null, error: `File terlalu besar. Maksimum ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB. Pastikan bucket storage telah dikonfigurasi untuk menerima file besar.` };
      }
      if (uploadError.message?.includes('Bucket not found')) {
        return { data: null, error: 'Storage bucket "documents" belum dibuat. Hubungi admin.' };
      }
      return { data: null, error: `Upload gagal: ${uploadError.message}` };
    }

    // Create database record
    const { data: attachment, error: dbError } = await supabase
      .from('document_attachments')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        description: description || null,
        uploaded_by: profile?.id || null,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback: delete the uploaded file
      const { error: rollbackError } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      if (rollbackError) {
        console.error('[Attachment] Storage rollback failed for path:', storagePath, rollbackError.message);
      }
      return { data: null, error: 'Gagal menyimpan lampiran. Silakan coba lagi.' };
    }

    return { data: attachment as DocumentAttachment, error: null };
  } catch (_error) {
    return { data: null, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete an attachment
 * 
 * @param attachmentId - The UUID of the attachment to delete
 * @returns Delete result with success flag or error
 */
export async function deleteAttachment(
  attachmentId: string
): Promise<AttachmentDeleteResult> {
  try {
    const supabase = await createClient();

    // Get the attachment to find the storage path
    const { data: attachment, error: fetchError } = await supabase
      .from('document_attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) {
      return { success: false, error: 'Attachment not found' };
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([attachment.storage_path]);

    if (storageError) {
      return { success: false, error: 'Failed to delete file. Please try again.' };
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from('document_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      return { success: false, error: 'Failed to remove attachment record.' };
    }

    return { success: true, error: null };
  } catch (_error) {
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all attachments for an entity
 * 
 * @param entityType - The type of entity
 * @param entityId - The UUID of the entity
 * @returns Fetch result with attachments array or error
 */
export async function getAttachments(
  entityType: AttachmentEntityType,
  entityId: string
): Promise<AttachmentFetchResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('document_attachments')
      .select(`
        *,
        user_profiles:uploaded_by (
          full_name
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: 'Failed to load attachments' };
    }

    // Transform to include uploader_name
    const attachments: DocumentAttachment[] = (data || []).map((item) => ({
      id: item.id,
      entity_type: item.entity_type as AttachmentEntityType,
      entity_id: item.entity_id,
      file_name: item.file_name,
      file_type: item.file_type,
      file_size: item.file_size,
      storage_path: item.storage_path,
      description: item.description,
      uploaded_by: item.uploaded_by,
      created_at: item.created_at,
      uploader_name: item.user_profiles?.full_name || undefined,
    }));

    return { data: attachments, error: null };
  } catch (_error) {
    return { data: [], error: 'An unexpected error occurred' };
  }
}

/**
 * Attachment category prefix for SPK/WO documents
 * Used in the description field to tag documents by category
 */
export const ATTACHMENT_CATEGORY_PREFIX = {
  spk_wo: '[SPK_WO]',
} as const;

export type AttachmentCategory = keyof typeof ATTACHMENT_CATEGORY_PREFIX;

/**
 * Upload a file attachment with a category tag
 * Prepends a category prefix to the description field
 */
export async function uploadCategorizedAttachment(
  entityType: AttachmentEntityType,
  entityId: string,
  category: AttachmentCategory,
  formData: FormData
): Promise<AttachmentUploadResult> {
  const prefix = ATTACHMENT_CATEGORY_PREFIX[category];
  const description = formData.get('description') as string | null;
  const taggedDescription = description
    ? `${prefix} ${description}`
    : prefix;
  formData.set('description', taggedDescription);
  return uploadAttachment(entityType, entityId, formData);
}

/**
 * Get attachments filtered by category
 * Filters based on the description prefix convention
 */
export async function getAttachmentsByCategory(
  entityType: AttachmentEntityType,
  entityId: string,
  category: AttachmentCategory
): Promise<AttachmentFetchResult> {
  try {
    const supabase = await createClient();
    const prefix = ATTACHMENT_CATEGORY_PREFIX[category];

    const { data, error } = await supabase
      .from('document_attachments')
      .select(`
        *,
        user_profiles:uploaded_by (
          full_name
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .like('description', `${prefix}%`)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: 'Failed to load attachments' };
    }

    const attachments: DocumentAttachment[] = (data || []).map((item) => ({
      id: item.id,
      entity_type: item.entity_type as AttachmentEntityType,
      entity_id: item.entity_id,
      file_name: item.file_name,
      file_type: item.file_type,
      file_size: item.file_size,
      storage_path: item.storage_path,
      // Strip the category prefix from description for display
      description: item.description?.replace(`${prefix} `, '').replace(prefix, '') || null,
      uploaded_by: item.uploaded_by,
      created_at: item.created_at,
      uploader_name: item.user_profiles?.full_name || undefined,
    }));

    return { data: attachments, error: null };
  } catch (_error) {
    return { data: [], error: 'An unexpected error occurred' };
  }
}

/**
 * Get attachments excluding a specific category
 * Used to show "general" attachments without categorized ones
 */
export async function getAttachmentsExcludingCategory(
  entityType: AttachmentEntityType,
  entityId: string,
  excludeCategory: AttachmentCategory
): Promise<AttachmentFetchResult> {
  try {
    const supabase = await createClient();
    const prefix = ATTACHMENT_CATEGORY_PREFIX[excludeCategory];

    const { data, error } = await supabase
      .from('document_attachments')
      .select(`
        *,
        user_profiles:uploaded_by (
          full_name
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .or(`description.is.null,description.not.like.${prefix}%`)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: 'Failed to load attachments' };
    }

    const attachments: DocumentAttachment[] = (data || []).map((item) => ({
      id: item.id,
      entity_type: item.entity_type as AttachmentEntityType,
      entity_id: item.entity_id,
      file_name: item.file_name,
      file_type: item.file_type,
      file_size: item.file_size,
      storage_path: item.storage_path,
      description: item.description,
      uploaded_by: item.uploaded_by,
      created_at: item.created_at,
      uploader_name: item.user_profiles?.full_name || undefined,
    }));

    return { data: attachments, error: null };
  } catch (_error) {
    return { data: [], error: 'An unexpected error occurred' };
  }
}

/**
 * Generate a signed URL for file access
 * 
 * @param storagePath - The path in Supabase Storage
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL result with URL or error
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS
): Promise<SignedUrlResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      return { url: null, error: 'Unable to access file. Please try again.' };
    }

    return { url: data.signedUrl, error: null };
  } catch (_error) {
    return { url: null, error: 'An unexpected error occurred' };
  }
}
