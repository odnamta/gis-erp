// Quotation Module Types

import { Tables, Json } from './database'
import { EngineeringStatus } from './engineering'
import { MarketType, TerrainType, ComplexityFactor } from './market-classification'

// Scope of Work types (Hutami's insight: not all quotations are inland transport)
export type ScopeOfWork =
  | 'inland_transport'
  | 'customs_clearance'
  | 'pbm'
  | 'local_service'
  | 'multi_scope'

export const SCOPE_OF_WORK_LABELS: Record<ScopeOfWork, string> = {
  inland_transport: 'Inland Transport (Heavy-Haul)',
  customs_clearance: 'Customs Clearance',
  pbm: 'PBM (Bongkar Muat)',
  local_service: 'Local Service',
  multi_scope: 'Multi-Scope',
}

// Scopes that require cargo dimensions and route details
export const TRANSPORT_SCOPES: ScopeOfWork[] = ['inland_transport', 'multi_scope']

// Status types
export type QuotationStatus =
  | 'draft'
  | 'engineering_review'
  | 'ready'
  | 'submitted'
  | 'won'
  | 'lost'
  | 'cancelled'

// Category types
export type RevenueCategory =
  | 'transportation'
  | 'handling'
  | 'documentation'
  | 'escort'
  | 'permit'
  | 'other'

export type QuotationCostCategory =
  | 'trucking'
  | 'shipping'
  | 'port'
  | 'handling'
  | 'crew'
  | 'fuel'
  | 'toll'
  | 'permit'
  | 'escort'
  | 'insurance'
  | 'documentation'
  | 'other'

export type PursuitCostCategory =
  | 'travel'
  | 'accommodation'
  | 'survey'
  | 'canvassing'
  | 'entertainment'
  | 'facilitator_fee'
  | 'documentation'
  | 'other'

// Explicit interface types (until database types are regenerated)
export interface Quotation {
  id: string
  quotation_number: string
  customer_id: string
  project_id: string | null
  title: string
  commodity: string | null
  rfq_number: string | null
  rfq_date: string | null
  rfq_received_date: string | null
  rfq_deadline: string | null
  origin: string
  origin_lat: number | null
  origin_lng: number | null
  origin_place_id: string | null
  destination: string
  destination_lat: number | null
  destination_lng: number | null
  destination_place_id: string | null
  cargo_weight_kg: number | null
  cargo_length_m: number | null
  cargo_width_m: number | null
  cargo_height_m: number | null
  cargo_value: number | null
  is_new_route: boolean | null
  terrain_type: string | null
  requires_special_permit: boolean | null
  is_hazardous: boolean | null
  duration_days: number | null
  market_type: string | null
  complexity_score: number | null
  complexity_factors: Json | null
  requires_engineering: boolean | null
  engineering_status: string | null
  engineering_assigned_to: string | null
  engineering_assigned_at: string | null
  engineering_completed_at: string | null
  engineering_completed_by: string | null
  engineering_notes: string | null
  engineering_waived_reason: string | null
  estimated_shipments: number | null
  total_revenue: number | null
  total_cost: number | null
  total_pursuit_cost: number | null
  gross_profit: number | null
  profit_margin: number | null
  status: string | null
  submitted_at: string | null
  submitted_to: string | null
  outcome_date: string | null
  outcome_reason: string | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
  is_active: boolean | null
  notes: string | null
  // New fields (not yet in generated Supabase types)
  scope_of_work?: string | null
  quotation_ref_number?: string | null
  entity_type?: string | null
}

export interface QuotationRevenueItem {
  id: string
  quotation_id: string
  category: string
  description: string
  quantity: number | null
  unit: string | null
  unit_price: number
  subtotal: number | null
  display_order: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

export interface QuotationCostItem {
  id: string
  quotation_id: string
  category: string
  description: string
  estimated_amount: number
  vendor_id: string | null
  vendor_name: string | null
  display_order: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

export interface PursuitCost {
  id: string
  quotation_id: string
  category: string
  description: string
  amount: number
  cost_date: string
  incurred_by: string | null
  marketing_portion: number | null
  engineering_portion: number | null
  receipt_url: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

// Financial summary interface
export interface QuotationFinancials {
  total_revenue: number
  total_cost: number
  total_pursuit_cost: number
  gross_profit: number
  profit_margin: number
  pursuit_cost_per_shipment: number
}

// Input types for creating/updating
export interface QuotationCreateInput {
  customer_id: string
  project_id?: string
  title: string
  commodity?: string
  rfq_number?: string
  rfq_date?: string
  rfq_received_date?: string
  rfq_deadline?: string
  origin: string
  origin_lat?: number
  origin_lng?: number
  origin_place_id?: string
  destination: string
  destination_lat?: number
  destination_lng?: number
  destination_place_id?: string
  cargo_weight_kg?: number
  cargo_length_m?: number
  cargo_width_m?: number
  cargo_height_m?: number
  cargo_value?: number
  is_new_route?: boolean
  terrain_type?: TerrainType
  requires_special_permit?: boolean
  is_hazardous?: boolean
  duration_days?: number
  estimated_shipments?: number
  notes?: string
  scope_of_work?: ScopeOfWork
  quotation_ref_number?: string
}

export interface QuotationUpdateInput extends Partial<QuotationCreateInput> {
  id: string
}

export interface RevenueItemInput {
  category: RevenueCategory
  description: string
  quantity?: number
  unit?: string
  unit_price: number
  display_order?: number
  notes?: string
}

export interface CostItemInput {
  category: QuotationCostCategory
  description: string
  estimated_amount: number
  vendor_id?: string
  vendor_name?: string
  display_order?: number
  notes?: string
}

export interface PursuitCostInput {
  category: PursuitCostCategory
  description: string
  amount: number
  cost_date: string
  incurred_by?: string
  marketing_portion?: number
  engineering_portion?: number
  receipt_url?: string
  notes?: string
}

// Conversion options
export interface ConvertToPJOOptions {
  splitByShipments: boolean
  shipmentCount?: number
}

// Extended quotation with relations
export interface QuotationWithRelations extends Quotation {
  customer?: {
    id: string
    name: string
    email: string
  }
  project?: {
    id: string
    name: string
  }
  revenue_items?: QuotationRevenueItem[]
  cost_items?: QuotationCostItem[]
  pursuit_costs?: PursuitCost[]
  created_by_user?: {
    id: string
    full_name: string
    email: string
  }
}

// Status labels for UI
export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Draft',
  engineering_review: 'Engineering Review',
  ready: 'Ready',
  submitted: 'Submitted',
  won: 'Won',
  lost: 'Lost',
  cancelled: 'Cancelled',
}

// Status colors for UI
export const QUOTATION_STATUS_COLORS: Record<QuotationStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  engineering_review: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-blue-100 text-blue-800',
  submitted: 'bg-purple-100 text-purple-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

// Revenue category labels
export const REVENUE_CATEGORY_LABELS: Record<RevenueCategory, string> = {
  transportation: 'Transportation',
  handling: 'Handling',
  documentation: 'Documentation',
  escort: 'Escort',
  permit: 'Permit',
  other: 'Other',
}

// Cost category labels
export const QUOTATION_COST_CATEGORY_LABELS: Record<QuotationCostCategory, string> = {
  trucking: 'Trucking',
  shipping: 'Shipping',
  port: 'Port Charges',
  handling: 'Handling',
  crew: 'Crew',
  fuel: 'Fuel',
  toll: 'Toll',
  permit: 'Permit',
  escort: 'Escort',
  insurance: 'Insurance',
  documentation: 'Documentation',
  other: 'Other',
}

// Pursuit cost category labels
export const PURSUIT_COST_CATEGORY_LABELS: Record<PursuitCostCategory, string> = {
  travel: 'Travel',
  accommodation: 'Accommodation',
  survey: 'Survey',
  canvassing: 'Canvassing',
  entertainment: 'Entertainment',
  facilitator_fee: 'Facilitator Fee',
  documentation: 'Documentation',
  other: 'Other',
}

// Lost reason categories for marketing evaluation
export type LostReasonCategory =
  | 'harga_tinggi'
  | 'kalah_kompetitor'
  | 'teknikal_issue'
  | 'customer_cancel'
  | 'lainnya'

export const LOST_REASON_LABELS: Record<LostReasonCategory, string> = {
  harga_tinggi: 'Harga terlalu tinggi',
  kalah_kompetitor: 'Kalah kompetitor',
  teknikal_issue: 'Teknikal issue',
  customer_cancel: 'Customer cancel',
  lainnya: 'Lainnya',
}

export const LOST_REASON_COLORS: Record<LostReasonCategory, string> = {
  harga_tinggi: 'bg-orange-100 text-orange-800',
  kalah_kompetitor: 'bg-red-100 text-red-800',
  teknikal_issue: 'bg-yellow-100 text-yellow-800',
  customer_cancel: 'bg-purple-100 text-purple-800',
  lainnya: 'bg-gray-100 text-gray-800',
}

/**
 * Parse an outcome_reason string into category + detail.
 * Format stored: "category|detail" or just "category" if no detail.
 * Legacy values (no pipe separator) are treated as 'lainnya' with the full text as detail.
 */
export function parseOutcomeReason(outcomeReason: string | null): {
  category: LostReasonCategory
  detail: string
} {
  if (!outcomeReason) return { category: 'lainnya', detail: '' }

  const pipeIndex = outcomeReason.indexOf('|')
  if (pipeIndex === -1) {
    // Legacy format: check if it matches a known category key
    if (outcomeReason in LOST_REASON_LABELS) {
      return { category: outcomeReason as LostReasonCategory, detail: '' }
    }
    // Otherwise treat as free text under "lainnya"
    return { category: 'lainnya', detail: outcomeReason }
  }

  const category = outcomeReason.substring(0, pipeIndex) as LostReasonCategory
  const detail = outcomeReason.substring(pipeIndex + 1)

  if (category in LOST_REASON_LABELS) {
    return { category, detail }
  }

  // Fallback for unrecognized category
  return { category: 'lainnya', detail: outcomeReason }
}

/**
 * Format category + detail into the stored outcome_reason string.
 */
export function formatOutcomeReason(category: LostReasonCategory, detail: string): string {
  if (detail.trim()) {
    return `${category}|${detail.trim()}`
  }
  return category
}

// Valid status transitions
export const VALID_STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ['engineering_review', 'ready', 'cancelled'],
  engineering_review: ['ready', 'cancelled'],
  ready: ['submitted', 'cancelled'],
  submitted: ['won', 'lost', 'cancelled'],
  won: [],
  lost: [],
  cancelled: [],
}

// Helper to parse complexity_factors from Json
export function parseQuotationComplexityFactors(factors: Json | null): ComplexityFactor[] {
  if (!factors || !Array.isArray(factors)) return []
  return factors as unknown as ComplexityFactor[]
}
