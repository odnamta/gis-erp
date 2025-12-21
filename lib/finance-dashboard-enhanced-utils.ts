/**
 * Finance Dashboard Enhanced Utility Functions
 * Provides calculations for AR/AP aging, cash flow, revenue trends, and KPIs
 * for the enhanced finance dashboard (v0.9.8)
 */

// =====================================================
// Types
// =====================================================

export type AgingBucketLabel = 'current' | '1-30 days' | '31-60 days' | '61-90 days' | 'over 90 days'

export interface AgingBucket {
  bucket: AgingBucketLabel
  invoiceCount: number
  totalAmount: number
}

export interface FinanceDashboardSummary {
  // AR Summary
  totalAR: number
  arOverdue: number
  arInvoiceCount: number
  
  // AP Summary
  totalAP: number
  apOverdue: number
  apPendingVerification: number
  
  // Cash Position (MTD)
  cashReceivedMTD: number
  cashPaidMTD: number
  
  // Revenue & Profit (MTD)
  revenueMTD: number
  revenuePreviousMonth: number
  profitMTD: number
  
  // BKK Pending
  bkkPendingCount: number
  bkkPendingAmount: number
  
  // Metadata
  calculatedAt: string
}

export interface MonthlyRevenueData {
  month: string
  revenue: number
  collected: number
}

export interface PendingBKKItem {
  id: string
  bkkNumber: string
  joNumber: string
  amount: number
  category: string
  requestedBy: string
  createdAt: string
}

export interface CashFlowProjection {
  expectedInflows: number
  expectedOutflows: number
  netProjection: number
}

// =====================================================
// Constants
// =====================================================

export const STALENESS_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

export const AGING_BUCKET_ORDER: AgingBucketLabel[] = [
  'current',
  '1-30 days',
  '31-60 days',
  '61-90 days',
  'over 90 days',
]

// =====================================================
// Cash Flow Calculations
// =====================================================

/**
 * Calculate net cash (received - paid)
 * Property 1: Net Cash Calculation
 */
export function calculateNetCash(received: number, paid: number): number {
  return received - paid
}

/**
 * Calculate revenue MTD from invoices
 * Property 2: Revenue MTD Calculation
 */
export function calculateRevenueMTD(
  invoices: Array<{ invoice_date: string; total_amount: number; status: string }>,
  currentDate: Date
): number {
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  return invoices
    .filter((inv) => {
      if (inv.status === 'cancelled') return false
      const invoiceDate = new Date(inv.invoice_date)
      return (
        invoiceDate.getMonth() === currentMonth &&
        invoiceDate.getFullYear() === currentYear
      )
    })
    .reduce((sum, inv) => sum + Number(inv.total_amount), 0)
}

/**
 * Calculate profit margin percentage
 * Property 3: Profit Margin Calculation
 */
export function calculateProfitMargin(profit: number, revenue: number): number {
  if (revenue === 0) return 0
  return (profit / revenue) * 100
}

/**
 * Calculate percentage change between two values
 * Property 3: Profit Margin Calculation (percentage comparison)
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// =====================================================
// Staleness Detection
// =====================================================

/**
 * Check if data is stale (older than threshold)
 * Property 9: Staleness Detection
 */
export function isStale(calculatedAt: string | Date, currentDate: Date = new Date()): boolean {
  const calculated = new Date(calculatedAt)
  const diffMs = currentDate.getTime() - calculated.getTime()
  return diffMs > STALENESS_THRESHOLD_MS
}

/**
 * Get time since last update in human-readable format
 */
export function getTimeSinceUpdate(calculatedAt: string | Date): string {
  const calculated = new Date(calculatedAt)
  const now = new Date()
  const diffMs = now.getTime() - calculated.getTime()
  
  const minutes = Math.floor(diffMs / (1000 * 60))
  if (minutes < 1) return 'Just now'
  if (minutes === 1) return '1 minute ago'
  if (minutes < 60) return `${minutes} minutes ago`
  
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 hour ago'
  return `${hours} hours ago`
}


// =====================================================
// AR Aggregation and Aging
// =====================================================

/**
 * Calculate total AR outstanding
 * Property 4: AR Aggregation and Aging Classification
 */
export function calculateTotalAR(
  invoices: Array<{ total_amount: number; amount_paid?: number | null; status: string }>
): number {
  return invoices
    .filter((inv) => inv.status !== 'cancelled' && inv.status !== 'paid')
    .reduce((sum, inv) => {
      const amountDue = inv.total_amount - (inv.amount_paid || 0)
      return sum + Math.max(0, amountDue)
    }, 0)
}

/**
 * Calculate overdue AR amount
 * Property 4: AR Aggregation and Aging Classification
 */
export function calculateOverdueAR(
  invoices: Array<{
    total_amount: number
    amount_paid?: number | null
    status: string
    due_date: string
  }>,
  currentDate: Date
): number {
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)
  
  return invoices
    .filter((inv) => {
      if (inv.status === 'cancelled' || inv.status === 'paid') return false
      const dueDate = new Date(inv.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < current
    })
    .reduce((sum, inv) => {
      const amountDue = inv.total_amount - (inv.amount_paid || 0)
      return sum + Math.max(0, amountDue)
    }, 0)
}

/**
 * Count outstanding AR invoices
 * Property 4: AR Aggregation and Aging Classification
 */
export function countOutstandingARInvoices(
  invoices: Array<{ total_amount: number; amount_paid?: number | null; status: string }>
): number {
  return invoices.filter((inv) => {
    if (inv.status === 'cancelled' || inv.status === 'paid') return false
    const amountDue = inv.total_amount - (inv.amount_paid || 0)
    return amountDue > 0
  }).length
}

/**
 * Classify an invoice into an aging bucket based on days overdue
 * Property 4: AR Aggregation and Aging Classification
 */
export function classifyAgingBucket(dueDate: string, currentDate: Date): AgingBucketLabel {
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)
  
  // If not yet due, it's current
  if (due >= current) return 'current'
  
  // Calculate days overdue
  const diffTime = current.getTime() - due.getTime()
  const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (daysOverdue <= 30) return '1-30 days'
  if (daysOverdue <= 60) return '31-60 days'
  if (daysOverdue <= 90) return '61-90 days'
  return 'over 90 days'
}

/**
 * Group invoices by aging bucket
 * Property 4: AR Aggregation and Aging Classification
 */
export function groupByAgingBucket(
  invoices: Array<{
    total_amount: number
    amount_paid?: number | null
    status: string
    due_date: string
  }>,
  currentDate: Date
): AgingBucket[] {
  // Initialize all buckets
  const buckets: Record<AgingBucketLabel, { count: number; amount: number }> = {
    'current': { count: 0, amount: 0 },
    '1-30 days': { count: 0, amount: 0 },
    '31-60 days': { count: 0, amount: 0 },
    '61-90 days': { count: 0, amount: 0 },
    'over 90 days': { count: 0, amount: 0 },
  }
  
  // Filter to outstanding invoices and group
  invoices
    .filter((inv) => {
      if (inv.status === 'cancelled' || inv.status === 'paid') return false
      const amountDue = inv.total_amount - (inv.amount_paid || 0)
      return amountDue > 0
    })
    .forEach((inv) => {
      const bucket = classifyAgingBucket(inv.due_date, currentDate)
      const amountDue = inv.total_amount - (inv.amount_paid || 0)
      buckets[bucket].count += 1
      buckets[bucket].amount += Math.max(0, amountDue)
    })
  
  // Return in order
  return AGING_BUCKET_ORDER.map((bucket) => ({
    bucket,
    invoiceCount: buckets[bucket].count,
    totalAmount: buckets[bucket].amount,
  }))
}

/**
 * Check if there are critical overdue invoices (90+ days)
 * Property 4: AR Aggregation and Aging Classification
 */
export function hasCriticalOverdue(agingBuckets: AgingBucket[]): boolean {
  const over90 = agingBuckets.find((b) => b.bucket === 'over 90 days')
  return over90 ? over90.totalAmount > 0 : false
}

// =====================================================
// AP Aggregation and Aging
// =====================================================

/**
 * Calculate total AP outstanding
 * Property 5: AP Aggregation and Aging Classification
 */
export function calculateTotalAP(
  vendorInvoices: Array<{ amount_due: number; status: string }>
): number {
  return vendorInvoices
    .filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + Math.max(0, Number(inv.amount_due)), 0)
}

/**
 * Calculate overdue AP amount
 * Property 5: AP Aggregation and Aging Classification
 */
export function calculateOverdueAP(
  vendorInvoices: Array<{ amount_due: number; status: string; due_date: string | null }>,
  currentDate: Date
): number {
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)
  
  return vendorInvoices
    .filter((inv) => {
      if (inv.status === 'paid' || inv.status === 'cancelled') return false
      if (!inv.due_date) return false
      const dueDate = new Date(inv.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < current
    })
    .reduce((sum, inv) => sum + Math.max(0, Number(inv.amount_due)), 0)
}

/**
 * Count vendor invoices pending verification
 * Property 5: AP Aggregation and Aging Classification
 */
export function countPendingVerification(
  vendorInvoices: Array<{ status: string }>
): number {
  return vendorInvoices.filter((inv) => inv.status === 'received').length
}

/**
 * Group vendor invoices by aging bucket
 * Property 5: AP Aggregation and Aging Classification
 */
export function groupAPByAgingBucket(
  vendorInvoices: Array<{
    amount_due: number
    status: string
    due_date: string | null
  }>,
  currentDate: Date
): AgingBucket[] {
  // Initialize all buckets
  const buckets: Record<AgingBucketLabel, { count: number; amount: number }> = {
    'current': { count: 0, amount: 0 },
    '1-30 days': { count: 0, amount: 0 },
    '31-60 days': { count: 0, amount: 0 },
    '61-90 days': { count: 0, amount: 0 },
    'over 90 days': { count: 0, amount: 0 },
  }
  
  // Filter to outstanding invoices and group
  vendorInvoices
    .filter((inv) => {
      if (inv.status === 'paid' || inv.status === 'cancelled') return false
      return Number(inv.amount_due) > 0
    })
    .forEach((inv) => {
      // If no due date, classify as current
      const bucket = inv.due_date 
        ? classifyAgingBucket(inv.due_date, currentDate) 
        : 'current'
      buckets[bucket].count += 1
      buckets[bucket].amount += Math.max(0, Number(inv.amount_due))
    })
  
  // Return in order
  return AGING_BUCKET_ORDER.map((bucket) => ({
    bucket,
    invoiceCount: buckets[bucket].count,
    totalAmount: buckets[bucket].amount,
  }))
}


// =====================================================
// BKK Aggregation
// =====================================================

/**
 * Count pending BKK requests
 * Property 6: BKK Aggregation
 */
export function countPendingBKK(
  bkks: Array<{ status: string }>
): number {
  return bkks.filter((bkk) => bkk.status === 'pending').length
}

/**
 * Calculate total pending BKK amount
 * Property 6: BKK Aggregation
 */
export function calculatePendingBKKAmount(
  bkks: Array<{ status: string; amount_requested: number }>
): number {
  return bkks
    .filter((bkk) => bkk.status === 'pending')
    .reduce((sum, bkk) => sum + Number(bkk.amount_requested), 0)
}

/**
 * Get pending BKK list with limit and sorting
 * Property 7: BKK List Limiting and Sorting
 */
export function getPendingBKKList(
  bkks: Array<{
    id: string
    bkk_number: string
    status: string
    amount_requested: number
    purpose?: string | null
    created_at: string
    job_order?: { jo_number: string } | null
    requested_by_user?: { full_name: string } | null
  }>,
  limit: number = 5
): PendingBKKItem[] {
  return bkks
    .filter((bkk) => bkk.status === 'pending')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)
    .map((bkk) => ({
      id: bkk.id,
      bkkNumber: bkk.bkk_number,
      joNumber: bkk.job_order?.jo_number || '-',
      amount: Number(bkk.amount_requested),
      category: bkk.purpose || 'General',
      requestedBy: bkk.requested_by_user?.full_name || 'Unknown',
      createdAt: bkk.created_at,
    }))
}

// =====================================================
// Revenue Trend
// =====================================================

/**
 * Group revenue by month
 * Property 8: Revenue Trend Aggregation
 */
export function groupRevenueByMonth(
  invoices: Array<{
    invoice_date: string
    total_amount: number
    amount_paid?: number | null
    status: string
  }>
): MonthlyRevenueData[] {
  const monthlyData: Record<string, { revenue: number; collected: number }> = {}
  
  invoices
    .filter((inv) => inv.status !== 'cancelled')
    .forEach((inv) => {
      const date = new Date(inv.invoice_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, collected: 0 }
      }
      
      monthlyData[monthKey].revenue += Number(inv.total_amount)
      monthlyData[monthKey].collected += Number(inv.amount_paid || 0)
    })
  
  // Sort by month and return
  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      revenue: data.revenue,
      collected: data.collected,
    }))
}

/**
 * Filter invoices to last N months
 * Property 8: Revenue Trend Aggregation
 */
export function filterLastNMonths(
  invoices: Array<{ invoice_date: string }>,
  months: number,
  currentDate: Date
): Array<{ invoice_date: string }> {
  const cutoffDate = new Date(currentDate)
  cutoffDate.setMonth(cutoffDate.getMonth() - months)
  cutoffDate.setDate(1)
  cutoffDate.setHours(0, 0, 0, 0)
  
  return invoices.filter((inv) => {
    const invoiceDate = new Date(inv.invoice_date)
    return invoiceDate >= cutoffDate
  })
}

/**
 * Get revenue trend for last 6 months
 * Property 8: Revenue Trend Aggregation
 */
export function getRevenueTrend(
  invoices: Array<{
    invoice_date: string
    total_amount: number
    amount_paid?: number | null
    status: string
  }>,
  currentDate: Date
): MonthlyRevenueData[] {
  const filteredInvoices = filterLastNMonths(invoices, 6, currentDate)
  return groupRevenueByMonth(filteredInvoices as Array<{
    invoice_date: string
    total_amount: number
    amount_paid?: number | null
    status: string
  }>)
}

// =====================================================
// Cash Flow Projection
// =====================================================

/**
 * Calculate cash flow projection for next N days
 */
export function calculateCashFlowProjection(
  arInvoices: Array<{
    total_amount: number
    amount_paid?: number | null
    status: string
    due_date: string
  }>,
  apInvoices: Array<{
    amount_due: number
    status: string
    due_date: string | null
  }>,
  days: number,
  currentDate: Date
): CashFlowProjection {
  const today = new Date(currentDate)
  today.setHours(0, 0, 0, 0)
  
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + days)
  
  // Expected inflows (AR invoices due in next N days)
  const expectedInflows = arInvoices
    .filter((inv) => {
      if (inv.status === 'cancelled' || inv.status === 'paid') return false
      const dueDate = new Date(inv.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate >= today && dueDate <= futureDate
    })
    .reduce((sum, inv) => {
      const amountDue = inv.total_amount - (inv.amount_paid || 0)
      return sum + Math.max(0, amountDue)
    }, 0)
  
  // Expected outflows (AP invoices due in next N days)
  const expectedOutflows = apInvoices
    .filter((inv) => {
      if (inv.status === 'paid' || inv.status === 'cancelled') return false
      if (!inv.due_date) return false
      const dueDate = new Date(inv.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate >= today && dueDate <= futureDate
    })
    .reduce((sum, inv) => sum + Math.max(0, Number(inv.amount_due)), 0)
  
  return {
    expectedInflows,
    expectedOutflows,
    netProjection: expectedInflows - expectedOutflows,
  }
}

// =====================================================
// Formatting Utilities
// =====================================================

/**
 * Format currency for display (Indonesian Rupiah)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format currency in compact form (e.g., 450M, 1.2B)
 */
export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(0)}M`
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}K`
  }
  return `Rp ${amount}`
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/**
 * Format month for chart display
 */
export function formatMonthLabel(monthStr: string): string {
  const date = new Date(monthStr)
  return date.toLocaleDateString('en-US', { month: 'short' })
}
