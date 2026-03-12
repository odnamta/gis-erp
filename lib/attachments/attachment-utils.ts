/**
 * Attachment Utility Functions
 * Core functions for file validation, path generation, and display helpers
 */

import { FileText, Image } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  AttachmentEntityType,
  FileValidationResult,
  BatchFileValidationResult,
} from '@/types/attachments';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_MB,
} from '@/types/attachments';

/**
 * Generate storage path for a file
 * Format: {entity_type}/{entity_id}/{filename}
 * 
 * @param entityType - The type of entity (pjo, jo, invoice, customer, project)
 * @param entityId - The UUID of the entity
 * @param fileName - The original file name
 * @returns The storage path string
 */
export function generateStoragePath(
  entityType: AttachmentEntityType,
  entityId: string,
  fileName: string
): string {
  // Sanitize filename to remove special characters that could cause issues
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Add timestamp to prevent collisions
  const timestamp = Date.now();
  const extension = sanitizedFileName.split('.').pop() || '';
  const baseName = sanitizedFileName.replace(/\.[^/.]+$/, '');
  const uniqueFileName = `${baseName}_${timestamp}.${extension}`;
  
  return `${entityType}/${entityId}/${uniqueFileName}`;
}

/**
 * Validate a single file for type and size
 * 
 * @param file - The File object to validate
 * @param allowedTypes - Array of allowed MIME types
 * @param maxSizeMB - Maximum file size in megabytes
 * @returns Validation result with valid flag and error message
 */
export function validateFile(
  file: File,
  allowedTypes: readonly string[] = ALLOWED_MIME_TYPES,
  maxSizeMB: number = MAX_FILE_SIZE_MB
): FileValidationResult {
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    const allowedExtensions = allowedTypes
      .map(type => {
        if (type === 'application/pdf') return 'PDF';
        if (type === 'image/jpeg') return 'JPEG';
        if (type === 'image/png') return 'PNG';
        return type;
      })
      .join(', ');
    return {
      valid: false,
      error: `Format file tidak didukung. Gunakan format: ${allowedExtensions}.`,
    };
  }

  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const actualSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Ukuran file ${actualSizeMB}MB melebihi batas maksimum ${maxSizeMB}MB. Pilih file yang lebih kecil.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Validate multiple files independently
 * 
 * @param files - Array of File objects to validate
 * @param allowedTypes - Array of allowed MIME types
 * @param maxSizeMB - Maximum file size in megabytes
 * @returns Batch validation result with overall valid flag and per-file errors
 */
export function validateFiles(
  files: File[],
  allowedTypes: readonly string[] = ALLOWED_MIME_TYPES,
  maxSizeMB: number = MAX_FILE_SIZE_MB
): BatchFileValidationResult {
  const errors = new Map<string, string>();
  
  for (const file of files) {
    const result = validateFile(file, allowedTypes, maxSizeMB);
    if (!result.valid && result.error) {
      errors.set(file.name, result.error);
    }
  }

  return {
    valid: errors.size === 0,
    errors,
  };
}

/**
 * Get the appropriate icon component for a file type
 * 
 * @param mimeType - The MIME type of the file
 * @returns Lucide icon component
 */
export function getFileIcon(mimeType: string | null): LucideIcon {
  if (!mimeType) return FileText;
  
  if (mimeType.startsWith('image/')) {
    return Image;
  }
  
  // Default to document icon for PDFs and other types
  return FileText;
}

/**
 * Format file size in human-readable format
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.3 MB", "850 KB")
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  
  // Show 1 decimal place for KB and above
  if (i === 0) {
    return `${bytes} B`;
  }
  
  return `${size.toFixed(1)} ${units[i]}`;
}

/**
 * Check if a MIME type is an image
 * 
 * @param mimeType - The MIME type to check
 * @returns True if the MIME type is an image
 */
export function isImageType(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
}

/**
 * Check if a MIME type is a PDF
 * 
 * @param mimeType - The MIME type to check
 * @returns True if the MIME type is a PDF
 */
export function isPdfType(mimeType: string | null): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Get file extension from filename
 * 
 * @param fileName - The file name
 * @returns The file extension (lowercase, without dot)
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  if (parts.length < 2) return '';
  return parts.pop()?.toLowerCase() || '';
}
