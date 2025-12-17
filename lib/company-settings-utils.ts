/**
 * Company Settings Utility Functions
 * Validation and document number generation utilities
 */

import { CompanySettings, DEFAULT_SETTINGS, VALIDATION_MESSAGES } from '@/types/company-settings';

// Maximum logo file size: 2MB
const MAX_LOGO_SIZE = 2 * 1024 * 1024;

// Allowed logo MIME types
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

/**
 * Validate VAT rate (must be between 0 and 100 inclusive)
 * **Feature: company-settings, Property 4: VAT rate validation**
 */
export function validateVatRate(rate: number): boolean {
  return typeof rate === 'number' && !isNaN(rate) && rate >= 0 && rate <= 100;
}

/**
 * Validate payment terms (must be a positive integer)
 * **Feature: company-settings, Property 5: Payment terms validation**
 */
export function validatePaymentTerms(days: number): boolean {
  return typeof days === 'number' && !isNaN(days) && Number.isInteger(days) && days > 0;
}

/**
 * Validate document number format
 * Must contain NNNN (sequence), MM (month), and YYYY (year)
 * **Feature: company-settings, Property 6: Document number format validation**
 */
export function validateDocumentFormat(format: string): { 
  valid: boolean; 
  missingPlaceholders: string[] 
} {
  const missingPlaceholders: string[] = [];
  
  if (!format.includes('NNNN')) {
    missingPlaceholders.push('NNNN');
  }
  if (!format.includes('MM')) {
    missingPlaceholders.push('MM');
  }
  if (!format.includes('YYYY')) {
    missingPlaceholders.push('YYYY');
  }
  
  return {
    valid: missingPlaceholders.length === 0,
    missingPlaceholders
  };
}


/**
 * Validate logo file (type and size)
 * **Feature: company-settings, Property 8: Logo file type validation**
 * **Feature: company-settings, Property 9: Logo file size validation**
 */
export function validateLogoFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    return { valid: false, error: VALIDATION_MESSAGES.logo_invalid_type };
  }
  
  // Check file size
  if (file.size > MAX_LOGO_SIZE) {
    return { valid: false, error: VALIDATION_MESSAGES.logo_too_large };
  }
  
  return { valid: true };
}

/**
 * Get setting value with type coercion
 */
export function getSettingValue<T>(
  settings: Record<string, string | null>,
  key: string,
  defaultValue: T
): T {
  const value = settings[key];
  
  if (value === null || value === undefined) {
    return defaultValue;
  }
  
  // Handle number coercion
  if (typeof defaultValue === 'number') {
    const num = parseFloat(value);
    return (isNaN(num) ? defaultValue : num) as T;
  }
  
  // Handle boolean coercion
  if (typeof defaultValue === 'boolean') {
    return (value === 'true') as unknown as T;
  }
  
  return value as unknown as T;
}

/**
 * Transform database rows to CompanySettings object
 */
export function rowsToSettings(rows: Array<{ key: string; value: string | null }>): CompanySettings {
  const settingsMap: Record<string, string | null> = {};
  
  for (const row of rows) {
    settingsMap[row.key] = row.value;
  }
  
  return {
    company_name: getSettingValue(settingsMap, 'company_name', DEFAULT_SETTINGS.company_name),
    legal_name: getSettingValue(settingsMap, 'legal_name', DEFAULT_SETTINGS.legal_name),
    tax_id: getSettingValue(settingsMap, 'tax_id', DEFAULT_SETTINGS.tax_id),
    address: getSettingValue(settingsMap, 'address', DEFAULT_SETTINGS.address),
    phone: getSettingValue(settingsMap, 'phone', DEFAULT_SETTINGS.phone),
    email: getSettingValue(settingsMap, 'email', DEFAULT_SETTINGS.email),
    vat_rate: getSettingValue(settingsMap, 'vat_rate', DEFAULT_SETTINGS.vat_rate),
    default_payment_terms: getSettingValue(settingsMap, 'default_payment_terms', DEFAULT_SETTINGS.default_payment_terms),
    invoice_prefix: getSettingValue(settingsMap, 'invoice_prefix', DEFAULT_SETTINGS.invoice_prefix),
    bank_name: getSettingValue(settingsMap, 'bank_name', DEFAULT_SETTINGS.bank_name),
    bank_account: getSettingValue(settingsMap, 'bank_account', DEFAULT_SETTINGS.bank_account),
    bank_account_name: getSettingValue(settingsMap, 'bank_account_name', DEFAULT_SETTINGS.bank_account_name),
    pjo_format: getSettingValue(settingsMap, 'pjo_format', DEFAULT_SETTINGS.pjo_format),
    jo_format: getSettingValue(settingsMap, 'jo_format', DEFAULT_SETTINGS.jo_format),
    invoice_format: getSettingValue(settingsMap, 'invoice_format', DEFAULT_SETTINGS.invoice_format),
    logo_url: getSettingValue(settingsMap, 'logo_url', DEFAULT_SETTINGS.logo_url),
  };
}

/**
 * Validate required fields in settings
 * **Feature: company-settings, Property 3: Required field validation**
 */
export function validateRequiredFields(settings: Partial<CompanySettings>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  
  // Company name is required
  if (settings.company_name !== undefined) {
    const trimmed = settings.company_name.trim();
    if (!trimmed) {
      errors.company_name = VALIDATION_MESSAGES.company_name_required;
    }
  }
  
  // VAT rate validation
  if (settings.vat_rate !== undefined && !validateVatRate(settings.vat_rate)) {
    errors.vat_rate = VALIDATION_MESSAGES.vat_rate_invalid;
  }
  
  // Payment terms validation
  if (settings.default_payment_terms !== undefined && !validatePaymentTerms(settings.default_payment_terms)) {
    errors.default_payment_terms = VALIDATION_MESSAGES.payment_terms_invalid;
  }
  
  // Document format validations
  if (settings.pjo_format !== undefined) {
    const result = validateDocumentFormat(settings.pjo_format);
    if (!result.valid) {
      errors.pjo_format = result.missingPlaceholders.map(p => {
        if (p === 'NNNN') return VALIDATION_MESSAGES.format_missing_sequence;
        if (p === 'MM') return VALIDATION_MESSAGES.format_missing_month;
        return VALIDATION_MESSAGES.format_missing_year;
      }).join(', ');
    }
  }
  
  if (settings.jo_format !== undefined) {
    const result = validateDocumentFormat(settings.jo_format);
    if (!result.valid) {
      errors.jo_format = result.missingPlaceholders.map(p => {
        if (p === 'NNNN') return VALIDATION_MESSAGES.format_missing_sequence;
        if (p === 'MM') return VALIDATION_MESSAGES.format_missing_month;
        return VALIDATION_MESSAGES.format_missing_year;
      }).join(', ');
    }
  }
  
  if (settings.invoice_format !== undefined) {
    const result = validateDocumentFormat(settings.invoice_format);
    if (!result.valid) {
      errors.invoice_format = result.missingPlaceholders.map(p => {
        if (p === 'NNNN') return VALIDATION_MESSAGES.format_missing_sequence;
        if (p === 'MM') return VALIDATION_MESSAGES.format_missing_month;
        return VALIDATION_MESSAGES.format_missing_year;
      }).join(', ');
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}


/**
 * Convert month number to Roman numeral
 */
function toRomanMonth(month: number): string {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romanNumerals[month - 1] || 'I';
}

/**
 * Generate document number from format
 * Replaces NNNN with zero-padded sequence, MM with Roman month, YYYY with year
 * **Feature: company-settings, Property 7: Document number generation**
 */
export function generateDocumentNumber(
  format: string,
  sequence: number,
  date: Date = new Date()
): string {
  const paddedSequence = sequence.toString().padStart(4, '0');
  const month = date.getMonth() + 1;
  const romanMonth = toRomanMonth(month);
  const year = date.getFullYear().toString();
  
  return format
    .replace('NNNN', paddedSequence)
    .replace('MM', romanMonth)
    .replace('YYYY', year);
}

/**
 * Preview document number format with sample values
 * Uses sequence 1 and current date for preview
 */
export function previewDocumentNumber(format: string, sequence: number = 1): string {
  return generateDocumentNumber(format, sequence, new Date());
}

/**
 * Parse existing document number to extract sequence
 * Returns null if format doesn't match
 */
export function parseDocumentNumber(
  documentNumber: string,
  format: string
): { sequence: number; month: string; year: string } | null {
  // Create regex pattern from format
  // NNNN -> (\d{4})
  // MM -> ([IVX]+)
  // YYYY -> (\d{4})
  const escapedFormat = format
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace('NNNN', '(\\d{4})')
    .replace('MM', '([IVX]+)')
    .replace('YYYY', '(\\d{4})');
  
  const regex = new RegExp(`^${escapedFormat}$`);
  const match = documentNumber.match(regex);
  
  if (!match) return null;
  
  // Find positions of placeholders in original format
  const nnnnPos = format.indexOf('NNNN');
  const mmPos = format.indexOf('MM');
  const yyyyPos = format.indexOf('YYYY');
  
  // Sort positions to determine capture group order
  const positions = [
    { type: 'sequence', pos: nnnnPos },
    { type: 'month', pos: mmPos },
    { type: 'year', pos: yyyyPos }
  ].sort((a, b) => a.pos - b.pos);
  
  const result: { sequence: number; month: string; year: string } = {
    sequence: 0,
    month: '',
    year: ''
  };
  
  positions.forEach((p, i) => {
    const value = match[i + 1];
    if (p.type === 'sequence') result.sequence = parseInt(value, 10);
    else if (p.type === 'month') result.month = value;
    else if (p.type === 'year') result.year = value;
  });
  
  return result;
}

/**
 * Get next sequence number for a document type
 * This is a helper that would typically query the database
 */
export function getNextSequenceNumber(currentMax: number): number {
  return currentMax + 1;
}
