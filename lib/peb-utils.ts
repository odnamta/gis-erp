// =====================================================
// v0.52: CUSTOMS - EXPORT DOCUMENTATION (PEB) Utilities
// =====================================================

import {
  PEBDocument,
  PEBFormData,
  PEBItemFormData,
  PEBFilters,
  PEBStatistics,
  PEBStatus,
  PEBValidationResult,
  PEBValidationError,
  PEB_STATUS_TRANSITIONS,
  UserRole,
} from '@/types/peb';

// =====================================================
// Item Calculations
// =====================================================

/**
 * Calculate total price for a PEB item
 * Property 5: Item Total Price Calculation
 */
export function calculateItemTotalPrice(quantity: number, unitPrice: number): number {
  if (quantity < 0 || unitPrice < 0) {
    return 0;
  }
  return Math.round(quantity * unitPrice * 100) / 100;
}

// =====================================================
// Reference Number Generation
// =====================================================

/**
 * Generate PEB internal reference
 * Property 1: Reference Format Validation
 * Format: PEB-YYYY-NNNNN
 */
export function generatePEBInternalRef(sequence: number, year?: number): string {
  const currentYear = year ?? new Date().getFullYear();
  const paddedSequence = String(sequence).padStart(5, '0');
  return `PEB-${currentYear}-${paddedSequence}`;
}

/**
 * Validate PEB internal reference format
 */
export function validatePEBInternalRef(ref: string): boolean {
  const pattern = /^PEB-\d{4}-\d{5}$/;
  return pattern.test(ref);
}

// =====================================================
// Status Validation
// =====================================================

/**
 * Check if a status transition is allowed
 */
export function canTransitionStatus(
  currentStatus: PEBStatus,
  newStatus: PEBStatus
): boolean {
  const allowedTransitions = PEB_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Get next allowed statuses from current status
 */
export function getNextAllowedStatuses(currentStatus: PEBStatus): PEBStatus[] {
  return PEB_STATUS_TRANSITIONS[currentStatus] || [];
}

// =====================================================
// Formatting
// =====================================================

/**
 * Format PEB reference for display
 */
export function formatPEBReference(
  internalRef: string,
  pebNumber?: string | null
): string {
  if (pebNumber) {
    return `${internalRef} (${pebNumber})`;
  }
  return internalRef;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format weight in kg
 */
export function formatWeight(weightKg: number | null): string {
  if (weightKg === null || weightKg === undefined) {
    return '-';
  }
  return `${weightKg.toLocaleString('en-US', { maximumFractionDigits: 3 })} kg`;
}

// =====================================================
// Validation
// =====================================================

/**
 * Validate PEB document form data
 * Property 2: Required Field Validation
 */
export function validatePEBDocument(data: Partial<PEBFormData>): PEBValidationResult {
  const errors: PEBValidationError[] = [];

  // Required fields
  if (!data.exporter_name || data.exporter_name.trim() === '') {
    errors.push({ field: 'exporter_name', message: 'Exporter name is required' });
  }

  if (!data.export_type_id) {
    errors.push({ field: 'export_type_id', message: 'Export type must be selected' });
  }

  if (!data.customs_office_id) {
    errors.push({ field: 'customs_office_id', message: 'Customs office must be selected' });
  }

  // Numeric validations
  if (data.fob_value !== undefined && data.fob_value < 0) {
    errors.push({ field: 'fob_value', message: 'FOB value must be a positive number' });
  }

  if (data.total_packages !== undefined && data.total_packages < 0) {
    errors.push({ field: 'total_packages', message: 'Total packages must be a positive number' });
  }

  if (data.gross_weight_kg !== undefined && data.gross_weight_kg < 0) {
    errors.push({ field: 'gross_weight_kg', message: 'Gross weight must be a positive number' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate PEB item form data
 * Property 4: Item Required Fields Validation
 */
export function validatePEBItem(data: Partial<PEBItemFormData>): PEBValidationResult {
  const errors: PEBValidationError[] = [];

  // Required fields
  if (!data.hs_code || data.hs_code.trim() === '') {
    errors.push({ field: 'hs_code', message: 'HS code is required' });
  }

  if (!data.goods_description || data.goods_description.trim() === '') {
    errors.push({ field: 'goods_description', message: 'Goods description is required' });
  }

  // Numeric validations
  if (data.quantity !== undefined && data.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be a positive number' });
  }

  if (data.unit_price !== undefined && data.unit_price < 0) {
    errors.push({ field: 'unit_price', message: 'Unit price must be a positive number' });
  }

  if (!data.unit || data.unit.trim() === '') {
    errors.push({ field: 'unit', message: 'Unit is required' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate HS code format
 */
export function validateHSCode(hsCode: string): boolean {
  // HS codes are typically 6-10 digits, sometimes with dots
  const pattern = /^[\d.]{4,15}$/;
  return pattern.test(hsCode);
}

// =====================================================
// Filtering
// =====================================================

/**
 * Filter PEB documents based on criteria
 * Property 9: Filter Correctness
 */
export function filterPEBDocuments(
  documents: PEBDocument[],
  filters: PEBFilters
): PEBDocument[] {
  return documents.filter((doc) => {
    // Status filter
    if (filters.status && doc.status !== filters.status) {
      return false;
    }

    // Customs office filter
    if (filters.customs_office_id && doc.customs_office_id !== filters.customs_office_id) {
      return false;
    }

    // Date range filter (using ETD date)
    if (filters.date_from && doc.etd_date) {
      const docDate = new Date(doc.etd_date);
      const fromDate = new Date(filters.date_from);
      if (docDate < fromDate) {
        return false;
      }
    }

    if (filters.date_to && doc.etd_date) {
      const docDate = new Date(doc.etd_date);
      const toDate = new Date(filters.date_to);
      if (docDate > toDate) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Search PEB documents by term
 * Property 10: Search Correctness
 */
export function searchPEBDocuments(
  documents: PEBDocument[],
  searchTerm: string
): PEBDocument[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return documents;
  }

  const term = searchTerm.toLowerCase().trim();

  return documents.filter((doc) => {
    // Search in internal reference
    if (doc.internal_ref.toLowerCase().includes(term)) {
      return true;
    }

    // Search in PEB number
    if (doc.peb_number && doc.peb_number.toLowerCase().includes(term)) {
      return true;
    }

    // Search in exporter name
    if (doc.exporter_name.toLowerCase().includes(term)) {
      return true;
    }

    return false;
  });
}

// =====================================================
// Statistics
// =====================================================

/**
 * Calculate PEB statistics
 * Property 8: Statistics Calculation Correctness
 */
export function calculatePEBStatistics(documents: PEBDocument[]): PEBStatistics {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const activeStatuses: PEBStatus[] = ['draft', 'submitted', 'approved', 'loaded'];

  return {
    active_pebs: documents.filter((doc) => activeStatuses.includes(doc.status)).length,
    pending_approval: documents.filter((doc) => doc.status === 'submitted').length,
    loaded: documents.filter((doc) => doc.status === 'loaded').length,
    departed_mtd: documents.filter((doc) => {
      if (doc.status !== 'departed' && doc.status !== 'completed') {
        return false;
      }
      // Check if departed within current month
      if (doc.atd_date) {
        const atdDate = new Date(doc.atd_date);
        return atdDate >= startOfMonth;
      }
      return false;
    }).length,
  };
}

// =====================================================
// Permissions
// =====================================================

/**
 * Check if user role can view PEB documents
 * Property 11: Role-Based Permission Consistency
 */
export function canViewPEB(role: UserRole): boolean {
  const allowedRoles: UserRole[] = ['owner', 'admin', 'manager', 'customs', 'finance'];
  return allowedRoles.includes(role);
}

/**
 * Check if user role can create/edit PEB documents
 * Property 11: Role-Based Permission Consistency
 */
export function canEditPEB(role: UserRole): boolean {
  const allowedRoles: UserRole[] = ['owner', 'admin', 'manager', 'customs'];
  return allowedRoles.includes(role);
}

/**
 * Check if user role can delete PEB documents
 * Property 11: Role-Based Permission Consistency
 */
export function canDeletePEB(role: UserRole): boolean {
  const allowedRoles: UserRole[] = ['owner', 'admin'];
  return allowedRoles.includes(role);
}

// =====================================================
// Status Display Helpers
// =====================================================

export function getStatusColor(status: PEBStatus): string {
  const colors: Record<PEBStatus, string> = {
    draft: 'bg-gray-100 text-gray-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    loaded: 'bg-yellow-100 text-yellow-800',
    departed: 'bg-purple-100 text-purple-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getStatusIcon(status: PEBStatus): string {
  const icons: Record<PEBStatus, string> = {
    draft: 'FileEdit',
    submitted: 'Send',
    approved: 'CheckCircle',
    loaded: 'Package',
    departed: 'Ship',
    completed: 'CheckCheck',
    cancelled: 'XCircle',
  };
  return icons[status] || 'File';
}
