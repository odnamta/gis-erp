/**
 * Company Settings Types
 * Key-value storage for company-wide configuration
 */

// Database row type
export interface CompanySettingsRow {
  id: string;
  key: string;
  value: string | null;
  updated_at: string;
  updated_by: string | null;
}

// Structured settings object
export interface CompanySettings {
  // Company Information
  company_name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  phone: string;
  email: string;
  
  // Invoice Settings
  vat_rate: number;
  default_payment_terms: number;
  invoice_prefix: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  
  // Document Numbering
  pjo_format: string;
  jo_format: string;
  invoice_format: string;
  
  // Logo
  logo_url: string | null;
}

// All setting keys
export const SETTING_KEYS = [
  'company_name',
  'legal_name',
  'tax_id',
  'address',
  'phone',
  'email',
  'vat_rate',
  'default_payment_terms',
  'invoice_prefix',
  'bank_name',
  'bank_account',
  'bank_account_name',
  'pjo_format',
  'jo_format',
  'invoice_format',
  'logo_url'
] as const;

export type SettingKey = typeof SETTING_KEYS[number];

// Default values for settings
export const DEFAULT_SETTINGS: CompanySettings = {
  company_name: 'PT. Gama Intisamudera',
  legal_name: 'PT. Gama Intisamudera',
  tax_id: '',
  address: '',
  phone: '',
  email: '',
  vat_rate: 11,
  default_payment_terms: 30,
  invoice_prefix: 'GIS-A',
  bank_name: 'Bank Mandiri',
  bank_account: '',
  bank_account_name: 'PT. Gama Intisamudera',
  pjo_format: 'NNNN/CARGO/MM/YYYY',
  jo_format: 'NNNN/GG/MM/YYYY',
  invoice_format: 'NNNN/GIS-A/MM/YYYY',
  logo_url: null,
};

// Validation error messages
export const VALIDATION_MESSAGES = {
  company_name_required: 'Company name is required',
  vat_rate_invalid: 'VAT rate must be between 0 and 100',
  payment_terms_invalid: 'Payment terms must be a positive number',
  format_missing_sequence: 'Format must include NNNN for sequence number',
  format_missing_month: 'Format must include MM for month',
  format_missing_year: 'Format must include YYYY for year',
  logo_invalid_type: 'Logo must be PNG, JPG, or SVG format',
  logo_too_large: 'Logo file size must not exceed 2MB',
} as const;
