import {
  VendorType,
  EquipmentType,
  DocumentType,
  VendorRating,
  VendorSummaryStats,
  Vendor,
} from '@/types/vendors';

// Vendor type options for dropdowns
export const VENDOR_TYPES: { value: VendorType; label: string }[] = [
  { value: 'trucking', label: 'Trucking / Transport' },
  { value: 'shipping', label: 'Shipping Line' },
  { value: 'port', label: 'Port Agent' },
  { value: 'handling', label: 'Cargo Handling' },
  { value: 'forwarding', label: 'Freight Forwarding' },
  { value: 'documentation', label: 'Documentation / Customs' },
  { value: 'other', label: 'Other' },
];

// Equipment type options for dropdowns
export const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: 'trailer_40ft', label: 'Trailer 40ft' },
  { value: 'trailer_20ft', label: 'Trailer 20ft' },
  { value: 'lowbed', label: 'Lowbed' },
  { value: 'fuso', label: 'Fuso' },
  { value: 'wingbox', label: 'Wingbox' },
  { value: 'crane', label: 'Crane' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'excavator', label: 'Excavator' },
  { value: 'other', label: 'Other' },
];

// Document type options for dropdowns
export const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'npwp', label: 'NPWP' },
  { value: 'siup', label: 'SIUP' },
  { value: 'nib', label: 'NIB' },
  { value: 'stnk', label: 'STNK' },
  { value: 'kir', label: 'KIR' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'contract', label: 'Contract' },
  { value: 'other', label: 'Other' },
];

// Equipment condition options
export const EQUIPMENT_CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

// Cost category to vendor type mapping
const COST_CATEGORY_TO_VENDOR_TYPE: Record<string, VendorType> = {
  trucking: 'trucking',
  port_charges: 'port',
  documentation: 'documentation',
  handling: 'handling',
  customs: 'documentation',
  shipping: 'shipping',
  insurance: 'other',
  storage: 'handling',
  labor: 'handling',
  fuel: 'trucking',
  tolls: 'trucking',
  other: 'other',
};

/**
 * Generate a vendor code based on the current count
 * Format: VND-XXX (e.g., VND-001, VND-002)
 */
export function generateVendorCode(count: number): string {
  const nextNumber = count + 1;
  return `VND-${String(nextNumber).padStart(3, '0')}`;
}

/**
 * Get the display label for a vendor type
 */
export function getVendorTypeLabel(type: VendorType): string {
  return VENDOR_TYPES.find((t) => t.value === type)?.label || type;
}

/**
 * Get the display label for an equipment type
 */
export function getEquipmentTypeLabel(type: EquipmentType): string {
  return EQUIPMENT_TYPES.find((t) => t.value === type)?.label || type;
}

/**
 * Get the display label for a document type
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
}

/**
 * Map a cost category to the corresponding vendor type
 */
export function mapCostCategoryToVendorType(category: string): VendorType | undefined {
  return COST_CATEGORY_TO_VENDOR_TYPE[category];
}

/**
 * Check if a date is expired (before current date)
 */
export function isDocumentExpired(expiryDate: string | null | undefined): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return expiry < today;
}

/**
 * Check if a date is expiring soon (within specified days)
 */
export function isDocumentExpiringSoon(
  expiryDate: string | null | undefined,
  days: number = 30
): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // If already expired, not "expiring soon"
  if (expiry < today) return false;
  
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + days);
  
  return expiry <= threshold;
}

/**
 * Get document expiry status
 */
export function getDocumentExpiryStatus(
  expiryDate: string | null | undefined
): 'valid' | 'expiring_soon' | 'expired' | 'no_expiry' {
  if (!expiryDate) return 'no_expiry';
  if (isDocumentExpired(expiryDate)) return 'expired';
  if (isDocumentExpiringSoon(expiryDate)) return 'expiring_soon';
  return 'valid';
}

/**
 * Calculate average rating from a list of ratings
 * Returns null if no ratings
 */
export function calculateAverageRating(ratings: VendorRating[]): number | null {
  if (!ratings || ratings.length === 0) return null;
  const sum = ratings.reduce((acc, r) => acc + r.overall_rating, 0);
  return Math.round((sum / ratings.length) * 100) / 100;
}

/**
 * Calculate on-time rate from a list of ratings
 * Returns null if no ratings
 */
export function calculateOnTimeRate(ratings: VendorRating[]): number | null {
  if (!ratings || ratings.length === 0) return null;
  const onTimeCount = ratings.filter((r) => r.was_on_time === true).length;
  return Math.round((onTimeCount / ratings.length) * 100 * 100) / 100;
}

/**
 * Calculate vendor summary statistics
 */
export function calculateVendorSummaryStats(vendors: Vendor[]): VendorSummaryStats {
  return {
    total: vendors.length,
    active: vendors.filter((v) => v.is_active).length,
    preferred: vendors.filter((v) => v.is_preferred).length,
    pendingVerification: vendors.filter((v) => !v.is_verified).length,
  };
}

/**
 * Sort vendors with preferred first, then by rating
 */
export function sortVendorsForDropdown<T extends { is_preferred: boolean; average_rating?: number | null }>(
  vendors: T[]
): T[] {
  return [...vendors].sort((a, b) => {
    // Preferred vendors first
    if (a.is_preferred && !b.is_preferred) return -1;
    if (!a.is_preferred && b.is_preferred) return 1;
    
    // Then by rating (higher first)
    const ratingA = a.average_rating ?? 0;
    const ratingB = b.average_rating ?? 0;
    return ratingB - ratingA;
  });
}

/**
 * Filter vendors by search term (name or code)
 */
export function filterVendorsBySearch<T extends { vendor_name: string; vendor_code: string }>(
  vendors: T[],
  search: string
): T[] {
  if (!search.trim()) return vendors;
  const searchLower = search.toLowerCase();
  return vendors.filter(
    (v) =>
      v.vendor_name.toLowerCase().includes(searchLower) ||
      v.vendor_code.toLowerCase().includes(searchLower)
  );
}

/**
 * Format currency for display (Indonesian Rupiah)
 */
export function formatVendorCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format rating for display
 */
export function formatRating(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return '-';
  return rating.toFixed(1);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(0)}%`;
}

/**
 * Validate vendor code format
 */
export function isValidVendorCode(code: string): boolean {
  return /^VND-\d{3,}$/.test(code);
}

/**
 * Validate rating value (1-5)
 */
export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}
