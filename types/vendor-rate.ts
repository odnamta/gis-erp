// Vendor Rate / Pricing Types

export type VendorRateServiceType =
  | 'equipment_rental'
  | 'labor'
  | 'customs_clearance'
  | 'port_handling'
  | 'documentation'
  | 'trucking'
  | 'shipping'
  | 'storage'
  | 'other'

export interface VendorRate {
  id: string
  vendor_id: string
  service_type: VendorRateServiceType
  description: string
  unit: string
  base_price: number
  min_quantity: number | null
  max_quantity: number | null
  effective_from: string
  effective_to: string | null
  payment_terms: string | null
  notes: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  vendor_name?: string
}

export interface VendorRateFormData {
  service_type: VendorRateServiceType
  description: string
  unit: string
  base_price: number
  min_quantity?: number | null
  max_quantity?: number | null
  effective_from: string
  effective_to?: string | null
  payment_terms?: string | null
  notes?: string | null
}

export const SERVICE_TYPE_LABELS: Record<VendorRateServiceType, string> = {
  equipment_rental: 'Sewa Alat',
  labor: 'Tenaga Kerja',
  customs_clearance: 'Customs Clearance',
  port_handling: 'Port Handling',
  documentation: 'Dokumentasi',
  trucking: 'Trucking',
  shipping: 'Shipping',
  storage: 'Penyimpanan',
  other: 'Lainnya',
}

export const SERVICE_TYPE_OPTIONS: { value: VendorRateServiceType; label: string }[] = [
  { value: 'equipment_rental', label: 'Sewa Alat' },
  { value: 'labor', label: 'Tenaga Kerja' },
  { value: 'customs_clearance', label: 'Customs Clearance' },
  { value: 'port_handling', label: 'Port Handling' },
  { value: 'documentation', label: 'Dokumentasi' },
  { value: 'trucking', label: 'Trucking' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'storage', label: 'Penyimpanan' },
  { value: 'other', label: 'Lainnya' },
]

export const UNIT_OPTIONS: { value: string; label: string }[] = [
  { value: 'per_day', label: 'Per Hari' },
  { value: 'per_trip', label: 'Per Trip' },
  { value: 'per_ton', label: 'Per Ton' },
  { value: 'per_container', label: 'Per Container' },
  { value: 'per_hour', label: 'Per Jam' },
  { value: 'per_km', label: 'Per KM' },
  { value: 'fixed', label: 'Fixed/Lumpsum' },
]

export const UNIT_LABELS: Record<string, string> = {
  per_day: 'Per Hari',
  per_trip: 'Per Trip',
  per_ton: 'Per Ton',
  per_container: 'Per Container',
  per_hour: 'Per Jam',
  per_km: 'Per KM',
  fixed: 'Fixed/Lumpsum',
}
