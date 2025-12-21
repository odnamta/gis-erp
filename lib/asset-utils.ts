import {
  AssetStatus,
  DepreciationMethod,
  AssetDocumentType,
  DocumentExpiryStatus,
  Asset,
  AssetSummaryStats,
} from '@/types/assets';

// Status options for dropdowns
export const ASSET_STATUSES: { value: AssetStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'idle', label: 'Idle' },
  { value: 'disposed', label: 'Disposed' },
  { value: 'sold', label: 'Sold' },
];

// Depreciation method options
export const DEPRECIATION_METHODS: { value: DepreciationMethod; label: string }[] = [
  { value: 'straight_line', label: 'Straight Line' },
  { value: 'declining_balance', label: 'Declining Balance' },
  { value: 'units_of_production', label: 'Units of Production' },
];

// Document type options
export const ASSET_DOCUMENT_TYPES: { value: AssetDocumentType; label: string }[] = [
  { value: 'registration', label: 'Registration (STNK)' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'kir', label: 'KIR Inspection' },
  { value: 'permit', label: 'Permit' },
  { value: 'purchase', label: 'Purchase Document' },
  { value: 'manual', label: 'Manual' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
];

// Valid status values
const VALID_STATUSES: AssetStatus[] = ['active', 'maintenance', 'repair', 'idle', 'disposed', 'sold'];

// Valid depreciation methods
const VALID_DEPRECIATION_METHODS: DepreciationMethod[] = ['straight_line', 'declining_balance', 'units_of_production'];

// Valid document types
const VALID_DOCUMENT_TYPES: AssetDocumentType[] = ['registration', 'insurance', 'kir', 'permit', 'purchase', 'manual', 'photo', 'other'];

/**
 * Get status label
 */
export function getAssetStatusLabel(status: AssetStatus): string {
  return ASSET_STATUSES.find((s) => s.value === status)?.label || status;
}

/**
 * Get depreciation method label
 */
export function getDepreciationMethodLabel(method: DepreciationMethod): string {
  return DEPRECIATION_METHODS.find((m) => m.value === method)?.label || method;
}

/**
 * Get document type label
 */
export function getAssetDocumentTypeLabel(type: AssetDocumentType): string {
  return ASSET_DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
}

/**
 * Validate asset status
 */
export function isValidAssetStatus(status: string): status is AssetStatus {
  return VALID_STATUSES.includes(status as AssetStatus);
}

/**
 * Validate depreciation method
 */
export function isValidDepreciationMethod(method: string): method is DepreciationMethod {
  return VALID_DEPRECIATION_METHODS.includes(method as DepreciationMethod);
}

/**
 * Validate document type
 */
export function isValidAssetDocumentType(type: string): type is AssetDocumentType {
  return VALID_DOCUMENT_TYPES.includes(type as AssetDocumentType);
}

/**
 * Calculate asset summary stats
 */
export function calculateAssetSummaryStats(
  assets: Asset[],
  expiringDocsCount: number
): AssetSummaryStats {
  const activeAssets = assets.filter((a) => !['disposed', 'sold'].includes(a.status));
  
  return {
    total: activeAssets.length,
    active: activeAssets.filter((a) => a.status === 'active').length,
    maintenance: activeAssets.filter((a) => a.status === 'maintenance').length,
    idle: activeAssets.filter((a) => a.status === 'idle').length,
    totalBookValue: activeAssets.reduce((sum, a) => sum + (a.book_value || 0), 0),
    expiringDocuments: expiringDocsCount,
  };
}

/**
 * Filter assets by search term
 */
export function filterAssetsBySearch<
  T extends { asset_code: string; asset_name: string; registration_number: string | null }
>(assets: T[], search: string): T[] {
  if (!search.trim()) return assets;
  const searchLower = search.toLowerCase();
  return assets.filter(
    (a) =>
      a.asset_code.toLowerCase().includes(searchLower) ||
      a.asset_name.toLowerCase().includes(searchLower) ||
      (a.registration_number && a.registration_number.toLowerCase().includes(searchLower))
  );
}

/**
 * Get document expiry status
 */
export function getDocumentExpiryStatus(
  expiryDate: string | null,
  reminderDays: number = 30
): DocumentExpiryStatus {
  if (!expiryDate) return 'no_expiry';
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  if (expiry < today) return 'expired';
  
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + reminderDays);
  
  if (expiry <= threshold) return 'expiring_soon';
  
  return 'valid';
}

/**
 * Check if document is expired
 */
export function isDocumentExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return expiry < today;
}

/**
 * Check if document is expiring soon
 */
export function isDocumentExpiringSoon(
  expiryDate: string | null,
  reminderDays: number = 30
): boolean {
  if (!expiryDate) return false;
  
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  // If already expired, not "expiring soon"
  if (expiry < today) return false;
  
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + reminderDays);
  
  return expiry <= threshold;
}

/**
 * Calculate days until expiry
 */
export function calculateDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format currency (Indonesian Rupiah)
 */
export function formatAssetCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatAssetDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Calculate asset age in years
 */
export function calculateAssetAge(purchaseDate: string): number {
  const purchase = new Date(purchaseDate);
  const today = new Date();
  const diffTime = today.getTime() - purchase.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25));
}

/**
 * Calculate straight line depreciation
 */
export function calculateStraightLineDepreciation(
  purchasePrice: number,
  salvageValue: number,
  usefulLifeYears: number,
  yearsElapsed: number
): { annualDepreciation: number; accumulatedDepreciation: number; bookValue: number } {
  if (usefulLifeYears <= 0 || purchasePrice <= 0) {
    return { annualDepreciation: 0, accumulatedDepreciation: 0, bookValue: purchasePrice };
  }
  
  const depreciableAmount = purchasePrice - salvageValue;
  const annualDepreciation = depreciableAmount / usefulLifeYears;
  
  // Cap accumulated depreciation at depreciable amount
  const accumulatedDepreciation = Math.min(
    annualDepreciation * yearsElapsed,
    depreciableAmount
  );
  
  const bookValue = purchasePrice - accumulatedDepreciation;
  
  return {
    annualDepreciation: Math.round(annualDepreciation * 100) / 100,
    accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
    bookValue: Math.round(bookValue * 100) / 100,
  };
}

/**
 * Validate asset code format
 */
export function isValidAssetCode(code: string): boolean {
  // Format: CATEGORY-NNNN (e.g., TRUCK-0001, CRANE-0012)
  return /^[A-Z]+-\d{4,}$/.test(code);
}

/**
 * Get status badge variant
 */
export function getAssetStatusBadgeVariant(
  status: AssetStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'maintenance':
    case 'repair':
      return 'secondary';
    case 'disposed':
    case 'sold':
      return 'destructive';
    case 'idle':
    default:
      return 'outline';
  }
}

/**
 * Get document expiry badge variant
 */
export function getDocumentExpiryBadgeVariant(
  status: DocumentExpiryStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'valid':
      return 'default';
    case 'expiring_soon':
      return 'secondary';
    case 'expired':
      return 'destructive';
    case 'no_expiry':
    default:
      return 'outline';
  }
}
