/**
 * Document Storage Utilities
 * Utility functions for document storage path construction and URL generation
 * Part of the n8n Document Generation module (v0.68)
 */

import { DocumentType, StoragePath, UploadResult } from '@/types/document-generation'

// Storage bucket for generated documents
export const GENERATED_DOCUMENTS_BUCKET = 'generated-documents'

/**
 * Build a structured storage path for a document
 * Format: {document_type}/{year}/{month}/{filename}
 * 
 * @param documentType - The type of document (invoice, quotation, etc.)
 * @param documentNumber - The document number (e.g., INV-2025-0001)
 * @param date - Optional date for path construction (defaults to current date)
 * @returns StoragePath object with bucket, path, and filename
 * 
 * **Validates: Requirements 4.2**
 */
export function buildStoragePath(
  documentType: DocumentType,
  documentNumber: string,
  date?: Date
): StoragePath {
  const now = date || new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  
  // Sanitize document number for use in filename
  const sanitizedNumber = sanitizeFilename(documentNumber)
  const timestamp = now.getTime()
  const filename = `${sanitizedNumber}_${timestamp}.pdf`
  
  // Construct the full path
  const path = `${documentType}/${year}/${month}/${filename}`
  
  return {
    bucket: GENERATED_DOCUMENTS_BUCKET,
    path,
    filename
  }
}

/**
 * Sanitize a string for use in a filename
 * Replaces special characters with underscores
 * 
 * @param input - The string to sanitize
 * @returns Sanitized string safe for use in filenames
 */
export function sanitizeFilename(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'document'
  }
  // Replace any character that's not alphanumeric, dash, or underscore with underscore
  return input.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_')
}

/**
 * Generate a public URL for a file in Supabase storage
 * 
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param supabaseUrl - The Supabase project URL
 * @returns The public URL for the file
 * 
 * **Validates: Requirements 4.6**
 */
export function getPublicUrl(
  bucket: string,
  path: string,
  supabaseUrl: string
): string {
  // Ensure supabaseUrl doesn't have trailing slash
  const baseUrl = supabaseUrl.replace(/\/$/, '')
  
  // Construct the public URL
  // Format: {supabase_url}/storage/v1/object/public/{bucket}/{path}
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`
}

/**
 * Extract storage path from a public URL
 * 
 * @param fileUrl - The public URL of the file
 * @param bucket - The expected bucket name
 * @returns The storage path or null if extraction fails
 */
export function extractStoragePathFromUrl(
  fileUrl: string,
  bucket: string
): string | null {
  if (!fileUrl || typeof fileUrl !== 'string') {
    return null
  }
  
  try {
    const url = new URL(fileUrl)
    const pathParts = url.pathname.split('/')
    
    // Find the bucket in the path
    const bucketIndex = pathParts.findIndex(p => p === bucket)
    if (bucketIndex === -1) {
      return null
    }
    
    // Return everything after the bucket
    const storagePath = pathParts.slice(bucketIndex + 1).join('/')
    return storagePath || null
  } catch {
    // URL parsing failed
    return null
  }
}

/**
 * Validate that a storage path follows the expected structure
 * Expected format: {document_type}/{year}/{month}/{filename}
 * 
 * @param path - The storage path to validate
 * @returns True if the path is valid, false otherwise
 */
export function isValidStoragePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false
  }
  
  const parts = path.split('/')
  
  // Must have exactly 4 parts: document_type/year/month/filename
  if (parts.length !== 4) {
    return false
  }
  
  const [documentType, year, month, filename] = parts
  
  // Validate document type (non-empty)
  if (!documentType || documentType.trim() === '') {
    return false
  }
  
  // Validate year (4 digits)
  if (!/^\d{4}$/.test(year)) {
    return false
  }
  
  // Validate month (2 digits, 01-12)
  if (!/^(0[1-9]|1[0-2])$/.test(month)) {
    return false
  }
  
  // Validate filename (non-empty, ends with .pdf)
  if (!filename || !filename.toLowerCase().endsWith('.pdf')) {
    return false
  }
  
  return true
}

/**
 * Parse a storage path into its components
 * 
 * @param path - The storage path to parse
 * @returns Object with document_type, year, month, filename or null if invalid
 */
export function parseStoragePath(path: string): {
  document_type: string
  year: string
  month: string
  filename: string
} | null {
  if (!isValidStoragePath(path)) {
    return null
  }
  
  const [document_type, year, month, filename] = path.split('/')
  
  return {
    document_type,
    year,
    month,
    filename
  }
}

/**
 * Calculate file size in KB from bytes
 * 
 * @param bytes - File size in bytes
 * @returns File size in KB (rounded to nearest integer)
 */
export function bytesToKB(bytes: number): number {
  if (typeof bytes !== 'number' || bytes < 0) {
    return 0
  }
  return Math.round(bytes / 1024)
}

/**
 * Generate a unique filename for a document
 * 
 * @param documentNumber - The document number
 * @param timestamp - Optional timestamp (defaults to current time)
 * @returns Unique filename with .pdf extension
 */
export function generateUniqueFilename(
  documentNumber: string,
  timestamp?: number
): string {
  const sanitized = sanitizeFilename(documentNumber)
  const ts = timestamp || Date.now()
  return `${sanitized}_${ts}.pdf`
}

/**
 * Check if a URL is a valid Supabase storage URL
 * 
 * @param url - The URL to validate
 * @returns True if it's a valid Supabase storage URL
 */
export function isValidSupabaseStorageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  try {
    const parsed = new URL(url)
    
    // Check if it's HTTPS
    if (parsed.protocol !== 'https:') {
      return false
    }
    
    // Check if path contains storage/v1/object
    if (!parsed.pathname.includes('/storage/v1/object/')) {
      return false
    }
    
    return true
  } catch {
    return false
  }
}
