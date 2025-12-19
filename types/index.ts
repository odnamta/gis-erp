// Re-export all types from database
export * from './database'
import { Tables, Json } from './database'

// Status type helpers
export type CustomerStatus = 'active' | 'inactive'
export type ProjectStatus = 'active' | 'completed' | 'on_hold'
// PJOStatus is now exported from database.ts
export type JOStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'

// Re-export payment types
export * from './payments'

// Re-export vendor types
export * from './vendors'

// Invoice Term Types
export type TriggerType = 'jo_created' | 'surat_jalan' | 'berita_acara' | 'delivery'
export type PresetType = 'single' | 'dp_final' | 'dp_delivery_final' | 'custom'
export type TermStatus = 'pending' | 'ready' | 'locked' | 'invoiced'

export interface InvoiceTerm {
  term: string
  percentage: number
  description: string
  trigger: TriggerType
  invoiced: boolean
  invoice_id?: string
}

// Surat Jalan and Berita Acara Types
export type SJStatus = 'issued' | 'in_transit' | 'delivered' | 'returned'
export type BAStatus = 'draft' | 'pending_signature' | 'signed' | 'archived'
export type CargoCondition = 'good' | 'minor_damage' | 'major_damage'

// Base table types
export type JobOrder = Tables<'job_orders'>
export type Invoice = Tables<'invoices'>
export type Customer = Tables<'customers'>
export type Project = Tables<'projects'>
export type ProformaJobOrder = Tables<'proforma_job_orders'>
export type PJORevenueItem = Tables<'pjo_revenue_items'>
export type PJOCostItem = Tables<'pjo_cost_items'>
export type InvoiceLineItem = Tables<'invoice_line_items'>
export type SuratJalan = Tables<'surat_jalan'>
export type BeritaAcara = Tables<'berita_acara'>

// Extended types with relations
export interface JobOrderWithRelations extends JobOrder {
  customers?: Pick<Customer, 'id' | 'name'> | null
  projects?: Pick<Project, 'id' | 'name'> | null
  proforma_job_orders?: (Pick<ProformaJobOrder, 'id' | 'pjo_number' | 'commodity' | 'quantity' | 'quantity_unit' | 'pol' | 'pod' | 'etd' | 'eta' | 'carrier_type' | 'notes'>) | null
  // Invoice terms parsed from JSONB
  invoice_terms_parsed?: InvoiceTerm[]
}

export interface InvoiceWithRelations extends Invoice {
  customers?: Pick<Customer, 'id' | 'name' | 'email' | 'address'> | null
  job_orders?: Pick<JobOrder, 'id' | 'jo_number' | 'pjo_id'> | null
  invoice_line_items?: InvoiceLineItem[]
}

// Form data types
export interface InvoiceFormData {
  jo_id: string
  customer_id: string
  invoice_date: string
  due_date: string
  line_items: {
    description: string
    quantity: number
    unit: string
    unit_price: number
  }[]
  notes?: string
  // Invoice term metadata for split invoices
  invoice_term?: string
  term_percentage?: number
  term_description?: string
}

// Helper to parse invoice_terms from Json to InvoiceTerm[]
export function parseInvoiceTerms(terms: Json | null): InvoiceTerm[] {
  if (!terms || !Array.isArray(terms)) return []
  return terms as unknown as InvoiceTerm[]
}

// Surat Jalan with relations
export interface SuratJalanWithRelations extends SuratJalan {
  job_orders?: Pick<JobOrder, 'id' | 'jo_number' | 'description'> | null
  user_profiles?: Pick<Tables<'user_profiles'>, 'id' | 'full_name'> | null
}

// Berita Acara with relations
export interface BeritaAcaraWithRelations extends BeritaAcara {
  job_orders?: Pick<JobOrder, 'id' | 'jo_number' | 'description'> | null
  user_profiles?: Pick<Tables<'user_profiles'>, 'id' | 'full_name'> | null
}

// Surat Jalan form data
export interface SuratJalanFormData {
  delivery_date: string
  vehicle_plate: string
  driver_name: string
  driver_phone?: string
  origin: string
  destination: string
  cargo_description: string
  quantity?: number
  quantity_unit?: string
  weight_kg?: number
  sender_name?: string
  notes?: string
}

// Berita Acara form data
export interface BeritaAcaraFormData {
  handover_date: string
  location: string
  work_description: string
  cargo_condition: CargoCondition
  condition_notes?: string
  company_representative: string
  client_representative: string
  photo_urls?: string[]
  notes?: string
}

// Helper to parse photo_urls from Json to string[]
export function parsePhotoUrls(urls: Json | null): string[] {
  if (!urls || !Array.isArray(urls)) return []
  return urls as unknown as string[]
}
