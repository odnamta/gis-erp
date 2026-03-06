'use server'

// =====================================================
// v0.80: INVOICE ALERT RULES - PREDEFINED + AUTO-CHECK
// =====================================================
// Phase 2C-5: Activate alert rules for invoices.
// Creates predefined alert rules, runs automated checks,
// escalates via follow-up tasks and alert instances.

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  calculateDaysOverdue,
  classifyOverdueSeverity,
} from '@/lib/overdue-check-utils'
import { formatCurrency } from '@/lib/utils/format'
import type { Json } from '@/types/database'
import type { AlertSeverity } from '@/types/alerts'

// =====================================================
// PREDEFINED INVOICE ALERT RULE DEFINITIONS
// =====================================================

export interface InvoiceAlertRuleDefinition {
  ruleCode: string
  ruleName: string
  description: string
  ruleType: 'threshold' | 'schedule'
  severity: AlertSeverity
  checkFrequency: 'daily' | 'hourly'
  cooldownMinutes: number
  notifyRoles: string[]
  isActive: boolean
}

/**
 * Predefined alert rules for invoice monitoring.
 * These definitions are used to seed/ensure alert_rules exist in the database.
 */
export const INVOICE_ALERT_RULE_DEFINITIONS: InvoiceAlertRuleDefinition[] = [
  {
    ruleCode: 'INV_OVERDUE_CRITICAL',
    ruleName: 'Invoice Overdue Kritis (>60 hari)',
    description: 'Invoice yang overdue lebih dari 60 hari memerlukan eskalasi segera.',
    ruleType: 'threshold',
    severity: 'critical',
    checkFrequency: 'daily',
    cooldownMinutes: 1440, // 24 hours
    notifyRoles: ['finance_manager', 'owner', 'director'],
    isActive: true,
  },
  {
    ruleCode: 'INV_OVERDUE_WARNING',
    ruleName: 'Invoice Overdue Warning (31-60 hari)',
    description: 'Invoice yang overdue 31-60 hari perlu follow-up segera.',
    ruleType: 'threshold',
    severity: 'warning',
    checkFrequency: 'daily',
    cooldownMinutes: 1440,
    notifyRoles: ['finance_manager', 'finance'],
    isActive: true,
  },
  {
    ruleCode: 'INV_NEGATIVE_MARGIN',
    ruleName: 'Invoice Margin Negatif',
    description: 'JO dengan revenue lebih rendah dari cost (margin negatif).',
    ruleType: 'threshold',
    severity: 'warning',
    checkFrequency: 'daily',
    cooldownMinutes: 4320, // 72 hours
    notifyRoles: ['finance_manager', 'owner'],
    isActive: true,
  },
  {
    ruleCode: 'INV_MISSING_BILLING',
    ruleName: 'JO Belum Diinvoice (>14 hari)',
    description: 'JO yang sudah completed lebih dari 14 hari tapi belum dibuatkan invoice.',
    ruleType: 'schedule',
    severity: 'warning',
    checkFrequency: 'daily',
    cooldownMinutes: 4320,
    notifyRoles: ['finance_manager', 'administration'],
    isActive: true,
  },
  {
    ruleCode: 'INV_AR_CONCENTRATION',
    ruleName: 'Konsentrasi AR Tinggi',
    description: 'Satu customer memiliki outstanding >50% dari total AR.',
    ruleType: 'threshold',
    severity: 'warning',
    checkFrequency: 'daily',
    cooldownMinutes: 10080, // 7 days
    notifyRoles: ['finance_manager', 'owner'],
    isActive: true,
  },
]

// =====================================================
// SEED / ENSURE ALERT RULES EXIST
// =====================================================

/**
 * Ensures all predefined invoice alert rules exist in the database.
 * Uses upsert by rule_code to avoid duplicates.
 */
export async function ensureInvoiceAlertRules(): Promise<{
  success: boolean
  created: number
  existing: number
  error?: string
}> {
  try {
    const supabase = await createClient()

    let created = 0
    let existing = 0

    for (const def of INVOICE_ALERT_RULE_DEFINITIONS) {
      // Check if rule already exists
      const { data: existingRule } = await supabase
        .from('alert_rules')
        .select('id')
        .eq('rule_code', def.ruleCode)
        .maybeSingle()

      if (existingRule) {
        existing++
        continue
      }

      // Create new rule
      const { error } = await supabase
        .from('alert_rules')
        .insert({
          rule_code: def.ruleCode,
          rule_name: def.ruleName,
          description: def.description,
          rule_type: def.ruleType,
          severity: def.severity,
          check_frequency: def.checkFrequency,
          cooldown_minutes: def.cooldownMinutes,
          notify_roles: def.notifyRoles,
          notify_users: [],
          notification_channels: ['in_app'],
          is_active: def.isActive,
        })

      if (error) {
        return { success: false, created, existing, error: error.message }
      }

      created++
    }

    revalidatePath('/dashboard/alerts')
    return { success: true, created, existing }
  } catch (error) {
    return {
      success: false,
      created: 0,
      existing: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =====================================================
// INVOICE ALERT CHECK RUNNER
// =====================================================

export interface InvoiceAlertCheckResult {
  ruleCode: string
  triggered: boolean
  alertMessage?: string
  currentValue?: number
  thresholdValue?: number
  contextData?: Record<string, unknown>
  alertInstanceId?: string
}

/**
 * Runs all invoice alert checks and creates alert instances for triggered rules.
 * This is the main entry point called by scheduled tasks or manual triggers.
 */
export async function runInvoiceAlertChecks(): Promise<{
  success: boolean
  results: InvoiceAlertCheckResult[]
  totalTriggered: number
  followUpTasksCreated: number
  error?: string
}> {
  try {
    const supabase = await createClient()
    const results: InvoiceAlertCheckResult[] = []
    let totalTriggered = 0
    let followUpTasksCreated = 0

    // Get all active invoice alert rules
    const { data: activeRules } = await supabase
      .from('alert_rules')
      .select('id, rule_code, severity, cooldown_minutes')
      .eq('is_active', true)
      .in('rule_code', INVOICE_ALERT_RULE_DEFINITIONS.map(d => d.ruleCode))

    if (!activeRules || activeRules.length === 0) {
      return { success: true, results: [], totalTriggered: 0, followUpTasksCreated: 0 }
    }

    const ruleMap = new Map(activeRules.map(r => [r.rule_code, r]))

    // Check cooldown for each rule (skip if recently triggered)
    const now = new Date()

    for (const rule of activeRules) {
      const cooldownMs = (rule.cooldown_minutes || 60) * 60 * 1000
      const cooldownStart = new Date(now.getTime() - cooldownMs)

      const { data: recentAlert } = await supabase
        .from('alert_instances')
        .select('id')
        .eq('rule_id', rule.id)
        .gte('triggered_at', cooldownStart.toISOString())
        .limit(1)
        .maybeSingle()

      if (recentAlert) {
        results.push({
          ruleCode: rule.rule_code,
          triggered: false,
          alertMessage: 'Skipped: within cooldown period',
        })
        continue
      }

      // Run the specific check for this rule
      let checkResult: InvoiceAlertCheckResult | null = null

      switch (rule.rule_code) {
        case 'INV_OVERDUE_CRITICAL':
          checkResult = await checkOverdueCritical(supabase)
          break
        case 'INV_OVERDUE_WARNING':
          checkResult = await checkOverdueWarning(supabase)
          break
        case 'INV_NEGATIVE_MARGIN':
          checkResult = await checkNegativeMargin(supabase)
          break
        case 'INV_MISSING_BILLING':
          checkResult = await checkMissingBilling(supabase)
          break
        case 'INV_AR_CONCENTRATION':
          checkResult = await checkARConcentration(supabase)
          break
      }

      if (!checkResult) {
        results.push({
          ruleCode: rule.rule_code,
          triggered: false,
          alertMessage: 'No check implemented for this rule',
        })
        continue
      }

      checkResult.ruleCode = rule.rule_code

      if (checkResult.triggered) {
        totalTriggered++

        // Create alert instance
        const { data: alertInstance, error: alertError } = await supabase
          .from('alert_instances')
          .insert({
            rule_id: rule.id,
            triggered_at: now.toISOString(),
            current_value: checkResult.currentValue,
            threshold_value: checkResult.thresholdValue,
            alert_message: checkResult.alertMessage || '',
            context_data: (checkResult.contextData ?? null) as unknown as Json,
            status: 'active',
            notifications_sent: [] as unknown as Json,
          })
          .select('id')
          .single()

        if (!alertError && alertInstance) {
          checkResult.alertInstanceId = alertInstance.id
        }

        // Create follow-up task for critical alerts
        if (rule.severity === 'critical' && checkResult.contextData) {
          const taskCreated = await createAlertFollowUpTask(
            supabase,
            rule.rule_code,
            checkResult.alertMessage || '',
            checkResult.contextData
          )
          if (taskCreated) followUpTasksCreated++
        }
      }

      results.push(checkResult)
    }

    revalidatePath('/dashboard/alerts')

    return {
      success: true,
      results,
      totalTriggered,
      followUpTasksCreated,
    }
  } catch (error) {
    return {
      success: false,
      results: [],
      totalTriggered: 0,
      followUpTasksCreated: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =====================================================
// INDIVIDUAL ALERT CHECK FUNCTIONS
// =====================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkOverdueCritical(supabase: any): Promise<InvoiceAlertCheckResult> {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_id, total_amount, due_date, status, customers(name)')
    .in('status', ['sent', 'partial', 'overdue'])
    .not('due_date', 'is', null)

  const now = new Date()
  const criticalInvoices: Array<{ invoiceNumber: string; customerName: string; daysOverdue: number; amount: number }> = []

  for (const inv of (invoices || [])) {
    const daysOverdue = calculateDaysOverdue(inv.due_date, now)
    if (daysOverdue > 60) {
      criticalInvoices.push({
        invoiceNumber: inv.invoice_number,
        customerName: (inv.customers as { name: string } | null)?.name || 'Unknown',
        daysOverdue,
        amount: inv.total_amount,
      })
    }
  }

  if (criticalInvoices.length === 0) {
    return { ruleCode: '', triggered: false }
  }

  const totalAmount = criticalInvoices.reduce((sum, inv) => sum + inv.amount, 0)
  const topInvoices = criticalInvoices
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 5)

  return {
    ruleCode: '',
    triggered: true,
    alertMessage: `${criticalInvoices.length} invoice overdue >60 hari (total ${formatCurrency(totalAmount)}). Tertua: ${topInvoices[0].invoiceNumber} (${topInvoices[0].daysOverdue} hari, ${topInvoices[0].customerName})`,
    currentValue: criticalInvoices.length,
    thresholdValue: 0,
    contextData: {
      criticalCount: criticalInvoices.length,
      totalAmount,
      topInvoices,
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkOverdueWarning(supabase: any): Promise<InvoiceAlertCheckResult> {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_id, total_amount, due_date, status, customers(name)')
    .in('status', ['sent', 'partial', 'overdue'])
    .not('due_date', 'is', null)

  const now = new Date()
  const warningInvoices: Array<{ invoiceNumber: string; customerName: string; daysOverdue: number; amount: number }> = []

  for (const inv of (invoices || [])) {
    const daysOverdue = calculateDaysOverdue(inv.due_date, now)
    if (daysOverdue > 30 && daysOverdue <= 60) {
      warningInvoices.push({
        invoiceNumber: inv.invoice_number,
        customerName: (inv.customers as { name: string } | null)?.name || 'Unknown',
        daysOverdue,
        amount: inv.total_amount,
      })
    }
  }

  if (warningInvoices.length === 0) {
    return { ruleCode: '', triggered: false }
  }

  const totalAmount = warningInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  return {
    ruleCode: '',
    triggered: true,
    alertMessage: `${warningInvoices.length} invoice overdue 31-60 hari (total ${formatCurrency(totalAmount)})`,
    currentValue: warningInvoices.length,
    thresholdValue: 0,
    contextData: {
      warningCount: warningInvoices.length,
      totalAmount,
      invoices: warningInvoices.slice(0, 10),
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkNegativeMargin(supabase: any): Promise<InvoiceAlertCheckResult> {
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, customer_id, total_amount, jo_id, status,
      customers(name),
      job_orders!inner(id, jo_number, final_cost, final_revenue)
    `)
    .not('jo_id', 'is', null)
    .neq('status', 'cancelled')

  const negativeMarginItems: Array<{
    invoiceNumber: string
    joNumber: string
    customerName: string
    revenue: number
    cost: number
    marginPct: number
  }> = []

  for (const inv of (invoices || [])) {
    const jo = inv.job_orders as { id: string; jo_number: string; final_cost: number | null; final_revenue: number | null } | null
    if (!jo || !jo.final_cost || jo.final_cost <= 0) continue

    const finalRevenue = jo.final_revenue || 0
    if (finalRevenue >= jo.final_cost) continue

    const marginPct = ((finalRevenue - jo.final_cost) / jo.final_cost) * 100

    negativeMarginItems.push({
      invoiceNumber: inv.invoice_number,
      joNumber: jo.jo_number,
      customerName: (inv.customers as { name: string } | null)?.name || 'Unknown',
      revenue: finalRevenue,
      cost: jo.final_cost,
      marginPct,
    })
  }

  if (negativeMarginItems.length === 0) {
    return { ruleCode: '', triggered: false }
  }

  const totalLoss = negativeMarginItems.reduce((sum, item) => sum + (item.revenue - item.cost), 0)

  return {
    ruleCode: '',
    triggered: true,
    alertMessage: `${negativeMarginItems.length} JO dengan margin negatif (total kerugian ${formatCurrency(Math.abs(totalLoss))})`,
    currentValue: negativeMarginItems.length,
    thresholdValue: 0,
    contextData: {
      count: negativeMarginItems.length,
      totalLoss,
      items: negativeMarginItems.slice(0, 10),
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkMissingBilling(supabase: any): Promise<InvoiceAlertCheckResult> {
  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data: jos } = await supabase
    .from('job_orders')
    .select('id, jo_number, customer_id, final_revenue, completed_at, customers(name)')
    .in('status', ['completed', 'submitted_to_finance'])
    .lt('completed_at', fourteenDaysAgo.toISOString())

  if (!jos || jos.length === 0) {
    return { ruleCode: '', triggered: false }
  }

  // Check which JOs already have invoices
  const joIds = jos.map((jo: { id: string }) => jo.id)
  const { data: existingInvoices } = await supabase
    .from('invoices')
    .select('jo_id')
    .in('jo_id', joIds)
    .neq('status', 'cancelled')

  const invoicedJoIds = new Set((existingInvoices || []).map((inv: { jo_id: string }) => inv.jo_id))

  const missingBillingJOs: Array<{
    joNumber: string
    customerName: string
    revenue: number
    daysSinceCompletion: number
  }> = []

  for (const jo of jos) {
    if (invoicedJoIds.has(jo.id)) continue

    const completedDate = jo.completed_at ? new Date(jo.completed_at) : null
    const daysSince = completedDate
      ? Math.floor((Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    missingBillingJOs.push({
      joNumber: jo.jo_number,
      customerName: (jo.customers as { name: string } | null)?.name || 'Unknown',
      revenue: jo.final_revenue || 0,
      daysSinceCompletion: daysSince,
    })
  }

  if (missingBillingJOs.length === 0) {
    return { ruleCode: '', triggered: false }
  }

  const totalRevenue = missingBillingJOs.reduce((sum, jo) => sum + jo.revenue, 0)

  return {
    ruleCode: '',
    triggered: true,
    alertMessage: `${missingBillingJOs.length} JO selesai >14 hari belum diinvoice (potensi revenue ${formatCurrency(totalRevenue)})`,
    currentValue: missingBillingJOs.length,
    thresholdValue: 0,
    contextData: {
      count: missingBillingJOs.length,
      totalRevenue,
      jos: missingBillingJOs
        .sort((a, b) => b.daysSinceCompletion - a.daysSinceCompletion)
        .slice(0, 10),
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkARConcentration(supabase: any): Promise<InvoiceAlertCheckResult> {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('customer_id, total_amount, amount_paid, customers(name)')
    .in('status', ['sent', 'overdue', 'partial'])

  if (!invoices || invoices.length === 0) {
    return { ruleCode: '', triggered: false }
  }

  // Aggregate outstanding by customer
  const customerOutstanding = new Map<string, { name: string; outstanding: number }>()
  let totalOutstanding = 0

  for (const inv of invoices) {
    const outstanding = (inv.total_amount || 0) - (inv.amount_paid || 0)
    if (outstanding <= 0) continue

    totalOutstanding += outstanding
    const customerId = inv.customer_id || 'unknown'
    const existing = customerOutstanding.get(customerId)

    if (existing) {
      existing.outstanding += outstanding
    } else {
      customerOutstanding.set(customerId, {
        name: (inv.customers as { name: string } | null)?.name || 'Unknown',
        outstanding,
      })
    }
  }

  if (totalOutstanding <= 0) {
    return { ruleCode: '', triggered: false }
  }

  // Check if any customer has >50% of total AR
  const concentratedCustomers: Array<{
    customerName: string
    outstanding: number
    pct: number
  }> = []

  for (const [, customer] of customerOutstanding) {
    const pct = (customer.outstanding / totalOutstanding) * 100
    if (pct > 50) {
      concentratedCustomers.push({
        customerName: customer.name,
        outstanding: customer.outstanding,
        pct: Math.round(pct * 10) / 10,
      })
    }
  }

  if (concentratedCustomers.length === 0) {
    return { ruleCode: '', triggered: false }
  }

  const top = concentratedCustomers[0]

  return {
    ruleCode: '',
    triggered: true,
    alertMessage: `Konsentrasi AR tinggi: ${top.customerName} memiliki ${top.pct}% dari total AR (${formatCurrency(top.outstanding)} dari ${formatCurrency(totalOutstanding)})`,
    currentValue: top.pct,
    thresholdValue: 50,
    contextData: {
      totalOutstanding,
      concentratedCustomers,
    },
  }
}

// =====================================================
// FOLLOW-UP TASK CREATION
// =====================================================

/**
 * Creates a follow-up notification/task for critical alert findings.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createAlertFollowUpTask(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  ruleCode: string,
  alertMessage: string,
  contextData: Record<string, unknown>
): Promise<boolean> {
  try {
    // Find finance_manager users
    const { data: financeUsers } = await supabase
      .from('user_profiles')
      .select('id, user_id')
      .eq('role', 'finance_manager')
      .eq('is_active', true)
      .limit(1)

    const userId = financeUsers?.[0]?.user_id
    if (!userId) return false

    const { error } = await supabase
      .from('notifications')
      .insert({
        type: 'ALERT_TRIGGERED',
        title: `Alert: ${ruleCode}`,
        message: alertMessage,
        user_id: userId,
        entity_type: 'alert',
        priority: 'urgent',
        metadata: {
          rule_code: ruleCode,
          ...contextData,
        },
        is_read: false,
      })

    return !error
  } catch {
    return false
  }
}

