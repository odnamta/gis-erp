// Engineering Drawing Management Utility Functions

import {
  Drawing,
  DrawingWithDetails,
  DrawingStatus,
  DrawingFileType,
  DrawingFormInput,
  RevisionFormInput,
  TransmittalFormInput,
  TransmittalPurpose,
  DrawingFilters,
  ValidationResult,
  VALID_STATUS_TRANSITIONS,
  STATUS_LABELS,
  PURPOSE_LABELS,
  VALID_FILE_EXTENSIONS,
} from '@/types/drawing';

/**
 * Generate drawing number: {PREFIX}-{YEAR}-{NNNN}
 * Property 1: Drawing Number Format and Uniqueness
 */
export function generateDrawingNumber(prefix: string, sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSeq = String(sequence).padStart(4, '0');
  return `${prefix}-${year}-${paddedSeq}`;
}

/**
 * Get next revision letter (A -> B -> C, etc.)
 * Property 4: Revision Number Sequence
 */
export function getNextRevision(currentRevision: string): string {
  if (!currentRevision || currentRevision.length === 0) {
    return 'A';
  }

  // Handle single letter revisions (A-Z)
  if (currentRevision.length === 1) {
    const charCode = currentRevision.charCodeAt(0);
    if (charCode >= 65 && charCode < 90) { // A-Y
      return String.fromCharCode(charCode + 1);
    }
    if (charCode === 90) { // Z -> AA
      return 'AA';
    }
  }

  // Handle multi-letter revisions (AA, AB, etc.)
  const lastChar = currentRevision.charCodeAt(currentRevision.length - 1);
  if (lastChar >= 65 && lastChar < 90) {
    return currentRevision.slice(0, -1) + String.fromCharCode(lastChar + 1);
  }
  if (lastChar === 90) {
    // Increment the prefix and reset last char to A
    const prefix = currentRevision.slice(0, -1);
    if (prefix.length === 0) {
      return 'AA';
    }
    const newPrefix = getNextRevision(prefix);
    return newPrefix + 'A';
  }

  return 'A';
}

/**
 * Generate transmittal number: TR-{YEAR}-{NNNN}
 * Property 11: Transmittal Number Format
 */
export function generateTransmittalNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const paddedSeq = String(sequence).padStart(4, '0');
  return `TR-${year}-${paddedSeq}`;
}

/**
 * Validate file type
 * Property 2: File Type Validation
 */
export function isValidDrawingFileType(filename: string): boolean {
  if (!filename || typeof filename !== 'string') {
    return false;
  }
  const ext = getFileExtension(filename);
  return ext !== null && VALID_FILE_EXTENSIONS.includes(ext.toLowerCase());
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): DrawingFileType | null {
  if (!filename || typeof filename !== 'string') {
    return null;
  }
  const parts = filename.split('.');
  if (parts.length < 2) {
    return null;
  }
  const ext = parts[parts.length - 1].toLowerCase();
  if (VALID_FILE_EXTENSIONS.includes(ext)) {
    return ext as DrawingFileType;
  }
  return null;
}

/**
 * Format file size for display
 */
export function formatFileSize(sizeKb: number): string {
  if (sizeKb < 1024) {
    return `${sizeKb} KB`;
  }
  const sizeMb = (sizeKb / 1024).toFixed(1);
  return `${sizeMb} MB`;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: DrawingStatus): string {
  const colors: Record<DrawingStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    for_review: 'bg-yellow-100 text-yellow-800',
    for_approval: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    issued: 'bg-purple-100 text-purple-800',
    superseded: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get status label
 */
export function getStatusLabel(status: DrawingStatus): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Get purpose display label
 */
export function getPurposeLabel(purpose: TransmittalPurpose): string {
  return PURPOSE_LABELS[purpose] || purpose;
}

/**
 * Validate drawing form input
 * Property 3: Drawing Input Validation
 */
export function validateDrawingInput(input: DrawingFormInput): ValidationResult {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push('Drawing title is required');
  }

  if (!input.category_id || input.category_id.trim().length === 0) {
    errors.push('Please select a drawing category');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate revision input
 * Property 7: Revision Requires Change Description
 */
export function validateRevisionInput(input: RevisionFormInput): ValidationResult {
  const errors: string[] = [];

  if (!input.change_description || input.change_description.trim().length === 0) {
    errors.push('Change description is required for new revisions');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate transmittal input
 * Property 12: Transmittal Input Validation
 */
export function validateTransmittalInput(input: TransmittalFormInput): ValidationResult {
  const errors: string[] = [];

  if (!input.recipient_company || input.recipient_company.trim().length === 0) {
    errors.push('Recipient company is required');
  }

  const validPurposes: TransmittalPurpose[] = [
    'for_approval',
    'for_construction',
    'for_information',
    'for_review',
    'as_built',
  ];
  if (!input.purpose || !validPurposes.includes(input.purpose)) {
    errors.push('Please select a valid transmittal purpose');
  }

  if (!input.drawings || input.drawings.length === 0) {
    errors.push('At least one drawing must be selected');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if status transition is valid
 * Property 8: Valid Status Transitions
 */
export function isValidStatusTransition(
  currentStatus: DrawingStatus,
  newStatus: DrawingStatus
): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get allowed next statuses
 */
export function getAllowedNextStatuses(currentStatus: DrawingStatus): DrawingStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Filter drawings by criteria
 * Property 13: Filter Results Match Criteria
 */
export function filterDrawings(
  drawings: DrawingWithDetails[],
  filters: DrawingFilters
): DrawingWithDetails[] {
  return drawings.filter((drawing) => {
    // Search filter (drawing number or title)
    if (filters.search && filters.search.trim().length > 0) {
      const searchLower = filters.search.toLowerCase();
      const matchesNumber = drawing.drawing_number.toLowerCase().includes(searchLower);
      const matchesTitle = drawing.title.toLowerCase().includes(searchLower);
      if (!matchesNumber && !matchesTitle) {
        return false;
      }
    }

    // Category filter
    if (filters.category_id && drawing.category_id !== filters.category_id) {
      return false;
    }

    // Project filter
    if (filters.project_id && drawing.project_id !== filters.project_id) {
      return false;
    }

    // Status filter
    if (filters.status && drawing.status !== filters.status) {
      return false;
    }

    return true;
  });
}

/**
 * Sort drawings by drawing number
 * Property 14: Drawings Sorted by Number
 */
export function sortDrawingsByNumber(drawings: DrawingWithDetails[]): DrawingWithDetails[] {
  return [...drawings].sort((a, b) => {
    return a.drawing_number.localeCompare(b.drawing_number, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

/**
 * Check if drawing can be issued (must have file)
 */
export function canIssueDrawing(drawing: Drawing): { canIssue: boolean; reason?: string } {
  if (!drawing.file_url) {
    return {
      canIssue: false,
      reason: 'Please upload a drawing file before issuing',
    };
  }
  if (drawing.status !== 'approved') {
    return {
      canIssue: false,
      reason: 'Drawing must be approved before issuing',
    };
  }
  return { canIssue: true };
}

/**
 * Get drawing status counts
 */
export function getDrawingStatusCounts(
  drawings: Drawing[]
): Record<DrawingStatus, number> {
  const counts: Record<DrawingStatus, number> = {
    draft: 0,
    for_review: 0,
    for_approval: 0,
    approved: 0,
    issued: 0,
    superseded: 0,
  };

  drawings.forEach((drawing) => {
    if (counts[drawing.status] !== undefined) {
      counts[drawing.status]++;
    }
  });

  return counts;
}

/**
 * Format date for display
 */
export function formatDrawingDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
