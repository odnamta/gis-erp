// Vendor Management Types

export type VendorType =
  | 'trucking'
  | 'shipping'
  | 'port'
  | 'handling'
  | 'forwarding'
  | 'documentation'
  | 'other';

export type EquipmentType =
  | 'trailer_40ft'
  | 'trailer_20ft'
  | 'lowbed'
  | 'fuso'
  | 'wingbox'
  | 'crane'
  | 'forklift'
  | 'excavator'
  | 'other';

export type EquipmentCondition = 'excellent' | 'good' | 'fair' | 'poor';

export type DocumentType =
  | 'npwp'
  | 'siup'
  | 'nib'
  | 'stnk'
  | 'kir'
  | 'insurance'
  | 'contract'
  | 'other';

export type RegistrationMethod = 'manual' | 'self_register' | 'import';

export interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: VendorType;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  contact_position?: string | null;
  legal_name?: string | null;
  tax_id?: string | null;
  business_license?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account?: string | null;
  bank_account_name?: string | null;
  is_active: boolean;
  is_preferred: boolean;
  is_verified: boolean;
  verified_at?: string | null;
  verified_by?: string | null;
  total_jobs: number;
  total_value: number;
  average_rating?: number | null;
  on_time_rate?: number | null;
  registration_method: RegistrationMethod;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorWithStats extends Vendor {
  equipment_count?: number;
  ratings_count?: number;
  equipment?: VendorEquipment[];
}

export interface VendorEquipment {
  id: string;
  vendor_id: string;
  equipment_type: EquipmentType;
  plate_number?: string | null;
  brand?: string | null;
  model?: string | null;
  year_made?: number | null;
  capacity_kg?: number | null;
  capacity_m3?: number | null;
  capacity_description?: string | null;
  length_m?: number | null;
  width_m?: number | null;
  height_m?: number | null;
  daily_rate?: number | null;
  rate_notes?: string | null;
  is_available: boolean;
  condition: EquipmentCondition;
  stnk_expiry?: string | null;
  kir_expiry?: string | null;
  insurance_expiry?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorContact {
  id: string;
  vendor_id: string;
  contact_name: string;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  is_primary: boolean;
  notes?: string | null;
  created_at: string;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  document_type: DocumentType;
  document_name?: string | null;
  file_url?: string | null;
  expiry_date?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

export interface VendorRating {
  id: string;
  vendor_id: string;
  jo_id?: string | null;
  bkk_id?: string | null;
  overall_rating: number;
  punctuality_rating?: number | null;
  quality_rating?: number | null;
  communication_rating?: number | null;
  price_rating?: number | null;
  was_on_time?: boolean | null;
  had_issues: boolean;
  issue_description?: string | null;
  comments?: string | null;
  rated_by?: string | null;
  created_at: string;
}

// Form data types
export interface VendorFormData {
  vendor_name: string;
  vendor_type: VendorType;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  website?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_position?: string;
  legal_name?: string;
  tax_id?: string;
  business_license?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account?: string;
  bank_account_name?: string;
  is_active: boolean;
  is_preferred: boolean;
  notes?: string;
}

export interface EquipmentFormData {
  equipment_type: EquipmentType;
  plate_number?: string;
  brand?: string;
  model?: string;
  year_made?: number;
  capacity_kg?: number;
  capacity_m3?: number;
  capacity_description?: string;
  length_m?: number;
  width_m?: number;
  height_m?: number;
  daily_rate?: number;
  rate_notes?: string;
  is_available: boolean;
  condition: EquipmentCondition;
  stnk_expiry?: string;
  kir_expiry?: string;
  insurance_expiry?: string;
  notes?: string;
}

export interface RatingFormData {
  overall_rating: number;
  punctuality_rating?: number;
  quality_rating?: number;
  communication_rating?: number;
  price_rating?: number;
  was_on_time: boolean;
  had_issues: boolean;
  issue_description?: string;
  comments?: string;
}

export interface DocumentFormData {
  document_type: DocumentType;
  document_name?: string;
  expiry_date?: string;
}

// Filter types
export interface VendorFilterState {
  search: string;
  type: VendorType | 'all';
  status: 'active' | 'inactive' | 'all';
  preferredOnly: boolean;
}

// Summary stats
export interface VendorSummaryStats {
  total: number;
  active: number;
  preferred: number;
  pendingVerification: number;
}
