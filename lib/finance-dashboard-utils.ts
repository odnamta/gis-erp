/**
 * Finance Dashboard Utility Functions
 * Provides calculations for AR aging, overdue invoices, payments, and KPIs
 */

import type { Invoice, JobOrder, ProformaJobOrder } from '@/types'

// Types
export type AgingBucketType = 'current' | 'days31to60' | 'days61to90' | 'over90'
export type OverdueSeverity = 'warning' | 'orange' | 'critical'
export type RevenueTrend = 'up' | 'down' | 'stable'

export interface AgingBucket {
  count: number
  amount: number
  invoiceIds: string[]
}

export interface ARAgingData {
  current: AgingBucket
  days31to60: AgingBucket
  days61to90: AgingBucket
  over90: AgingBucket
}

export interface PJOPipelineData {
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected'
  count: number
  totalValue: number
}

export interface OverdueInvoice {
  id: string
  invoice_number: string
  customer_name: string
  total_amount: number
  due_date: string
  days_overdue: number
  severity: OverdueSeverity
}

export interface RecentPayment {
  id: string
  invoice_number: string
  customer_name: string
  total_amount: number
  paid_at: string
  payment_reference: string | null
}

export interface MonthlyRevenueData {
  current: number
  previous: number
  currentCount: number
  trend: RevenueTrend
}

export interface FinanceKPIs {
  outstandingAR: number
  outstandingARCount: number
  overdueAmount: number
  overdueCount: number
  criticalOverdueCount: number
  monthlyRevenue: number
  monthlyJOCount: number
  previousMonthRevenue: number
  revenueTrend: RevenueTrend
}

// Core calculation functions

/**
 * Calculate the number of days an invoice is overdue
 * Returns 0 if not overdue (due date is in the future)
 */
export function calculateDaysOverdue(dueDate: string, currentDate: Date): number {
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)
  
  const diffTime = current.getTime() - due.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

/**
 * Determine which aging bucket an invoice belongs to based on days overdue
 * - current: 0-30 days
 * - days31to60: 31-60 days
 * - days61to90: 61-90 days
 * - over90: 90+ days
 */
export function calculateAgingBucket(dueDate: string, currentDate: Date): AgingBucketType {
  const daysOverdue = calculateDaysOverdue(dueDate, currentDate)
  
  if (daysOverdue <= 30) return 'current'
  if (daysOverdue <= 60) return 'days31to60'
  if (daysOverdue <= 90) return 'days61to90'
  return 'over90'
}

/**
 * Get the severity level for an overdue invoice
 * - warning (yellow): 1-30 days overdue
 * - orange: 31-60 days overdue
 * - critical (red): 60+ days overdue
 */
export function getOverdueSeverity(daysOverdue: number): OverdueSeverity {
  if (daysOverdue <= 30) return 'warning'
  if (daysOverdue <= 60) return 'orange'
  return 'critical'
}


// Data aggregation functions

/**
 * Group invoices by aging bucket
 * Only includes invoices with status 'sent' or 'overdue' (outstanding AR)
 */
export function groupInvoicesByAging(
  invoices: Array<{ id: string; due_date: string; total_amount: number; status: string }>,
  currentDate: Date
): ARAgingData {
  const result: ARAgingData = {
    current: { count: 0, amount: 0, invoiceIds: [] },
    days31to60: { count: 0, amount: 0, invoiceIds: [] },
    days61to90: { count: 0, amount: 0, invoiceIds: [] },
    over90: { count: 0, amount: 0, invoiceIds: [] },
  }

  // Filter to only outstanding invoices
  const outstandingInvoices = invoices.filter(
    (inv) => inv.status === 'sent' || inv.status === 'overdue'
  )

  for (const invoice of outstandingInvoices) {
    const bucket = calculateAgingBucket(invoice.due_date, currentDate)
    result[bucket].count += 1
    result[bucket].amount += invoice.total_amount
    result[bucket].invoiceIds.push(invoice.id)
  }

  return result
}

/**
 * Group PJOs by status with count and total value
 */
export function groupPJOsByStatus(
  pjos: Array<{ status: string; total_revenue_calculated?: number | null; is_active?: boolean }>
): PJOPipelineData[] {
  const statusOrder: Array<'draft' | 'pending_approval' | 'approved' | 'rejected'> = [
    'draft',
    'pending_approval',
    'approved',
    'rejected',
  ]

  const groups: Record<string, { count: number; totalValue: number }> = {}

  // Initialize all status groups
  for (const status of statusOrder) {
    groups[status] = { count: 0, totalValue: 0 }
  }

  // Filter to active PJOs and group by status
  const activePjos = pjos.filter((pjo) => pjo.is_active !== false)

  for (const pjo of activePjos) {
    const status = pjo.status as 'draft' | 'pending_approval' | 'approved' | 'rejected'
    if (groups[status]) {
      groups[status].count += 1
      groups[status].totalValue += pjo.total_revenue_calculated ?? 0
    }
  }

  return statusOrder.map((status) => ({
    status,
    count: groups[status].count,
    totalValue: groups[status].totalValue,
  }))
}


// Filter and sort functions

/**
 * Filter and transform overdue invoices
 * Returns invoices where due_date < currentDate, sorted by days_overdue descending
 */
export function filterOverdueInvoices(
  invoices: Array<{
    id: string
    invoice_number: string
    due_date: string
    total_amount: number
    status: string
    customer_name?: string
  }>,
  currentDate: Date
): OverdueInvoice[] {
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)

  return invoices
    .filter((inv) => {
      // Only include sent or overdue invoices
      if (inv.status !== 'sent' && inv.status !== 'overdue') return false
      
      const dueDate = new Date(inv.due_date)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < current
    })
    .map((inv) => {
      const daysOverdue = calculateDaysOverdue(inv.due_date, currentDate)
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name ?? '',
        total_amount: inv.total_amount,
        due_date: inv.due_date,
        days_overdue: daysOverdue,
        severity: getOverdueSeverity(daysOverdue),
      }
    })
    .sort((a, b) => b.days_overdue - a.days_overdue) // Oldest first (highest days overdue)
}

/**
 * Filter recent payments (paid invoices from last 30 days)
 * Returns payments sorted by paid_at descending (most recent first)
 */
export function filterRecentPayments(
  invoices: Array<{
    id: string
    invoice_number: string
    total_amount: number
    status: string
    paid_at: string | null
    notes?: string | null
    customer_name?: string
  }>,
  currentDate: Date
): RecentPayment[] {
  const thirtyDaysAgo = new Date(currentDate)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  return invoices
    .filter((inv) => {
      if (inv.status !== 'paid' || !inv.paid_at) return false
      
      const paidDate = new Date(inv.paid_at)
      return paidDate >= thirtyDaysAgo
    })
    .map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      customer_name: inv.customer_name ?? '',
      total_amount: inv.total_amount,
      paid_at: inv.paid_at!,
      payment_reference: inv.notes ?? null,
    }))
    .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
}


// KPI calculation functions

/**
 * Calculate monthly revenue from completed job orders
 * Compares current month to previous month and determines trend
 */
export function calculateMonthlyRevenue(
  jobOrders: Array<{
    final_revenue?: number | null
    completed_at?: string | null
    status: string
  }>,
  currentDate: Date
): MonthlyRevenueData {
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  // Previous month calculation
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

  // Filter completed JOs (status indicates completion)
  const completedStatuses = ['completed', 'submitted_to_finance', 'invoiced', 'closed']
  const completedJOs = jobOrders.filter(
    (jo) => completedStatuses.includes(jo.status) && jo.completed_at
  )

  // Calculate current month revenue
  const currentMonthJOs = completedJOs.filter((jo) => {
    const completedDate = new Date(jo.completed_at!)
    return (
      completedDate.getMonth() === currentMonth &&
      completedDate.getFullYear() === currentYear
    )
  })
  const currentRevenue = currentMonthJOs.reduce(
    (sum, jo) => sum + (jo.final_revenue ?? 0),
    0
  )

  // Calculate previous month revenue
  const prevMonthJOs = completedJOs.filter((jo) => {
    const completedDate = new Date(jo.completed_at!)
    return (
      completedDate.getMonth() === prevMonth &&
      completedDate.getFullYear() === prevYear
    )
  })
  const previousRevenue = prevMonthJOs.reduce(
    (sum, jo) => sum + (jo.final_revenue ?? 0),
    0
  )

  // Determine trend
  let trend: RevenueTrend = 'stable'
  if (currentRevenue > previousRevenue) {
    trend = 'up'
  } else if (currentRevenue < previousRevenue) {
    trend = 'down'
  }

  return {
    current: currentRevenue,
    previous: previousRevenue,
    currentCount: currentMonthJOs.length,
    trend,
  }
}

/**
 * Calculate all finance KPIs
 */
export function calculateFinanceKPIs(
  invoices: Array<{
    id: string
    due_date: string
    total_amount: number
    status: string
  }>,
  jobOrders: Array<{
    final_revenue?: number | null
    completed_at?: string | null
    status: string
  }>,
  currentDate: Date
): FinanceKPIs {
  // Outstanding AR (sent or overdue invoices)
  const outstandingInvoices = invoices.filter(
    (inv) => inv.status === 'sent' || inv.status === 'overdue'
  )
  const outstandingAR = outstandingInvoices.reduce(
    (sum, inv) => sum + inv.total_amount,
    0
  )

  // Overdue invoices
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)
  
  const overdueInvoices = outstandingInvoices.filter((inv) => {
    const dueDate = new Date(inv.due_date)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < current
  })
  const overdueAmount = overdueInvoices.reduce(
    (sum, inv) => sum + inv.total_amount,
    0
  )

  // Critical overdue (60+ days)
  const criticalOverdue = overdueInvoices.filter((inv) => {
    const daysOverdue = calculateDaysOverdue(inv.due_date, currentDate)
    return daysOverdue > 60
  })

  // Monthly revenue
  const monthlyData = calculateMonthlyRevenue(jobOrders, currentDate)

  return {
    outstandingAR,
    outstandingARCount: outstandingInvoices.length,
    overdueAmount,
    overdueCount: overdueInvoices.length,
    criticalOverdueCount: criticalOverdue.length,
    monthlyRevenue: monthlyData.current,
    monthlyJOCount: monthlyData.currentCount,
    previousMonthRevenue: monthlyData.previous,
    revenueTrend: monthlyData.trend,
  }
}


// Payment Statistics Types
export interface PartialPaymentsStats {
  count: number
  totalRemaining: number
}

export interface PaymentDashboardStats {
  partialPayments: PartialPaymentsStats
  monthlyPaymentsTotal: number
}

/**
 * Calculate partial payments statistics
 * Returns count and total remaining balance of partially paid invoices
 */
export function calculatePartialPaymentsStats(
  invoices: Array<{
    status: string
    total_amount: number
    amount_paid?: number | null
  }>
): PartialPaymentsStats {
  const partialInvoices = invoices.filter((inv) => inv.status === 'partial')
  
  const totalRemaining = partialInvoices.reduce((sum, inv) => {
    const remaining = inv.total_amount - (inv.amount_paid || 0)
    return sum + Math.max(0, remaining)
  }, 0)

  return {
    count: partialInvoices.length,
    totalRemaining,
  }
}

/**
 * Calculate total payments for the current month
 * @param payments - Array of payment records with amount and payment_date
 * @param currentDate - Reference date for current month calculation
 */
export function calculateMonthlyPaymentsTotal(
  payments: Array<{
    amount: number
    payment_date: string
  }>,
  currentDate: Date
): number {
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  return payments
    .filter((payment) => {
      const paymentDate = new Date(payment.payment_date)
      return (
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear
      )
    })
    .reduce((sum, payment) => sum + Number(payment.amount), 0)
}

/**
 * Calculate all payment-related dashboard statistics
 */
export function calculatePaymentDashboardStats(
  invoices: Array<{
    status: string
    total_amount: number
    amount_paid?: number | null
  }>,
  payments: Array<{
    amount: number
    payment_date: string
  }>,
  currentDate: Date
): PaymentDashboardStats {
  return {
    partialPayments: calculatePartialPaymentsStats(invoices),
    monthlyPaymentsTotal: calculateMonthlyPaymentsTotal(payments, currentDate),
  }
}
