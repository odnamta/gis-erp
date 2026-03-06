'use server'

// =====================================================
// v0.80: INVOICE RED FLAG DETECTION - SERVER ACTIONS
// =====================================================

import { createClient } from '@/lib/supabase/server'
import {
  calculateDaysOverdue,
  classifyOverdueSeverity,
} from '@/lib/overdue-check-utils'
import { formatCurrency } from '@/lib/utils/format'
import type { OverdueSeverity } from '@/types/overdue-check'

// =====================================================
// TYPES
// =====================================================

export type RedFlagType = 'overdue' | 'negative_margin' | 'duplicate_suspect' | 'missing_invoice'

export interface InvoiceRedFlag {
  id: string
  type: RedFlagType
  severity: 'critical' | 'high' | 'medium' | 'low'
  invoiceId?: string
  invoiceNumber?: string
  joId?: string
  joNumber?: string
  customerId?: string
  customerName?: string
  message: string
  amount?: number
  metadata?: Record<string, unknown>
}

export interface RedFlagSummary {
  overdueCount: number
  negativeMarginCount: number
  duplicateSuspectCount: number
  missingInvoiceCount: number
  totalFlags: number
  flags: InvoiceRedFlag[]
}

// =====================================================
// OVERDUE FLAGS
// =====================================================

/**
 * Get overdue invoice flags with severity badges.
 * Reuses overdue-check-utils severity classification.
 */
export async function getOverdueFlags(): Promise<InvoiceRedFlag[]> {
  const supabase = await createClient()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      customer_id,
      total_amount,
      due_date,
      status,
      jo_id,
      customers!inner (name)
    `)
    .in('status', ['sent', 'partial'])
    .not('due_date', 'is', null)

  if (error || !invoices) return []

  const flags: InvoiceRedFlag[] = []
  const now = new Date()

  for (const inv of invoices) {
    const daysOverdue = calculateDaysOverdue(inv.due_date, now)
    if (daysOverdue <= 0) continue

    const severity = classifyOverdueSeverity(daysOverdue)
    const customerName = (inv.customers as { name: string })?.name || 'Unknown'

    flags.push({
      id: `overdue-${inv.id}`,
      type: 'overdue',
      severity,
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      customerId: inv.customer_id,
      customerName,
      message: `Invoice ${inv.invoice_number} overdue ${daysOverdue} hari (${customerName})`,
      amount: inv.total_amount,
      metadata: { daysOverdue, dueDate: inv.due_date },
    })
  }

  return flags
}

// =====================================================
// NEGATIVE MARGIN FLAGS
// =====================================================

/**
 * Flag invoices where total_amount < jo.final_cost (negative margin).
 */
export async function getNegativeMarginFlags(): Promise<InvoiceRedFlag[]> {
  const supabase = await createClient()

  // Get invoices with their linked JO final_cost
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      customer_id,
      total_amount,
      jo_id,
      status,
      customers (name),
      job_orders!inner (
        id,
        jo_number,
        final_cost,
        final_revenue
      )
    `)
    .not('jo_id', 'is', null)
    .neq('status', 'cancelled')

  if (error || !invoices) return []

  const flags: InvoiceRedFlag[] = []

  for (const inv of invoices) {
    const jo = inv.job_orders as { id: string; jo_number: string; final_cost: number | null; final_revenue: number | null } | null
    if (!jo || !jo.final_cost || jo.final_cost <= 0) continue

    const finalRevenue = jo.final_revenue || 0
    if (finalRevenue >= jo.final_cost) continue

    const marginPct = jo.final_cost > 0
      ? ((finalRevenue - jo.final_cost) / jo.final_cost) * 100
      : 0
    const customerName = (inv.customers as { name: string } | null)?.name || 'Unknown'

    // Determine severity based on margin deficit
    let severity: InvoiceRedFlag['severity'] = 'medium'
    if (marginPct < -20) severity = 'critical'
    else if (marginPct < -10) severity = 'high'
    else if (marginPct < 0) severity = 'medium'

    flags.push({
      id: `margin-${inv.id}`,
      type: 'negative_margin',
      severity,
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      joId: jo.id,
      joNumber: jo.jo_number,
      customerId: inv.customer_id,
      customerName,
      message: `Margin negatif pada ${inv.invoice_number}: revenue ${formatCurrency(finalRevenue)} < cost ${formatCurrency(jo.final_cost)} (${marginPct.toFixed(1)}%)`,
      amount: finalRevenue - jo.final_cost,
      metadata: { finalRevenue, finalCost: jo.final_cost, marginPct },
    })
  }

  return flags
}

// =====================================================
// DUPLICATE SUSPECT FLAGS
// =====================================================

/**
 * Flag invoices with same customer + same amount + similar date (within 7 days).
 */
export async function getDuplicateSuspectFlags(): Promise<InvoiceRedFlag[]> {
  const supabase = await createClient()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      customer_id,
      total_amount,
      invoice_date,
      status,
      customers (name)
    `)
    .neq('status', 'cancelled')
    .eq('is_active', true)
    .order('invoice_date', { ascending: false })

  if (error || !invoices) return []

  const flags: InvoiceRedFlag[] = []
  const flaggedPairs = new Set<string>()

  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const a = invoices[i]
      const b = invoices[j]

      // Same customer
      if (a.customer_id !== b.customer_id) continue

      // Same amount (exact match)
      if (Math.abs(a.total_amount - b.total_amount) > 1) continue

      // Need valid dates for comparison
      if (!a.invoice_date || !b.invoice_date) continue

      // Similar date (within 7 days)
      const dateA = new Date(a.invoice_date as string)
      const dateB = new Date(b.invoice_date as string)
      const daysDiff = Math.abs(
        (dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysDiff > 7) continue

      // Avoid flagging same pair twice
      const pairKey = [a.id, b.id].sort().join('-')
      if (flaggedPairs.has(pairKey)) continue
      flaggedPairs.add(pairKey)

      const customerName = (a.customers as { name: string } | null)?.name || 'Unknown'

      flags.push({
        id: `dup-${pairKey}`,
        type: 'duplicate_suspect',
        severity: 'high',
        invoiceId: a.id,
        invoiceNumber: a.invoice_number,
        customerId: a.customer_id,
        customerName,
        message: `Kemungkinan duplikat: ${a.invoice_number} & ${b.invoice_number} — customer sama, nominal sama (${formatCurrency(a.total_amount)}), selisih ${Math.round(daysDiff)} hari`,
        amount: a.total_amount,
        metadata: {
          otherInvoiceId: b.id,
          otherInvoiceNumber: b.invoice_number,
          daysDifference: Math.round(daysDiff),
        },
      })
    }
  }

  return flags
}

// =====================================================
// MISSING INVOICE FLAGS
// =====================================================

/**
 * Flag JOs with status 'completed' (or 'submitted_to_finance') but no invoice created (>7 days).
 */
export async function getMissingInvoiceFlags(): Promise<InvoiceRedFlag[]> {
  const supabase = await createClient()

  // Get completed JOs older than 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: jos, error: joError } = await supabase
    .from('job_orders')
    .select(`
      id,
      jo_number,
      customer_id,
      final_revenue,
      status,
      completed_at,
      customers (name)
    `)
    .in('status', ['completed', 'submitted_to_finance'])
    .lt('completed_at', sevenDaysAgo.toISOString())

  if (joError || !jos || jos.length === 0) return []

  // Get all invoices linked to these JOs
  const joIds = jos.map(jo => jo.id)
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('jo_id')
    .in('jo_id', joIds)
    .neq('status', 'cancelled')

  const invoicedJoIds = new Set(
    (existingInvoices || []).map(inv => inv.jo_id)
  )

  const flags: InvoiceRedFlag[] = []

  for (const jo of jos) {
    if (invoicedJoIds.has(jo.id)) continue

    const completedDate = jo.completed_at ? new Date(jo.completed_at) : null
    const daysSinceCompletion = completedDate
      ? Math.floor((Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0
    const customerName = (jo.customers as { name: string } | null)?.name || 'Unknown'

    let severity: InvoiceRedFlag['severity'] = 'medium'
    if (daysSinceCompletion > 30) severity = 'critical'
    else if (daysSinceCompletion > 14) severity = 'high'

    flags.push({
      id: `missing-${jo.id}`,
      type: 'missing_invoice',
      severity,
      joId: jo.id,
      joNumber: jo.jo_number,
      customerId: jo.customer_id,
      customerName,
      message: `JO ${jo.jo_number} (${customerName}) selesai ${daysSinceCompletion} hari lalu, belum dibuatkan invoice`,
      amount: jo.final_revenue || 0,
      metadata: { daysSinceCompletion, completedAt: jo.completed_at },
    })
  }

  return flags
}

// =====================================================
// COMBINED RED FLAG SUMMARY
// =====================================================

/**
 * Get all red flags combined into a summary.
 */
export async function getRedFlagSummary(): Promise<RedFlagSummary> {
  const [overdueFlags, marginFlags, duplicateFlags, missingFlags] = await Promise.all([
    getOverdueFlags(),
    getNegativeMarginFlags(),
    getDuplicateSuspectFlags(),
    getMissingInvoiceFlags(),
  ])

  const allFlags = [...overdueFlags, ...marginFlags, ...duplicateFlags, ...missingFlags]

  // Sort by severity: critical > high > medium > low
  const severityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
  allFlags.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))

  return {
    overdueCount: overdueFlags.length,
    negativeMarginCount: marginFlags.length,
    duplicateSuspectCount: duplicateFlags.length,
    missingInvoiceCount: missingFlags.length,
    totalFlags: allFlags.length,
    flags: allFlags,
  }
}

/**
 * Get red flag counts only (lightweight, for dashboard cards).
 */
export async function getRedFlagCounts(): Promise<{
  overdueCount: number
  negativeMarginCount: number
  duplicateSuspectCount: number
  missingInvoiceCount: number
  totalFlags: number
}> {
  const summary = await getRedFlagSummary()
  return {
    overdueCount: summary.overdueCount,
    negativeMarginCount: summary.negativeMarginCount,
    duplicateSuspectCount: summary.duplicateSuspectCount,
    missingInvoiceCount: summary.missingInvoiceCount,
    totalFlags: summary.totalFlags,
  }
}

