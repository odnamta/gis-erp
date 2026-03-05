// Customer Contract Rate / Pricing Types

export type CustomerRateServiceType =
  | 'freight_charge'
  | 'handling'
  | 'mobilization'
  | 'demobilization'
  | 'escort'
  | 'permit'
  | 'survey'
  | 'storage'
  | 'documentation'
  | 'other'

export interface CustomerContractRate {
  id: string
  customer_id: string
  service_type: CustomerRateServiceType
  description: string
  route_pattern: string | null
  unit: string
  base_price: number
  min_quantity: number | null
  max_quantity: number | null
  effective_from: string
  effective_to: string | null
  notes: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  customer_name?: string
}

export interface CustomerRateFormData {
  service_type: CustomerRateServiceType
  description: string
  route_pattern?: string | null
  unit: string
  base_price: number
  min_quantity?: number | null
  max_quantity?: number | null
  effective_from: string
  effective_to?: string | null
  notes?: string | null
}

export const CUSTOMER_SERVICE_TYPE_LABELS: Record<CustomerRateServiceType, string> = {
  freight_charge: 'Biaya Pengiriman',
  handling: 'Handling',
  mobilization: 'Mobilisasi',
  demobilization: 'Demobilisasi',
  escort: 'Escort/Pengawalan',
  permit: 'Perizinan',
  survey: 'Survey Rute',
  storage: 'Penyimpanan',
  documentation: 'Dokumentasi',
  other: 'Lainnya',
}

export const CUSTOMER_SERVICE_TYPE_OPTIONS: { value: CustomerRateServiceType; label: string }[] = [
  { value: 'freight_charge', label: 'Biaya Pengiriman' },
  { value: 'handling', label: 'Handling' },
  { value: 'mobilization', label: 'Mobilisasi' },
  { value: 'demobilization', label: 'Demobilisasi' },
  { value: 'escort', label: 'Escort/Pengawalan' },
  { value: 'permit', label: 'Perizinan' },
  { value: 'survey', label: 'Survey Rute' },
  { value: 'storage', label: 'Penyimpanan' },
  { value: 'documentation', label: 'Dokumentasi' },
  { value: 'other', label: 'Lainnya' },
]

// Reuse UNIT_OPTIONS and UNIT_LABELS from types/vendor-rate.ts
