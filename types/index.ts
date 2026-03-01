// Re-export all types from database
export * from './database'
import { Tables, Json } from './database'

// Re-export permissions types (UserProfile, UserRole, etc.)
export * from './permissions'

// Status type helpers
export type CustomerStatus = 'active' | 'inactive'
export type ProjectStatus = 'active' | 'completed' | 'on_hold'
// PJOStatus is now exported from database.ts
export type JOStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type InvoiceStatus = 'draft' | 'sent' | 'received' | 'partial' | 'paid' | 'overdue' | 'cancelled'

// Re-export payment types
export * from './payments'

// Re-export vendor types
export * from './vendors'

// Re-export market classification types
export * from './market-classification'

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

// PJO Status type
export type PJOStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected'

// Cost Item Status type
export type CostItemStatus = 'estimated' | 'confirmed' | 'exceeded' | 'under_budget' | 'at_risk'

// Budget Analysis type - supports both camelCase and snake_case for flexibility
export interface BudgetAnalysis {
  // camelCase properties (original)
  totalEstimated: number
  totalActual: number
  variance: number
  variancePercentage: number
  confirmedCount: number
  pendingCount: number
  exceededCount: number
  underBudgetCount: number
  isHealthy: boolean
  allConfirmed: boolean
  // snake_case properties (used by budget-summary component)
  total_estimated?: number
  total_actual?: number
  total_variance?: number
  variance_percentage?: number
  items_confirmed?: number
  items_pending?: number
  items_over_budget?: number
  items_under_budget?: number
  all_confirmed?: boolean
  has_overruns?: boolean
}

// PJO with relations for display
export interface PJOWithRelations extends Omit<ProformaJobOrder, 'quotation_id'> {
  projects?: {
    id: string
    name: string
    customers?: {
      id: string
      name: string
      company_name?: string | null
    } | null
  } | null
  // Quotation reference (for PJOs created from quotations)
  quotation_id?: string | null
  quotation?: {
    id: string
    quotation_number: string
    title: string
  } | null
}

// Extended types with relations
export interface JobOrderWithRelations extends JobOrder {
  customers?: (Pick<Customer, 'id' | 'name'> & { company_name?: string | null }) | null
  projects?: Pick<Project, 'id' | 'name'> | null
  proforma_job_orders?: (Pick<ProformaJobOrder, 'id' | 'pjo_number' | 'commodity' | 'quantity' | 'quantity_unit' | 'pol' | 'pod' | 'etd' | 'eta' | 'carrier_type' | 'notes'>) | null
  // Invoice terms parsed from JSONB
  invoice_terms_parsed?: InvoiceTerm[]
}

export interface InvoiceWithRelations extends Invoice {
  customers?: (Pick<Customer, 'id' | 'name' | 'email' | 'address'> & { company_name?: string | null }) | null
  job_orders?: Pick<JobOrder, 'id' | 'jo_number' | 'pjo_id'> | null
  invoice_line_items?: InvoiceLineItem[]
  /** Whether this invoice has linked Bilyet Giro records */
  has_bg?: boolean
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

// Invoice line item input type for forms
export interface InvoiceLineItemInput {
  description: string
  quantity: number
  unit: string
  unit_price: number
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

// =====================================================
// BKK (Bukti Kas Keluar) Types
// =====================================================

// BKK Status type
export type BKKStatus = 'pending' | 'approved' | 'rejected' | 'released' | 'settled' | 'cancelled'

// BKK Release Method type
export type BKKReleaseMethod = 'cash' | 'transfer' | 'check'

// Base BKK type from database
export type BKK = Tables<'bukti_kas_keluar'>

// BKK with relations for display
export interface BKKWithRelations extends BKK {
  job_orders?: Pick<JobOrder, 'id' | 'jo_number' | 'description'> | null
  vendors?: { id: string; name: string } | null
  requested_by_user?: { id: string; full_name: string } | null
  approved_by_user?: { id: string; full_name: string } | null
  released_by_user?: { id: string; full_name: string } | null
  settled_by_user?: { id: string; full_name: string } | null
  pjo_cost_items?: Pick<PJOCostItem, 'id' | 'category' | 'description'> | null
  // Alternative relation names used by components
  requester?: { id: string; full_name: string } | null
  approver?: { id: string; full_name: string } | null
  releaser?: { id: string; full_name: string } | null
  settler?: { id: string; full_name: string } | null
}

// BKK Summary Totals
export interface BKKSummaryTotals {
  totalRequested: number
  totalReleased: number
  totalSettled: number
  pendingReturn: number
  count: {
    pending: number
    approved: number
    released: number
    settled: number
    rejected: number
    cancelled: number
  }
  // Alternative property names
  totalSpent?: number
  totalReturned?: number
  pendingCount?: number
  approvedCount?: number
  releasedCount?: number
  settledCount?: number
}

// Create BKK Input
export interface CreateBKKInput {
  jo_id: string
  purpose: string
  amount_requested: number
  budget_category?: string
  budget_amount?: number
  pjo_cost_item_id?: string
  vendor_id?: string
  notes?: string
}

// Release BKK Input
export interface ReleaseBKKInput {
  release_method: BKKReleaseMethod
  release_reference?: string
  notes?: string
}

// Settle BKK Input
export interface SettleBKKInput {
  amount_spent: number
  amount_returned?: number
  receipt_urls?: string[]
  notes?: string
}

// Settlement Difference
export interface SettlementDifference {
  releasedAmount: number
  spentAmount: number
  difference: number
  type: 'return' | 'additional' | 'exact'
}

// Available Budget
export interface AvailableBudget {
  budgetAmount: number
  alreadyDisbursed: number
  available: number
  pendingRequests: number
}

// =====================================================
// Dashboard Types
// =====================================================

// Dashboard KPIs - used by fetchDashboardKPIs in dashboard/actions.ts
export interface DashboardKPIs {
  // Operational KPIs (primary usage)
  awaitingOpsInput: number
  exceededBudgetItems: number
  readyForConversion: number
  outstandingAR: number
  
  // Extended metrics (optional, for enhanced dashboards)
  total_revenue_mtd?: number
  total_revenue_ytd?: number
  revenue_target?: number
  revenue_achievement?: number
  total_costs_mtd?: number
  total_costs_ytd?: number
  gross_profit_mtd?: number
  gross_profit_ytd?: number
  profit_margin?: number
  active_jos?: number
  pending_pjos?: number
  pending_invoices?: number
  overdue_invoices?: number
  bkk_pending_approval?: number
  bkk_pending_amount?: number
}

// Budget Alert - used by fetchBudgetAlerts in dashboard/actions.ts
export interface BudgetAlert {
  id: string
  pjo_id: string
  pjo_number: string
  category: string
  description: string | null
  estimated_amount: number
  actual_amount: number
  variance: number
  variance_pct: number
  created_at: string
  // Legacy properties for backward compatibility
  jo_id?: string
  jo_number?: string
  variance_percentage?: number
  severity?: 'warning' | 'critical'
}

// Activity Entry - used by fetchRecentActivity in dashboard/actions.ts
export interface ActivityEntry {
  id: string
  action_type: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'submit' | 'complete' | 'cancel' | 'release' | 'settle' | 'convert' | 'pjo_approved' | 'pjo_rejected' | 'jo_created' | 'jo_completed' | 'jo_submitted_to_finance' | 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'cost_confirmed'
  document_type: 'pjo' | 'jo' | 'invoice' | 'bkk' | 'customer' | 'project' | 'quotation' | 'surat_jalan' | 'berita_acara' | 'payment' | 'vendor' | 'vendor_invoice'
  document_id: string
  document_number: string | null
  user_id: string
  user_name: string | null
  details?: Record<string, unknown>
  created_at: string
  // Legacy properties for backward compatibility
  action?: string
  module?: string
  description?: string
  user_email?: string
  entity_type?: string
  entity_id?: string
  entity_reference?: string
}

// Ops Queue Item - used by fetchOperationsQueue in dashboard/actions.ts
export interface OpsQueueItem {
  id: string
  pjo_number: string
  customer_name: string
  project_name: string | null
  commodity: string | null
  costs_confirmed: number
  costs_total: number
  created_at: string
  // Legacy properties for backward compatibility
  jo_id?: string
  jo_number?: string
  description?: string
  status?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string | null
  assigned_to?: string
}

// Manager Metrics - used by fetchManagerMetrics in dashboard/actions.ts
export interface ManagerMetrics {
  // Primary metrics (actual usage)
  totalRevenue: number
  totalCosts: number
  totalProfit: number
  margin: number
  activeJOCount: number
  
  // Extended metrics (optional, for enhanced dashboards)
  team_size?: number
  active_team_members?: number
  department_revenue?: number
  department_costs?: number
  department_profit?: number
  pending_approvals?: number
  pending_reviews?: number
  on_time_delivery_rate?: number
  customer_satisfaction?: number
}

// =====================================================
// Conversion Types
// =====================================================

// Conversion Readiness
export interface ConversionReadiness {
  can_convert: boolean
  reasons: string[]
  warnings: string[]
  all_costs_confirmed: boolean
  has_revenue_items: boolean
  has_cost_items: boolean
  budget_health: 'healthy' | 'warning' | 'critical'
  // Additional properties used by conversion-status component
  ready?: boolean
  blockers?: string[]
  summary?: {
    totalRevenue: number
    totalCost: number
    estimatedProfit: number
    profitMargin: number
  }
}

// Job Order Extended (with additional computed fields)
export interface JobOrderExtended extends JobOrderWithRelations {
  total_revenue: number
  total_costs: number
  gross_profit: number
  profit_margin: number
  bkk_summary?: BKKSummaryTotals
  invoice_summary?: {
    total_invoiced: number
    total_paid: number
    total_outstanding: number
  }
}

// =====================================================
// Additional Missing Types
// =====================================================

// Cost Category type
export type CostCategory = 
  | 'trucking'
  | 'port_charges'
  | 'documentation'
  | 'handling'
  | 'customs'
  | 'insurance'
  | 'storage'
  | 'labor'
  | 'fuel'
  | 'tolls'
  | 'other'

// Cost Progress for dashboard - used by calculateCostProgress in dashboard-utils.ts
export interface CostProgress {
  confirmed: number
  total: number
  // Extended properties for detailed cost tracking
  category?: CostCategory
  estimated?: number
  actual?: number
  variance?: number
  percentage?: number
}

// Activity Type for dashboard - specific action types used in activity logging
export type ActivityType = 
  // Generic actions
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'complete'
  | 'cancel'
  // Specific workflow actions (used by dashboard-utils.ts)
  | 'pjo_approved'
  | 'pjo_rejected'
  | 'jo_created'
  | 'jo_completed'
  | 'jo_submitted_to_finance'
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'cost_confirmed'

