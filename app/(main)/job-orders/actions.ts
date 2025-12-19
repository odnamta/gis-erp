'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { JobOrderWithRelations, InvoiceTerm, parseInvoiceTerms } from '@/types'
import { validateTermsTotal } from '@/lib/invoice-terms-utils'

export async function getJobOrders(): Promise<JobOrderWithRelations[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_orders')
    .select(`
      *,
      projects (
        id,
        name
      ),
      customers (
        id,
        name
      ),
      proforma_job_orders!job_orders_pjo_id_fkey (
        id,
        pjo_number
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching job orders:', error)
    return []
  }

  return data as JobOrderWithRelations[]
}

export async function getJobOrder(id: string): Promise<JobOrderWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('job_orders')
    .select(`
      *,
      projects (
        id,
        name
      ),
      customers (
        id,
        name
      ),
      proforma_job_orders!job_orders_pjo_id_fkey (
        id,
        pjo_number,
        commodity,
        quantity,
        quantity_unit,
        pol,
        pod,
        etd,
        eta,
        carrier_type,
        notes
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching job order:', error)
    return null
  }

  return data as JobOrderWithRelations
}

export async function markCompleted(joId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: jo, error: fetchError } = await supabase
    .from('job_orders')
    .select('status, jo_number, customers(name)')
    .eq('id', joId)
    .single()

  if (fetchError || !jo) {
    return { error: 'Job Order not found' }
  }

  if (jo.status !== 'active' && jo.status !== 'in_progress') {
    return { error: 'Only active or in-progress Job Orders can be marked as completed' }
  }

  const { error } = await supabase
    .from('job_orders')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', joId)

  if (error) {
    return { error: error.message }
  }

  // Send notification for JO completed
  try {
    const { notifyJoStatusChange } = await import('@/lib/notifications/notification-triggers')
    await notifyJoStatusChange(
      {
        id: joId,
        jo_number: jo.jo_number,
        customer_name: (jo.customers as { name: string } | null)?.name,
        status: 'completed',
      },
      'completed'
    )
  } catch (e) {
    console.error('Failed to send JO completion notification:', e)
  }

  revalidatePath('/job-orders')
  revalidatePath(`/job-orders/${joId}`)
  return {}
}

export async function submitToFinance(joId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: jo, error: fetchError } = await supabase
    .from('job_orders')
    .select('status, jo_number, pjo_id, final_revenue, customers(name)')
    .eq('id', joId)
    .single()

  if (fetchError || !jo) {
    return { error: 'Job Order not found' }
  }

  if (jo.status !== 'completed') {
    return { error: 'Only completed Job Orders can be submitted to finance' }
  }

  const { error } = await supabase
    .from('job_orders')
    .update({
      status: 'submitted_to_finance',
      submitted_to_finance_at: new Date().toISOString(),
      submitted_by: user?.id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', joId)

  if (error) {
    return { error: error.message }
  }

  // Send notification for JO submitted to finance
  try {
    const { notifyJoStatusChange } = await import('@/lib/notifications/notification-triggers')
    await notifyJoStatusChange(
      {
        id: joId,
        jo_number: jo.jo_number,
        customer_name: (jo.customers as { name: string } | null)?.name,
        status: 'submitted_to_finance',
      },
      'submitted_to_finance'
    )
  } catch (e) {
    console.error('Failed to send JO submission notification:', e)
  }

  // Check for revenue discrepancy between PJO items and JO final revenue
  if (jo.pjo_id) {
    try {
      const { data: revenueItems } = await supabase
        .from('pjo_revenue_items')
        .select('subtotal')
        .eq('pjo_id', jo.pjo_id)

      if (revenueItems && revenueItems.length > 0) {
        const pjoRevenueTotal = revenueItems.reduce((sum, item) => sum + (item.subtotal || 0), 0)
        const joFinalRevenue = jo.final_revenue || 0
        const difference = pjoRevenueTotal - joFinalRevenue
        const differencePercent = joFinalRevenue > 0 ? Math.abs(difference / joFinalRevenue) * 100 : 0

        // Notify if discrepancy exceeds 1%
        if (differencePercent > 1) {
          const { notifyRevenueDiscrepancy } = await import('@/lib/notifications/notification-triggers')
          await notifyRevenueDiscrepancy({
            joId,
            joNumber: jo.jo_number,
            pjoRevenueTotal,
            joFinalRevenue,
            difference,
            customerName: (jo.customers as { name: string } | null)?.name,
          })
        }
      }
    } catch (e) {
      console.error('Failed to check revenue discrepancy:', e)
    }
  }

  revalidatePath('/job-orders')
  revalidatePath(`/job-orders/${joId}`)
  return {}
}

export async function getJORevenueItems(pjoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pjo_revenue_items')
    .select('*')
    .eq('pjo_id', pjoId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching revenue items:', error)
    return []
  }

  return data
}

export async function getJOCostItems(pjoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pjo_cost_items')
    .select('*')
    .eq('pjo_id', pjoId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching cost items:', error)
    return []
  }

  return data
}


/**
 * Save invoice terms for a Job Order
 * Validates that terms total 100% and prevents modification after invoicing
 */
export async function saveInvoiceTerms(
  joId: string,
  terms: InvoiceTerm[]
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Validate percentage total
  if (!validateTermsTotal(terms)) {
    return { error: 'Invoice terms must total exactly 100%' }
  }

  // Fetch JO to check for existing invoices
  const { data: jo, error: fetchError } = await supabase
    .from('job_orders')
    .select('id, final_revenue, invoice_terms')
    .eq('id', joId)
    .single()

  if (fetchError || !jo) {
    return { error: 'Job Order not found' }
  }

  // Check if any invoices exist for this JO
  const { data: existingInvoices, error: invoiceError } = await supabase
    .from('invoices')
    .select('id')
    .eq('jo_id', joId)
    .limit(1)

  if (invoiceError) {
    return { error: 'Failed to check existing invoices' }
  }

  // Check if any term has been invoiced
  const currentTerms = parseInvoiceTerms(jo.invoice_terms)
  const hasInvoicedTerms = currentTerms.some(t => t.invoiced)

  if ((existingInvoices && existingInvoices.length > 0) || hasInvoicedTerms) {
    return { error: 'Cannot modify invoice terms after invoices have been generated' }
  }

  // Save terms with invoiced: false for all
  const termsToSave = terms.map(t => ({
    ...t,
    invoiced: false,
    invoice_id: undefined,
  }))

  const { error: updateError } = await supabase
    .from('job_orders')
    .update({
      invoice_terms: termsToSave,
      invoiceable_amount: jo.final_revenue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', joId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/job-orders')
  revalidatePath(`/job-orders/${joId}`)
  return {}
}

/**
 * Get invoices for a Job Order
 */
export async function getJOInvoices(joId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total_amount, invoice_term, term_percentage, term_description')
    .eq('jo_id', joId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching JO invoices:', error)
    return []
  }

  return data
}