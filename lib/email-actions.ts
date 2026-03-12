'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import {
  invoiceReminderTemplate,
  advanceReturnReminderTemplate,
  weeklyArAgingSummaryTemplate,
} from '@/lib/email-templates'
import { formatDocumentDate } from '@/lib/utils/format'

/**
 * Email Actions — Server actions for sending internal email reminders.
 *
 * Recipients: users with role 'finance' or 'finance_manager' from user_profiles.
 * Email failures are caught and returned as errors — they never break the app.
 */

// ============================================================================
// Helpers
// ============================================================================

async function getFinanceTeamEmails(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_profiles')
    .select('email')
    .in('role', ['finance', 'finance_manager'])
    .eq('is_active', true)

  if (!data || data.length === 0) {
    return []
  }

  return data.map((p) => p.email).filter(Boolean) as string[]
}

// ============================================================================
// Send Invoice Reminder
// ============================================================================

export async function sendInvoiceReminder(
  invoiceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Fetch invoice with customer info
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, due_date, status, customers(name)')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return { success: false, error: 'Invoice tidak ditemukan' }
    }

    // Calculate days overdue
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null
    if (!dueDate) {
      return { success: false, error: 'Invoice tidak memiliki tanggal jatuh tempo' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysOverdue <= 0) {
      return { success: false, error: 'Invoice belum jatuh tempo' }
    }

    // Get finance team emails
    const recipients = await getFinanceTeamEmails()
    if (recipients.length === 0) {
      return { success: false, error: 'Tidak ada email finance team yang terdaftar' }
    }

    const customerName =
      (invoice.customers as { name: string } | null)?.name || 'Unknown Customer'

    const { subject, html } = invoiceReminderTemplate({
      invoiceNumber: invoice.invoice_number,
      customerName,
      amount: invoice.total_amount,
      dueDate: formatDocumentDate(invoice.due_date),
      daysOverdue,
    })

    const result = await sendEmail({ to: recipients, subject, html })

    if (!result.success) {
      return { success: false, error: result.error || 'Gagal mengirim email' }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengirim pengingat invoice'
    return { success: false, error: message }
  }
}

// ============================================================================
// Send Advance Return Reminder
// ============================================================================

export async function sendAdvanceReturnReminder(
  bkkId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Fetch BKK record
    const { data: bkk, error: fetchError } = await (supabase
      .from('bukti_kas_keluar' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select('id, bkk_number, amount_requested, advance_recipient_name, return_deadline, status')
      .eq('id', bkkId)
      .single() as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    if (fetchError || !bkk) {
      return { success: false, error: 'BKK tidak ditemukan' }
    }

    const typedBkk = bkk as {
      id: string
      bkk_number: string
      amount_requested: number
      advance_recipient_name: string | null
      return_deadline: string | null
      status: string
    }

    if (!typedBkk.return_deadline) {
      return { success: false, error: 'BKK tidak memiliki deadline pengembalian' }
    }

    if (typedBkk.status === 'settled') {
      return { success: false, error: 'BKK sudah diselesaikan' }
    }

    // Calculate days overdue
    const deadline = new Date(typedBkk.return_deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    deadline.setHours(0, 0, 0, 0)
    const daysOverdue = Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))

    if (daysOverdue <= 0) {
      return { success: false, error: 'Advance belum melewati deadline pengembalian' }
    }

    // Get finance team emails
    const recipients = await getFinanceTeamEmails()
    if (recipients.length === 0) {
      return { success: false, error: 'Tidak ada email finance team yang terdaftar' }
    }

    const { subject, html } = advanceReturnReminderTemplate({
      bkkNumber: typedBkk.bkk_number,
      recipientName: typedBkk.advance_recipient_name || 'Tidak diketahui',
      amount: typedBkk.amount_requested,
      deadline: formatDocumentDate(typedBkk.return_deadline),
      daysOverdue,
    })

    const result = await sendEmail({ to: recipients, subject, html })

    if (!result.success) {
      return { success: false, error: result.error || 'Gagal mengirim email' }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengirim pengingat advance'
    return { success: false, error: message }
  }
}

// ============================================================================
// Send Weekly AR Aging Summary
// ============================================================================

export async function sendWeeklyArSummary(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Fetch outstanding invoices
    const { data } = await supabase
      .from('invoices')
      .select('id, total_amount, due_date, status')
      .eq('is_active', true)
      .in('status', ['sent', 'received', 'partial', 'overdue'])

    const invoices = (data || []) as {
      id: string
      total_amount: number
      due_date: string | null
      status: string
    }[]

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build aging buckets
    const buckets = [
      { label: 'Belum Jatuh Tempo', count: 0, totalAmount: 0 },
      { label: '1-30 Hari', count: 0, totalAmount: 0 },
      { label: '31-60 Hari', count: 0, totalAmount: 0 },
      { label: '61-90 Hari', count: 0, totalAmount: 0 },
      { label: '> 90 Hari', count: 0, totalAmount: 0 },
    ]

    let totalOutstanding = 0

    for (const inv of invoices) {
      const amt = Number(inv.total_amount || 0)
      totalOutstanding += amt

      const dueDate = inv.due_date ? new Date(inv.due_date) : null
      let daysPastDue = 0
      if (dueDate) {
        dueDate.setHours(0, 0, 0, 0)
        daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      let bucketIdx: number
      if (daysPastDue <= 0) bucketIdx = 0
      else if (daysPastDue <= 30) bucketIdx = 1
      else if (daysPastDue <= 60) bucketIdx = 2
      else if (daysPastDue <= 90) bucketIdx = 3
      else bucketIdx = 4

      buckets[bucketIdx].count++
      buckets[bucketIdx].totalAmount += amt
    }

    // Get finance team emails
    const recipients = await getFinanceTeamEmails()
    if (recipients.length === 0) {
      return { success: false, error: 'Tidak ada email finance team yang terdaftar' }
    }

    const generatedAt = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const { subject, html } = weeklyArAgingSummaryTemplate({
      buckets,
      totalOutstanding,
      totalInvoices: invoices.length,
      generatedAt,
    })

    const result = await sendEmail({ to: recipients, subject, html })

    if (!result.success) {
      return { success: false, error: result.error || 'Gagal mengirim email' }
    }

    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal mengirim laporan AR aging'
    return { success: false, error: message }
  }
}
