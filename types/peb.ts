// =====================================================
// v0.52: CUSTOMS - EXPORT DOCUMENTATION (PEB) Types
// =====================================================

import { CustomsOffice, TransportMode } from './pib';

// Re-export shared types
export type { TransportMode, CustomsOffice };

// Enums
export type PEBStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'loaded'
  | 'departed'
  | 'completed'
  | 'cancelled';

// Reference Data Types
export interface ExportType {
  id: string;
  type_code: string;
  type_name: string;
  description: string | null;
  requires_export_duty: boolean;
  requires_permit: boolean;
  permit_type: string | null;
  is_active: boolean;
  created_at: string;
}

// Main Document Type
export interface PEBDocument {
  id: string;
  internal_ref: string;
  peb_number: string | null;
  aju_number: string | null;

  // Relations
  job_order_id: string | null;
  customer_id: string | null;

  // Exporter
  exporter_name: string;
  exporter_npwp: string | null;
  exporter_address: string | null;

  // Consignee
  consignee_name: string | null;
  consignee_country: string | null;
  consignee_address: string | null;

  // Classification
  export_type_id: string | null;
  customs_office_id: string | null;

  // Transport
  transport_mode: TransportMode | null;
  vessel_name: string | null;
  voyage_number: string | null;
  bill_of_lading: string | null;
  awb_number: string | null;

  // Ports
  port_of_loading: string | null;
  port_of_discharge: string | null;
  final_destination: string | null;

  // Dates
  etd_date: string | null;
  atd_date: string | null;

  // Cargo
  total_packages: number | null;
  package_type: string | null;
  gross_weight_kg: number | null;

  // Values
  currency: string;
  fob_value: number | null;

  // Status
  status: PEBStatus;
  submitted_at: string | null;
  approved_at: string | null;
  loaded_at: string | null;

  // NPE (Export Approval)
  npe_number: string | null;
  npe_date: string | null;

  // Documents
  documents: PEBAttachment[];
  notes: string | null;

  // Audit
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PEBDocumentWithRelations extends PEBDocument {
  export_type?: ExportType;
  customs_office?: CustomsOffice;
  customer?: { id: string; name: string };
  job_order?: { id: string; jo_number: string };
  item_count?: number;
}

// Line Item Type
export interface PEBItem {
  id: string;
  peb_id: string;
  item_number: number;

  // Classification
  hs_code: string;
  hs_description: string | null;

  // Description
  goods_description: string;
  brand: string | null;
  specifications: string | null;

  // Quantity
  quantity: number;
  unit: string;

  // Weight
  net_weight_kg: number | null;
  gross_weight_kg: number | null;

  // Value
  unit_price: number | null;
  total_price: number | null;
  currency: string;

  created_at: string;
}

// Status History Type
export interface PEBStatusHistory {
  id: string;
  peb_id: string;
  previous_status: PEBStatus | null;
  new_status: PEBStatus;
  notes: string | null;
  changed_by: string | null;
  changed_at: string;
}

// Attachment Type
export interface PEBAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploaded_at: string;
}

// Form Data Types
export interface PEBFormData {
  job_order_id?: string;
  customer_id?: string;
  exporter_name: string;
  exporter_npwp?: string;
  exporter_address?: string;
  consignee_name?: string;
  consignee_country?: string;
  consignee_address?: string;
  export_type_id: string;
  customs_office_id: string;
  transport_mode: TransportMode;
  vessel_name?: string;
  voyage_number?: string;
  bill_of_lading?: string;
  awb_number?: string;
  port_of_loading?: string;
  port_of_discharge?: string;
  final_destination?: string;
  etd_date?: string;
  total_packages?: number;
  package_type?: string;
  gross_weight_kg?: number;
  currency: string;
  fob_value: number;
  notes?: string;
}

export interface PEBItemFormData {
  hs_code: string;
  hs_description?: string;
  goods_description: string;
  brand?: string;
  specifications?: string;
  quantity: number;
  unit: string;
  net_weight_kg?: number;
  gross_weight_kg?: number;
  unit_price: number;
  currency?: string;
}

// Status Update Data
export interface PEBStatusUpdateData {
  peb_number?: string;
  aju_number?: string;
  npe_number?: string;
  npe_date?: string;
  notes?: string;
}

// Statistics Type
export interface PEBStatistics {
  active_pebs: number;
  pending_approval: number;
  loaded: number;
  departed_mtd: number;
}

// Validation Types
export interface PEBValidationError {
  field: string;
  message: string;
}

export interface PEBValidationResult {
  valid: boolean;
  errors: PEBValidationError[];
}

// Filter Types
export interface PEBFilters {
  status?: PEBStatus;
  customs_office_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Constants
export const PEB_STATUSES: PEBStatus[] = [
  'draft',
  'submitted',
  'approved',
  'loaded',
  'departed',
  'completed',
  'cancelled',
];

export const PEB_STATUS_LABELS: Record<PEBStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  loaded: 'Loaded',
  departed: 'Departed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Status workflow - defines allowed transitions
export const PEB_STATUS_TRANSITIONS: Record<PEBStatus, PEBStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['approved', 'cancelled'],
  approved: ['loaded', 'cancelled'],
  loaded: ['departed'],
  departed: ['completed'],
  completed: [],
  cancelled: [],
};

// User roles for permission checks
export type UserRole = 'owner' | 'director' | 'sysadmin' | 'admin' | 'manager' | 'customs' | 'ops' | 'finance' | 'finance_manager';

export const USER_ROLES: UserRole[] = ['owner', 'director', 'sysadmin', 'admin', 'manager', 'customs', 'ops', 'finance', 'finance_manager'];
