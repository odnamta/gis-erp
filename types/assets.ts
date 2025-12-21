// Equipment Asset Registry Types

// Asset status types
export type AssetStatus = 'active' | 'maintenance' | 'repair' | 'idle' | 'disposed' | 'sold';

// Depreciation method types
export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'units_of_production';

// Document type for assets
export type AssetDocumentType =
  | 'registration'
  | 'insurance'
  | 'kir'
  | 'permit'
  | 'purchase'
  | 'manual'
  | 'photo'
  | 'other';

// Document expiry status
export type DocumentExpiryStatus = 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';

// Asset category interface
export interface AssetCategory {
  id: string;
  category_code: string;
  category_name: string;
  description: string | null;
  default_useful_life_years: number;
  default_depreciation_method: DepreciationMethod;
  default_total_units: number | null;
  parent_category_id: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

// Asset location interface
export interface AssetLocation {
  id: string;
  location_code: string;
  location_name: string;
  address: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
}

// Main asset interface
export interface Asset {
  id: string;
  asset_code: string;
  asset_name: string;
  description: string | null;
  category_id: string;
  // Vehicle-specific
  registration_number: string | null;
  vin_number: string | null;
  engine_number: string | null;
  chassis_number: string | null;
  // Specifications
  brand: string | null;
  model: string | null;
  year_manufactured: number | null;
  color: string | null;
  // Capacity
  capacity_tons: number | null;
  capacity_cbm: number | null;
  axle_configuration: string | null;
  // Dimensions
  length_m: number | null;
  width_m: number | null;
  height_m: number | null;
  weight_kg: number | null;
  // Financial
  purchase_date: string | null;
  purchase_price: number | null;
  purchase_vendor: string | null;
  purchase_invoice: string | null;
  // Depreciation
  useful_life_years: number | null;
  salvage_value: number;
  depreciation_method: DepreciationMethod;
  depreciation_start_date: string | null;
  total_expected_units: number | null;
  current_units: number;
  accumulated_depreciation: number;
  book_value: number | null;
  // Location & Status
  current_location_id: string | null;
  status: AssetStatus;
  // Assignment
  assigned_to_employee_id: string | null;
  assigned_to_job_id: string | null;
  // Insurance
  insurance_policy_number: string | null;
  insurance_provider: string | null;
  insurance_expiry_date: string | null;
  insurance_value: number | null;
  // Registration/Permits
  registration_expiry_date: string | null;
  kir_expiry_date: string | null;
  // Documents & Photos (JSONB)
  documents: AssetDocumentJson[];
  photos: AssetPhotoJson[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Asset with relations for display
export interface AssetWithRelations extends Asset {
  category: AssetCategory | null;
  location: AssetLocation | null;
  assigned_employee: { full_name: string; employee_code: string } | null;
  assigned_job: { jo_number: string } | null;
}

// Asset status history
export interface AssetStatusHistory {
  id: string;
  asset_id: string;
  previous_status: AssetStatus | null;
  new_status: AssetStatus;
  previous_location_id: string | null;
  new_location_id: string | null;
  reason: string | null;
  notes: string | null;
  changed_by: string | null;
  changed_at: string;
}

// Asset document record
export interface AssetDocument {
  id: string;
  asset_id: string;
  document_type: AssetDocumentType;
  document_name: string;
  document_url: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  reminder_days: number;
  notes: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

// Expiring document view
export interface ExpiringDocument {
  id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  registration_number: string | null;
  document_type: AssetDocumentType;
  document_name: string;
  expiry_date: string;
  days_until_expiry: number;
  status: DocumentExpiryStatus;
}

// Asset summary by category
export interface AssetCategorySummary {
  category_name: string;
  total_count: number;
  active_count: number;
  maintenance_count: number;
  idle_count: number;
  total_purchase_value: number;
  total_book_value: number;
}

// Asset summary stats for dashboard
export interface AssetSummaryStats {
  total: number;
  active: number;
  maintenance: number;
  idle: number;
  totalBookValue: number;
  expiringDocuments: number;
}

// Filter state
export interface AssetFilterState {
  search: string;
  categoryId: string | 'all';
  status: AssetStatus | 'all';
  locationId: string | 'all';
}

// Form data for create/update
export interface AssetFormData {
  asset_name: string;
  description?: string;
  category_id: string;
  registration_number?: string;
  vin_number?: string;
  engine_number?: string;
  chassis_number?: string;
  brand?: string;
  model?: string;
  year_manufactured?: number;
  color?: string;
  capacity_tons?: number;
  capacity_cbm?: number;
  axle_configuration?: string;
  length_m?: number;
  width_m?: number;
  height_m?: number;
  weight_kg?: number;
  purchase_date?: string;
  purchase_price?: number;
  purchase_vendor?: string;
  purchase_invoice?: string;
  useful_life_years?: number;
  salvage_value?: number;
  depreciation_method?: DepreciationMethod;
  current_location_id?: string;
  insurance_policy_number?: string;
  insurance_provider?: string;
  insurance_expiry_date?: string;
  insurance_value?: number;
  registration_expiry_date?: string;
  kir_expiry_date?: string;
  notes?: string;
}

// Status change form data
export interface StatusChangeFormData {
  new_status: AssetStatus;
  reason: string;
  new_location_id?: string;
  notes?: string;
}

// Document form data
export interface AssetDocumentFormData {
  document_type: AssetDocumentType;
  document_name: string;
  issue_date?: string;
  expiry_date?: string;
  reminder_days?: number;
  notes?: string;
}

// JSONB types for inline storage
export interface AssetDocumentJson {
  type: string;
  name: string;
  url: string;
  expiry_date: string | null;
}

export interface AssetPhotoJson {
  url: string;
  caption: string | null;
  is_primary: boolean;
}
