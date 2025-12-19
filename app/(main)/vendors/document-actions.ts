'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { VendorDocument, DocumentType } from '@/types/vendors';

// Storage bucket for vendor documents
const VENDOR_DOCUMENTS_BUCKET = 'vendor-documents';

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
] as const;

// Max file size: 10MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Document types
const documentTypes = [
  'npwp',
  'siup',
  'nib',
  'stnk',
  'kir',
  'insurance',
  'contract',
  'other',
] as const;

// Validation schema
const documentSchema = z.object({
  document_type: z.enum(documentTypes, {
    message: 'Document type is required',
  }),
  document_name: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
});

export type DocumentFormInput = z.infer<typeof documentSchema>;

/**
 * Get all documents for a vendor
 */
export async function getVendorDocuments(vendorId: string): Promise<{
  data: VendorDocument[];
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendor_documents')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('document_type')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [] };
}

/**
 * Get document by ID
 */
export async function getDocumentById(id: string): Promise<{
  data: VendorDocument | null;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('vendor_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data };
}

/**
 * Upload a vendor document
 */
export async function uploadVendorDocument(
  vendorId: string,
  formData: FormData
): Promise<{
  data?: VendorDocument;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Authentication required' };
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const file = formData.get('file') as File;
  const documentType = formData.get('document_type') as DocumentType;
  const documentName = formData.get('document_name') as string | null;
  const expiryDate = formData.get('expiry_date') as string | null;

  if (!file) {
    return { error: 'No file provided' };
  }

  // Validate document type
  const validation = documentSchema.safeParse({
    document_type: documentType,
    document_name: documentName,
    expiry_date: expiryDate,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
    return { error: 'File type not allowed. Please upload PDF, JPEG, or PNG files.' };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: 'File exceeds 10MB limit. Please choose a smaller file.' };
  }

  // Generate unique storage path
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const extension = sanitizedFileName.split('.').pop() || '';
  const baseName = sanitizedFileName.replace(/\.[^/.]+$/, '');
  const uniqueFileName = `${baseName}_${timestamp}.${extension}`;
  const storagePath = `${vendorId}/${documentType}/${uniqueFileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(VENDOR_DOCUMENTS_BUCKET)
    .upload(storagePath, file);

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return { error: 'Failed to upload file. Please try again.' };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(VENDOR_DOCUMENTS_BUCKET)
    .getPublicUrl(storagePath);

  // Create database record
  const { data, error } = await supabase
    .from('vendor_documents')
    .insert({
      vendor_id: vendorId,
      document_type: documentType,
      document_name: documentName || file.name,
      file_url: urlData.publicUrl,
      expiry_date: expiryDate || null,
      uploaded_by: profile?.id || null,
    })
    .select()
    .single();

  if (error) {
    // Rollback: delete the uploaded file
    await supabase.storage.from(VENDOR_DOCUMENTS_BUCKET).remove([storagePath]);
    console.error('Database insert error:', error);
    return { error: 'Failed to save document. Please try again.' };
  }

  revalidatePath(`/vendors/${vendorId}`);
  return { data };
}

/**
 * Delete a vendor document
 */
export async function deleteVendorDocument(
  id: string,
  vendorId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Get the document to find the file URL
  const { data: document, error: fetchError } = await supabase
    .from('vendor_documents')
    .select('file_url')
    .eq('id', id)
    .single();

  if (fetchError || !document) {
    return { error: 'Document not found' };
  }

  // Extract storage path from URL if possible
  if (document.file_url) {
    try {
      const url = new URL(document.file_url);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(p => p === VENDOR_DOCUMENTS_BUCKET);
      if (bucketIndex !== -1) {
        const storagePath = pathParts.slice(bucketIndex + 1).join('/');
        // Delete from storage
        await supabase.storage
          .from(VENDOR_DOCUMENTS_BUCKET)
          .remove([storagePath]);
      }
    } catch {
      // URL parsing failed, continue with database deletion
      console.warn('Could not parse file URL for storage deletion');
    }
  }

  // Delete database record
  const { error } = await supabase
    .from('vendor_documents')
    .delete()
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/vendors/${vendorId}`);
  return {};
}

/**
 * Generate a signed URL for document access (for private buckets)
 */
export async function getDocumentSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<{
  url?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(VENDOR_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error('Signed URL error:', error);
    return { error: 'Unable to access file. Please try again.' };
  }

  return { url: data.signedUrl };
}

/**
 * Get documents expiring soon (within specified days)
 */
export async function getExpiringDocuments(
  vendorId: string,
  daysThreshold: number = 30
): Promise<{
  data: VendorDocument[];
  error?: string;
}> {
  const supabase = await createClient();

  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  const { data, error } = await supabase
    .from('vendor_documents')
    .select('*')
    .eq('vendor_id', vendorId)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', thresholdDate.toISOString().split('T')[0])
    .order('expiry_date');

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [] };
}
