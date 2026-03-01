/**
 * Document Attachments Types
 * Types for file attachments on PJO, JO, Invoice, Customer, Project, and PIB entities
 */

// Entity types that can have attachments
export type AttachmentEntityType = 'pjo' | 'jo' | 'invoice' | 'customer' | 'project' | 'pib' | 'peb' | 'quotation';

// Document attachment record from database
export interface DocumentAttachment {
  id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  description: string | null;
  uploaded_by: string | null;
  created_at: string | null;
  // Joined data from user_profiles
  uploader_name?: string;
}

// Result type for upload operations
export interface AttachmentUploadResult {
  data: DocumentAttachment | null;
  error: string | null;
}

// Result type for delete operations
export interface AttachmentDeleteResult {
  success: boolean;
  error: string | null;
}

// Result type for fetching attachments
export interface AttachmentFetchResult {
  data: DocumentAttachment[];
  error: string | null;
}

// Result type for signed URL generation
export interface SignedUrlResult {
  url: string | null;
  error: string | null;
}

// File validation result
export interface FileValidationResult {
  valid: boolean;
  error: string | null;
}

// Batch file validation result
export interface BatchFileValidationResult {
  valid: boolean;
  errors: Map<string, string>;
}

// Constants for file validation
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png'
] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 10MB
export const DEFAULT_MAX_FILES = 10;
export const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

// Storage bucket name
export const STORAGE_BUCKET = 'documents';

// Props for DocumentUploader component
export interface DocumentUploaderProps {
  entityType: AttachmentEntityType;
  entityId: string;
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
  onUploadComplete?: (attachment: DocumentAttachment) => void;
  onError?: (error: string) => void;
  existingCount?: number;
}

// Props for AttachmentList component
export interface AttachmentListProps {
  entityType: AttachmentEntityType;
  entityId: string;
  attachments: DocumentAttachment[];
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

// Props for PreviewModal component
export interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: DocumentAttachment | null;
  signedUrl: string | null;
}
