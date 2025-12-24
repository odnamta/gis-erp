/**
 * Document Storage Actions
 * Server actions for uploading and managing generated documents in Supabase storage
 * Part of the n8n Document Generation module (v0.68)
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { DocumentType, UploadResult, StoragePath } from '@/types/document-generation'
import {
  buildStoragePath,
  getPublicUrl,
  extractStoragePathFromUrl,
  bytesToKB,
  GENERATED_DOCUMENTS_BUCKET,
} from '@/lib/document-storage-utils'

/**
 * Upload a PDF document to Supabase storage
 * 
 * @param pdfBuffer - The PDF file as a Buffer or Uint8Array
 * @param documentType - The type of document (invoice, quotation, etc.)
 * @param documentNumber - The document number for naming
 * @returns UploadResult with file_url, file_name, file_size_kb on success
 * 
 * **Validates: Requirements 4.1, 4.6**
 */
export async function uploadDocument(
  pdfBuffer: Buffer | Uint8Array,
  documentType: DocumentType,
  documentNumber: string
): Promise<UploadResult> {
  try {
    const supabase = await createClient()
    
    // Build the storage path
    const storagePath = buildStoragePath(documentType, documentNumber)
    
    // Convert to Uint8Array if needed
    const fileData = pdfBuffer instanceof Buffer 
      ? new Uint8Array(pdfBuffer) 
      : pdfBuffer
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(GENERATED_DOCUMENTS_BUCKET)
      .upload(storagePath.path, fileData, {
        contentType: 'application/pdf',
        upsert: false, // Don't overwrite existing files
      })
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return {
        success: false,
        error: `Failed to upload document: ${uploadError.message}`,
      }
    }
    
    // Get the public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return {
        success: false,
        error: 'Supabase URL not configured',
      }
    }
    
    const fileUrl = getPublicUrl(storagePath.bucket, storagePath.path, supabaseUrl)
    
    return {
      success: true,
      file_url: fileUrl,
      file_name: storagePath.filename,
      file_size_kb: bytesToKB(fileData.length),
    }
  } catch (error) {
    console.error('Upload document error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upload',
    }
  }
}

/**
 * Delete a document from Supabase storage
 * 
 * @param fileUrl - The public URL of the file to delete
 * @returns True if deletion was successful, false otherwise
 * 
 * **Validates: Requirements 4.6**
 */
export async function deleteDocument(fileUrl: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    // Extract the storage path from the URL
    const storagePath = extractStoragePathFromUrl(fileUrl, GENERATED_DOCUMENTS_BUCKET)
    
    if (!storagePath) {
      console.error('Could not extract storage path from URL:', fileUrl)
      return false
    }
    
    // Delete from storage
    const { error } = await supabase.storage
      .from(GENERATED_DOCUMENTS_BUCKET)
      .remove([storagePath])
    
    if (error) {
      console.error('Storage delete error:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Delete document error:', error)
    return false
  }
}

/**
 * Check if a document exists in storage
 * 
 * @param fileUrl - The public URL of the file to check
 * @returns True if the file exists, false otherwise
 */
export async function documentExists(fileUrl: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    // Extract the storage path from the URL
    const storagePath = extractStoragePathFromUrl(fileUrl, GENERATED_DOCUMENTS_BUCKET)
    
    if (!storagePath) {
      return false
    }
    
    // Try to get file metadata
    const { data, error } = await supabase.storage
      .from(GENERATED_DOCUMENTS_BUCKET)
      .list(storagePath.split('/').slice(0, -1).join('/'), {
        search: storagePath.split('/').pop(),
      })
    
    if (error) {
      return false
    }
    
    return data && data.length > 0
  } catch {
    return false
  }
}

/**
 * Get a signed URL for a document (for private bucket access)
 * 
 * @param fileUrl - The public URL of the file
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL or null if failed
 */
export async function getSignedUrl(
  fileUrl: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = await createClient()
    
    // Extract the storage path from the URL
    const storagePath = extractStoragePathFromUrl(fileUrl, GENERATED_DOCUMENTS_BUCKET)
    
    if (!storagePath) {
      return null
    }
    
    const { data, error } = await supabase.storage
      .from(GENERATED_DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, expiresIn)
    
    if (error || !data) {
      console.error('Signed URL error:', error)
      return null
    }
    
    return data.signedUrl
  } catch (error) {
    console.error('Get signed URL error:', error)
    return null
  }
}

/**
 * Upload a document with a specific storage path (for more control)
 * 
 * @param pdfBuffer - The PDF file as a Buffer or Uint8Array
 * @param storagePath - The pre-built storage path
 * @returns UploadResult with file_url, file_name, file_size_kb on success
 */
export async function uploadDocumentWithPath(
  pdfBuffer: Buffer | Uint8Array,
  storagePath: StoragePath
): Promise<UploadResult> {
  try {
    const supabase = await createClient()
    
    // Convert to Uint8Array if needed
    const fileData = pdfBuffer instanceof Buffer 
      ? new Uint8Array(pdfBuffer) 
      : pdfBuffer
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(storagePath.bucket)
      .upload(storagePath.path, fileData, {
        contentType: 'application/pdf',
        upsert: false,
      })
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return {
        success: false,
        error: `Failed to upload document: ${uploadError.message}`,
      }
    }
    
    // Get the public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return {
        success: false,
        error: 'Supabase URL not configured',
      }
    }
    
    const fileUrl = getPublicUrl(storagePath.bucket, storagePath.path, supabaseUrl)
    
    return {
      success: true,
      file_url: fileUrl,
      file_name: storagePath.filename,
      file_size_kb: bytesToKB(fileData.length),
    }
  } catch (error) {
    console.error('Upload document error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upload',
    }
  }
}

/**
 * List documents in a specific path
 * 
 * @param documentType - The document type to list
 * @param year - Optional year filter
 * @param month - Optional month filter
 * @returns Array of file names or empty array on error
 */
export async function listDocuments(
  documentType: DocumentType,
  year?: string,
  month?: string
): Promise<string[]> {
  try {
    const supabase = await createClient()
    
    // Build the path to list
    let path = documentType
    if (year) {
      path += `/${year}`
      if (month) {
        path += `/${month}`
      }
    }
    
    const { data, error } = await supabase.storage
      .from(GENERATED_DOCUMENTS_BUCKET)
      .list(path)
    
    if (error) {
      console.error('List documents error:', error)
      return []
    }
    
    return data?.map(file => file.name) || []
  } catch (error) {
    console.error('List documents error:', error)
    return []
  }
}
