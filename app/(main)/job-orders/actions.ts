'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { JobOrderWithRelations, InvoiceTerm, parseInvoiceTerms } from '@/types'
import { validateTermsTotal } from '@/lib/invoice-terms-utils'
import { invalidateDashboardCache } from '@/lib/cached-queries'
import { logActivity } from '@/lib/activity-logger'

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
        name,
        company_name
      ),
      proforma_job_orders!job_orders_pjo_id_fkey (
        id,
        pjo_number
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) {
    return []
  }

  return (data ?? []) as unknown as JobOrderWithRelations[]
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
    return null
  }

  return data as unknown as JobOrderWithRelations
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

  // Log activity (v0.13.1)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    logActivity(user.id, 'update', 'job_order', joId, { jo_number: jo.jo_number, status: 'completed' })
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
    console.error('markCompleted notification error:', e)
  }

  // Invalidate dashboard cache (Requirement 6.6)
  invalidateDashboardCache()

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

  // Log activity (v0.13.1)
  if (user) {
    logActivity(user.id, 'update', 'job_order', joId, { jo_number: jo.jo_number, status: 'submitted_to_finance' })
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
    console.error('submitToFinance notification error:', e)
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
      console.error('submitToFinance revenue discrepancy check error:', e)
    }
  }

  // Invalidate dashboard cache (Requirement 6.6)
  invalidateDashboardCache()

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
    return []
  }

  return data
}

export async function getJOCostItems(pjoId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pjo_cost_items')
    .select('*, vendors(vendor_name)')
    .eq('pjo_id', pjoId)
    .order('created_at', { ascending: true })

  if (error) {
    return []
  }

  // Map vendor name from joined data
  return (data || []).map((item) => {
    const vendors = item.vendors as { vendor_name: string } | null
    return {
      ...item,
      vendor_name: vendors?.vendor_name ?? null,
    }
  })
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
    return []
  }

  return data
}

/**
 * Update JO Category/Classification
 * Column `jo_category` added via migration, not yet in generated types.
 */
export async function updateJOCategory(
  joId: string,
  category: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: jo, error: fetchError } = await supabase
    .from('job_orders')
    .select('jo_number')
    .eq('id', joId)
    .single()

  if (fetchError || !jo) {
    return { error: 'Job Order not found' }
  }

  const { error } = await supabase
    .from('job_orders')
    .update({
      jo_category: category,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', joId)

  if (error) {
    return { error: error.message }
  }

  logActivity(user.id, 'update', 'job_order', joId, {
    jo_number: jo.jo_number,
    action: 'category_updated',
    jo_category: category,
  })

  revalidatePath('/job-orders')
  revalidatePath(`/job-orders/${joId}`)
  return {}
}

/**
 * Request revision on a locked/approved JO
 * Sets status back to in_progress so costs can be edited again.
 * Columns `revision_notes`, `revision_requested_at`, `revision_requested_by`
 * added via migration, not yet in generated types.
 */
export async function requestJORevision(
  joId: string,
  notes: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  if (!notes || notes.trim().length === 0) {
    return { error: 'Revision notes are required' }
  }

  const { data: jo, error: fetchError } = await supabase
    .from('job_orders')
    .select('status, jo_number, customers(name)')
    .eq('id', joId)
    .single()

  if (fetchError || !jo) {
    return { error: 'Job Order not found' }
  }

  const allowedStatuses = ['submitted_to_finance', 'invoiced', 'completed']
  if (!allowedStatuses.includes(jo.status)) {
    return { error: 'Revision can only be requested on completed, submitted, or invoiced Job Orders' }
  }

  const { error } = await supabase
    .from('job_orders')
    .update({
      status: 'in_progress',
      revision_notes: notes.trim(),
      revision_requested_at: new Date().toISOString(),
      revision_requested_by: user.id,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', joId)

  if (error) {
    return { error: error.message }
  }

  logActivity(user.id, 'update', 'job_order', joId, {
    jo_number: jo.jo_number,
    action: 'revision_requested',
    revision_notes: notes.trim(),
    previous_status: jo.status,
  })

  invalidateDashboardCache()

  revalidatePath('/job-orders')
  revalidatePath(`/job-orders/${joId}`)
  return {}
}