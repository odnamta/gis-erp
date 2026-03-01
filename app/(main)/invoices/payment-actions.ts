'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PaymentFormData, PaymentWithRecorder, Payment } from '@/types/payments'
import { InvoiceStatus } from '@/types'
import {
  validatePaymentAmount,
  isValidPaymentMethod,
  calculateTotalPaid,
  determineInvoiceStatus,
  canRecordPayment,
} from '@/lib/payment-utils'
import { trackPaymentCreation } from '@/lib/onboarding-tracker'

/**
 * Record a new payment against an invoice
 */
export async function recordPayment(data: PaymentFormData): Promise<{
  data?: Payment
  error?: string
}> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to record payments' }
  }

  // Parallelize user profile and invoice fetch for better performance
  const [profileResult, invoiceResult] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('invoices')
      .select('id, status, total_amount, amount_paid, jo_id, invoice_number')
      .eq('id', data.invoice_id)
      .single(),
  ])

  const userProfile = profileResult.data
  if (!userProfile) {
    return { error: 'User profile not found' }
  }

  // Check role permission
  if (!canRecordPayment(userProfile.role)) {
    return { error: 'You do not have permission to record payments' }
  }

  // Validate payment amount
  const amountValidation = validatePaymentAmount(data.amount)
  if (!amountValidation.isValid) {
    return { error: amountValidation.error }
  }

  // Validate payment method
  if (!isValidPaymentMethod(data.payment_method)) {
    return { error: 'Invalid payment method selected' }
  }

  const invoice = invoiceResult.data
  const invoiceError = invoiceResult.error

  if (invoiceError || !invoice) {
    return { error: 'Invoice not found' }
  }

  // Check invoice status - can't pay cancelled invoices
  if (invoice.status === 'cancelled') {
    return { error: 'Cannot record payment for cancelled invoice' }
  }

  // Insert payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      invoice_id: data.invoice_id,
      amount: data.amount,
      payment_date: data.payment_date,
      payment_method: data.payment_method,
      reference_number: data.reference_number || null,
      bank_name: data.bank_name || null,
      bank_account: data.bank_account || null,
      notes: data.notes || null,
      recorded_by: userProfile.id,
    })
    .select()
    .single()

  if (paymentError || !payment) {
    return { error: paymentError?.message || 'Failed to record payment' }
  }

  // Track for onboarding
  await trackPaymentCreation()

  // Calculate new total paid
  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', data.invoice_id)

  const totalPaid = calculateTotalPaid(allPayments || [])

  // Determine new invoice status
  const currentStatus = invoice.status as InvoiceStatus
  const newStatus = determineInvoiceStatus(invoice.total_amount, totalPaid, currentStatus)

  // Prepare update data
  const updateData: Record<string, unknown> = {
    amount_paid: totalPaid,
    status: newStatus,
    updated_at: new Date().toISOString(),
  }

  // Set paid_at timestamp when fully paid
  if (newStatus === 'paid' && currentStatus !== 'paid') {
    updateData.paid_at = new Date().toISOString()
  }

  // Update invoice
  const { error: updateError } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', data.invoice_id)

  if (updateError) {
    // Don't rollback payment - it's recorded, just log the error
  }

  // Update JO status if invoice is fully paid
  if (newStatus === 'paid' && invoice.jo_id) {
    await supabase
      .from('job_orders')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.jo_id)

    // Check for uninvoiced revenue and notify finance
    try {
      const { data: jo } = await supabase
        .from('job_orders')
        .select('jo_number, final_revenue, invoice_terms, customers(name)')
        .eq('id', invoice.jo_id)
        .single()

      if (jo?.invoice_terms && jo?.final_revenue) {
        const { calculateUninvoicedRevenue } = await import('@/lib/invoice-terms-utils')
        const { notifyUninvoicedRevenue } = await import('@/lib/notifications/notification-triggers')
        const terms = Array.isArray(jo.invoice_terms) ? jo.invoice_terms : []
        const { uninvoicedAmount, uninvoicedPercent } = calculateUninvoicedRevenue(
          terms as any,
          jo.final_revenue
        )
        if (uninvoicedPercent > 0) {
          await notifyUninvoicedRevenue({
            joId: invoice.jo_id,
            joNumber: jo.jo_number,
            uninvoicedAmount,
            uninvoicedPercent,
            totalRevenue: jo.final_revenue,
            customerName: (jo.customers as any)?.name,
          })
        }
      }
    } catch {
      // Non-critical: don't fail payment recording if notification fails
    }

    // Log activity (use invoice_number from initial fetch)
    if (invoice.invoice_number) {
      await supabase.from('activity_log').insert({
        action_type: 'invoice_paid',
        document_type: 'invoice',
        document_id: data.invoice_id,
        document_number: invoice.invoice_number,
        user_id: user.id,
        user_name: user.email || 'Unknown',
      })
    }
  }

  // Revalidate paths
  revalidatePath('/invoices')
  revalidatePath(`/invoices/${data.invoice_id}`)
  revalidatePath('/job-orders')
  if (invoice.jo_id) {
    revalidatePath(`/job-orders/${invoice.jo_id}`)
  }
  revalidatePath('/dashboard')

  return { data: payment as Payment }
}

/**
 * Get all payments for an invoice with recorder details
 */
export async function getPayments(invoiceId: string): Promise<PaymentWithRecorder[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      recorder:user_profiles!payments_recorded_by_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: false })

  if (error) {
    return []
  }

  return (data || []) as PaymentWithRecorder[]
}

/**
 * Delete a payment and recalculate invoice status
 */
export async function deletePayment(paymentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'You must be logged in to delete payments' }
  }

  // Get user profile for role check
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (!userProfile) {
    return { error: 'User profile not found' }
  }

  // Check role permission
  if (!canRecordPayment(userProfile.role)) {
    return { error: 'You do not have permission to delete payments' }
  }

  // Get payment to find invoice_id
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select('invoice_id')
    .eq('id', paymentId)
    .single()

  if (paymentError || !payment) {
    return { error: 'Payment not found' }
  }

  const invoiceId = payment.invoice_id

  // Delete payment
  const { error: deleteError } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  // Recalculate total paid
  const { data: remainingPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', invoiceId)

  const totalPaid = calculateTotalPaid(remainingPayments || [])

  // Get invoice for status calculation
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total_amount, status, jo_id')
    .eq('id', invoiceId)
    .single()

  if (invoice) {
    const currentStatus = invoice.status as InvoiceStatus
    const newStatus = determineInvoiceStatus(invoice.total_amount, totalPaid, currentStatus)

    // Prepare update data
    const updateData: Record<string, unknown> = {
      amount_paid: totalPaid,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Clear paid_at if no longer paid
    if (newStatus !== 'paid' && currentStatus === 'paid') {
      updateData.paid_at = null
    }

    await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)

    // If invoice was paid and now isn't, revert JO status
    if (currentStatus === 'paid' && newStatus !== 'paid' && invoice.jo_id) {
      await supabase
        .from('job_orders')
        .update({
          status: 'invoiced',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.jo_id)
    }
  }

  // Revalidate paths
  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/job-orders')
  revalidatePath('/dashboard')

  return {}
}
