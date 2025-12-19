/**
 * Invoice Terms Utility Functions
 * Handles invoice splitting logic for Job Orders
 */

// Types
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

// VAT rate in Indonesia (11%)
export const VAT_RATE = 0.11

// Trigger labels for display
export const TRIGGER_LABELS: Record<TriggerType, string> = {
  jo_created: 'JO Created',
  surat_jalan: 'Surat Jalan',
  berita_acara: 'Berita Acara',
  delivery: 'Delivery',
}

// Preset labels for dropdown
export const PRESET_LABELS: Record<PresetType, string> = {
  single: 'Single Invoice (100%)',
  dp_final: 'DP + Final (30/70)',
  dp_delivery_final: 'DP + Delivery + Final (30/50/20)',
  custom: 'Custom',
}


// Preset term templates
export const INVOICE_TERM_PRESETS: Record<Exclude<PresetType, 'custom'>, InvoiceTerm[]> = {
  single: [
    { term: 'full', percentage: 100, description: 'Full Payment', trigger: 'jo_created', invoiced: false }
  ],
  dp_final: [
    { term: 'down_payment', percentage: 30, description: 'Down Payment', trigger: 'jo_created', invoiced: false },
    { term: 'final', percentage: 70, description: 'Final Payment', trigger: 'delivery', invoiced: false }
  ],
  dp_delivery_final: [
    { term: 'down_payment', percentage: 30, description: 'Down Payment', trigger: 'jo_created', invoiced: false },
    { term: 'delivery', percentage: 50, description: 'Upon Delivery', trigger: 'surat_jalan', invoiced: false },
    { term: 'final', percentage: 20, description: 'After Handover', trigger: 'berita_acara', invoiced: false }
  ]
}

/**
 * Get preset terms for a given preset type
 * Returns a deep copy to prevent mutation of the original preset
 */
export function getPresetTerms(preset: PresetType): InvoiceTerm[] {
  if (preset === 'custom') {
    return []
  }
  return INVOICE_TERM_PRESETS[preset].map(term => ({ ...term }))
}

/**
 * Validate that invoice terms total exactly 100%
 * Returns true if valid, false otherwise
 */
export function validateTermsTotal(terms: InvoiceTerm[]): boolean {
  if (terms.length === 0) return false
  const total = terms.reduce((sum, term) => sum + term.percentage, 0)
  return Math.abs(total - 100) < 0.01 // Allow small floating point tolerance
}

/**
 * Calculate the sum of all term percentages
 */
export function calculateTermsPercentageTotal(terms: InvoiceTerm[]): number {
  return terms.reduce((sum, term) => sum + term.percentage, 0)
}


/**
 * Calculate the term amount based on revenue and percentage
 */
export function calculateTermAmount(revenue: number, percentage: number): number {
  return (revenue * percentage) / 100
}

/**
 * Calculate VAT amount (11% in Indonesia)
 */
export function calculateVAT(amount: number): number {
  return amount * VAT_RATE
}

/**
 * Calculate invoice totals for a term
 */
export function calculateTermInvoiceTotals(revenue: number, percentage: number): {
  subtotal: number
  vatAmount: number
  totalAmount: number
} {
  const subtotal = calculateTermAmount(revenue, percentage)
  const vatAmount = calculateVAT(subtotal)
  const totalAmount = subtotal + vatAmount
  return { subtotal, vatAmount, totalAmount }
}

/**
 * Determine the status of an invoice term
 * - 'invoiced': Invoice has been generated
 * - 'ready': Trigger condition met, can create invoice
 * - 'locked': Trigger condition not met
 * - 'pending': Default state (same as ready for jo_created trigger)
 */
export function getTermStatus(
  term: InvoiceTerm,
  joStatus: string,
  hasSuratJalan: boolean = false,
  hasBeritaAcara: boolean = false
): TermStatus {
  // If already invoiced, return invoiced status
  if (term.invoiced) {
    return 'invoiced'
  }

  // Check trigger conditions
  switch (term.trigger) {
    case 'jo_created':
      // Always ready once JO exists
      return 'ready'
    
    case 'delivery':
      // Ready when JO is completed or submitted to finance
      if (['completed', 'submitted_to_finance', 'invoiced', 'closed'].includes(joStatus)) {
        return 'ready'
      }
      return 'locked'
    
    case 'surat_jalan':
      // Ready when Surat Jalan document exists
      if (hasSuratJalan) {
        return 'ready'
      }
      return 'locked'
    
    case 'berita_acara':
      // Ready when Berita Acara document exists
      if (hasBeritaAcara) {
        return 'ready'
      }
      return 'locked'
    
    default:
      return 'pending'
  }
}


/**
 * Get the display label for a term status
 */
export function getTermStatusLabel(status: TermStatus): string {
  switch (status) {
    case 'invoiced':
      return 'Invoiced'
    case 'ready':
      return 'Ready'
    case 'locked':
      return 'Locked'
    case 'pending':
      return 'Pending'
    default:
      return 'Unknown'
  }
}

/**
 * Get the required trigger description for a locked term
 */
export function getLockedTriggerDescription(trigger: TriggerType): string {
  switch (trigger) {
    case 'surat_jalan':
      return 'Requires Surat Jalan document'
    case 'berita_acara':
      return 'Requires Berita Acara document'
    case 'delivery':
      return 'Requires JO completion'
    default:
      return ''
  }
}

/**
 * Check if any term has been invoiced
 */
export function hasAnyInvoicedTerm(terms: InvoiceTerm[]): boolean {
  return terms.some(term => term.invoiced)
}

/**
 * Calculate total invoiced amount from terms
 */
export function calculateTotalInvoicedFromTerms(
  terms: InvoiceTerm[],
  revenue: number
): number {
  return terms
    .filter(term => term.invoiced)
    .reduce((sum, term) => {
      const { totalAmount } = calculateTermInvoiceTotals(revenue, term.percentage)
      return sum + totalAmount
    }, 0)
}

/**
 * Calculate total invoiceable amount (revenue + VAT)
 */
export function calculateTotalInvoiceableAmount(revenue: number): number {
  return revenue + calculateVAT(revenue)
}

/**
 * Create a new custom term with default values
 */
export function createEmptyTerm(): InvoiceTerm {
  return {
    term: '',
    percentage: 0,
    description: '',
    trigger: 'jo_created',
    invoiced: false,
  }
}

/**
 * Detect preset type from terms array
 */
export function detectPresetFromTerms(terms: InvoiceTerm[]): PresetType {
  if (terms.length === 0) return 'custom'
  
  // Check single preset
  if (terms.length === 1 && 
      terms[0].term === 'full' && 
      terms[0].percentage === 100) {
    return 'single'
  }
  
  // Check dp_final preset
  if (terms.length === 2 &&
      terms[0].term === 'down_payment' && terms[0].percentage === 30 &&
      terms[1].term === 'final' && terms[1].percentage === 70) {
    return 'dp_final'
  }
  
  // Check dp_delivery_final preset
  if (terms.length === 3 &&
      terms[0].term === 'down_payment' && terms[0].percentage === 30 &&
      terms[1].term === 'delivery' && terms[1].percentage === 50 &&
      terms[2].term === 'final' && terms[2].percentage === 20) {
    return 'dp_delivery_final'
  }
  
  return 'custom'
}

/**
 * Revenue discrepancy result
 */
export interface RevenueDiscrepancy {
  hasDiscrepancy: boolean
  pjoRevenueTotal: number
  joFinalRevenue: number
  difference: number
  differencePercent: number
}

/**
 * Check if there's a discrepancy between PJO revenue items total and JO final revenue
 * This helps ensure no revenue is left behind when creating invoices
 * 
 * @param pjoRevenueItems - Array of PJO revenue items
 * @param joFinalRevenue - JO's final revenue amount
 * @param tolerance - Percentage tolerance for discrepancy (default 0.01 = 1%)
 * @returns Discrepancy details
 */
export function checkRevenueDiscrepancy(
  pjoRevenueTotal: number,
  joFinalRevenue: number,
  tolerance: number = 0.01
): RevenueDiscrepancy {
  const difference = pjoRevenueTotal - joFinalRevenue
  const differencePercent = joFinalRevenue > 0 
    ? (difference / joFinalRevenue) * 100 
    : pjoRevenueTotal > 0 ? 100 : 0
  
  // Has discrepancy if difference exceeds tolerance
  const hasDiscrepancy = Math.abs(differencePercent) > tolerance * 100
  
  return {
    hasDiscrepancy,
    pjoRevenueTotal,
    joFinalRevenue,
    difference,
    differencePercent,
  }
}

/**
 * Calculate uninvoiced revenue from terms
 * Returns the amount of revenue that hasn't been invoiced yet
 */
export function calculateUninvoicedRevenue(
  terms: InvoiceTerm[],
  revenue: number
): { uninvoicedAmount: number; uninvoicedPercent: number } {
  const invoicedPercent = terms
    .filter(term => term.invoiced)
    .reduce((sum, term) => sum + term.percentage, 0)
  
  const uninvoicedPercent = 100 - invoicedPercent
  const uninvoicedAmount = calculateTermAmount(revenue, uninvoicedPercent)
  
  return { uninvoicedAmount, uninvoicedPercent }
}