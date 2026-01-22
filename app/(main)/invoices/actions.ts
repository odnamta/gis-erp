'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/permissions-server'
import {
  InvoiceWithRelations,
  InvoiceFormData,
  InvoiceStatus,
  parseInvoiceTerms,
} from '@/types'
import {
  formatInvoiceNumber,
  calculateInvoiceTotals,
  isValidStatusTransition,
  getDefaultDueDate,
} from '@/lib/invoice-utils'
import { calculateTermInvoiceTotals } from '@/lib/invoice-terms-utils'
import { DEFAULT_SETTINGS } from '@/types/company-settings'
import { invalidateDashboardCache } from '@/lib/cached-queries'
import { logActivity } from '@/lib/activity-logger'

/**
 * Generate the next sequential invoice number for the current year
 * Format: INV-YYYY-NNNN
 */
export async function generateInvoiceNumber(): Promise<string> {
  const supabase = await createClient()
  const currentYear = new Date().getFullYear()
  const yearPrefix = `INV-${currentYear}-`

  // Get the highest invoice number for the current year
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${yearPrefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching invoice numbers:', error)
    // Start from 1 if there's an error
    return formatInvoiceNumber(currentYear, 1)
  }

  if (!data || data.length === 0) {
    // No invoices for this year yet
    return formatInvoiceNumber(currentYear, 1)
  }

  // Extract the sequence number and increment
  const lastNumber = data[0].invoice_number
  const match = lastNumber.match(/INV-\d{4}-(\d{4})/)
  const lastSequence = match ? parseInt(match[1], 10) : 0

  return formatInvoiceNumber(currentYear, lastSequence + 1)
}

/**
 * Get invoice data pre-filled from a Job Order
 */
export async function getInvoiceDataFromJO(joId: string): Promise<{
  data?: InvoiceFormData & { invoiceNumber: string; customerName: string; joNumber: string }
  error?: string
}> {
  const supabase = await createClient()

  // Fetch JO with customer and PJO data
  const { data: jo, error: joError } = await supabase
    .from('job_orders')
    .select(`
      *,
      customers (id, name, email, address),
      proforma_job_orders!job_orders_pjo_id_fkey (id, pjo_number)
    `)
    .eq('id', joId)
    .single()

  if (joError || !jo) {
    return { error: 'Job Order not found' }
  }

  // Validate JO status
  if (jo.status !== 'submitted_to_finance') {
    return { error: 'Only Job Orders submitted to finance can be invoiced' }
  }

  // Fetch revenue items from the linked PJO
  let lineItems: InvoiceFormData['line_items'] = []
  
  if (jo.pjo_id) {
    const { data: revenueItems, error: revenueError } = await supabase
      .from('pjo_revenue_items')
      .select('*')
      .eq('pjo_id', jo.pjo_id)
      .order('created_at', { ascending: true })

    if (!revenueError && revenueItems) {
      lineItems = revenueItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
      }))
    }
  }

  // If no revenue items from PJO, create a default line item from JO
  if (lineItems.length === 0) {
    lineItems = [{
      description: jo.description || 'Services rendered',
      quantity: 1,
      unit: 'LOT',
      unit_price: jo.final_revenue || jo.amount || 0,
    }]
  }

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber()
  
  // Get payment terms from company settings
  const { data: paymentTermsSetting } = await supabase
    .from('company_settings')
    .select('value')
    .eq('key', 'default_payment_terms')
    .single()
  
  const paymentTerms = paymentTermsSetting?.value 
    ? parseInt(paymentTermsSetting.value, 10) 
    : DEFAULT_SETTINGS.default_payment_terms
  
  const dueDate = getDefaultDueDate(paymentTerms)

  return {
    data: {
      jo_id: joId,
      customer_id: jo.customer_id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      line_items: lineItems,
      invoiceNumber,
      customerName: jo.customers?.name || 'Unknown',
      joNumber: jo.jo_number,
    },
  }
}

/**
 * Create a new invoice from form data
 */
export async function createInvoice(data: InvoiceFormData): Promise<{
  data?: { id: string; invoice_number: string }
  error?: string
}> {
  const supabase = await createClient()

  // Validate JO status
  const { data: jo, error: joError } = await supabase
    .from('job_orders')
    .select('status')
    .eq('id', data.jo_id)
    .single()

  if (joError || !jo) {
    return { error: 'Job Order not found' }
  }

  if (jo.status !== 'submitted_to_finance') {
    return { error: 'Only Job Orders submitted to finance can be invoiced' }
  }

  // Calculate totals
  const { subtotal, vatAmount, grandTotal} = calculateInvoiceTotals(data.line_items)

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber()

  // Determine entity_type from user role
  const profile = await getUserProfile()
  const entityType = profile?.role === 'agency' ? 'gama_agency' : 'gama_main'

  // Create invoice with optional term metadata
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      jo_id: data.jo_id,
      customer_id: data.customer_id,
      invoice_date: data.invoice_date,
      due_date: data.due_date,
      subtotal,
      tax_amount: vatAmount,
      total_amount: grandTotal,
      status: 'draft',
      notes: data.notes || null,
      // Term metadata for split invoices
      invoice_term: data.invoice_term || null,
      term_percentage: data.term_percentage || null,
      term_description: data.term_description || null,
      entity_type: entityType,
    })
    .select('id, invoice_number')
    .single()

  if (invoiceError || !invoice) {
    console.error('Error creating invoice:', invoiceError)
    return { error: invoiceError?.message || 'Failed to create invoice' }
  }

  // Create line items
  const lineItemsToInsert = data.line_items.map((item, index) => ({
    invoice_id: invoice.id,
    line_number: index + 1,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.unit_price,
  }))

  const { error: lineItemsError } = await supabase
    .from('invoice_line_items')
    .insert(lineItemsToInsert)

  if (lineItemsError) {
    console.error('Error creating line items:', lineItemsError)
    // Rollback invoice creation
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { error: 'Failed to create invoice line items' }
  }

  // Update JO status to 'invoiced'
  const { error: joUpdateError } = await supabase
    .from('job_orders')
    .update({
      status: 'invoiced',
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.jo_id)

  if (joUpdateError) {
    console.error('Error updating JO status:', joUpdateError)
    // Don't rollback - invoice is created, just log the error
  }

  // Invalidate dashboard cache (Requirement 6.6)
  invalidateDashboardCache()

  // Log activity (v0.13.1)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    logActivity(user.id, 'create', 'invoice', invoice.id, { invoice_number: invoice.invoice_number })
  }

  revalidatePath('/invoices')
  revalidatePath('/job-orders')
  revalidatePath(`/job-orders/${data.jo_id}`)

  return { data: { id: invoice.id, invoice_number: invoice.invoice_number } }
}


export interface InvoiceFilters {
  status?: InvoiceStatus
  search?: string
}

/**
 * Get all invoices with optional filters
 */
export async function getInvoices(filters?: InvoiceFilters): Promise<InvoiceWithRelations[]> {
  const supabase = await createClient()

  let query = supabase
    .from('invoices')
    .select(`
      *,
      customers (id, name, email, address),
      job_orders (id, jo_number, pjo_id)
    `)
    .order('created_at', { ascending: false })

  // Apply status filter
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  // Apply search filter (invoice number or customer name)
  if (filters?.search) {
    const searchTerm = `%${filters.search}%`
    query = query.or(`invoice_number.ilike.${searchTerm},customers.name.ilike.${searchTerm}`)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching invoices:', error)
    return []
  }

  return (data || []) as InvoiceWithRelations[]
}

/**
 * Get a single invoice with all related data
 */
export async function getInvoice(id: string): Promise<InvoiceWithRelations | null> {
  const supabase = await createClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      customers (id, name, email, address),
      job_orders (id, jo_number, pjo_id)
    `)
    .eq('id', id)
    .single()

  if (invoiceError || !invoice) {
    console.error('Error fetching invoice:', invoiceError)
    return null
  }

  // Fetch line items separately
  const { data: lineItems, error: lineItemsError } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('line_number', { ascending: true })

  if (lineItemsError) {
    console.error('Error fetching line items:', lineItemsError)
  }

  return {
    ...invoice,
    invoice_line_items: lineItems || [],
  } as InvoiceWithRelations
}


/**
 * Update invoice status with proper validation and side effects
 */
export async function updateInvoiceStatus(
  id: string,
  targetStatus: InvoiceStatus
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Fetch current invoice
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('status, jo_id, due_date')
    .eq('id', id)
    .single()

  if (fetchError || !invoice) {
    return { error: 'Invoice not found' }
  }

  const currentStatus = invoice.status as InvoiceStatus

  // Validate status transition
  if (!isValidStatusTransition(currentStatus, targetStatus)) {
    return { error: `Cannot transition from ${currentStatus} to ${targetStatus}` }
  }

  // Special validation for overdue - must be past due date
  if (targetStatus === 'overdue') {
    const dueDate = new Date(invoice.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    
    if (dueDate >= today) {
      return { error: 'Cannot mark as overdue - due date has not passed' }
    }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    status: targetStatus,
    updated_at: new Date().toISOString(),
  }

  // Set appropriate timestamp based on target status
  if (targetStatus === 'sent') {
    updateData.sent_at = new Date().toISOString()
  } else if (targetStatus === 'paid') {
    updateData.paid_at = new Date().toISOString()
  } else if (targetStatus === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString()
  }

  // Update invoice
  const { error: updateError } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    return { error: updateError.message }
  }

  // Send notification for status change
  if (['sent', 'paid', 'overdue'].includes(targetStatus)) {
    try {
      const { data: invoiceDetails } = await supabase
        .from('invoices')
        .select('invoice_number, total_amount, customers(name)')
        .eq('id', id)
        .single()

      const { data: { user } } = await supabase.auth.getUser()
      const { data: userProfile } = user ? await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single() : { data: null }

      if (invoiceDetails) {
        const { notifyInvoiceStatusChange } = await import('@/lib/notifications/notification-triggers')
        await notifyInvoiceStatusChange(
          {
            id,
            invoice_number: invoiceDetails.invoice_number,
            customer_name: (invoiceDetails.customers as { name: string } | null)?.name,
            total_amount: invoiceDetails.total_amount,
            created_by: userProfile?.id,
          },
          targetStatus as 'sent' | 'paid' | 'overdue'
        )
      }
    } catch (e) {
      console.error('Failed to send invoice notification:', e)
    }
  }

  // Handle JO status updates based on invoice status
  if (targetStatus === 'paid') {
    // Update JO to closed
    await supabase
      .from('job_orders')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.jo_id)

    // Log activity for dashboard - fetch invoice number first
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('id', id)
      .single()

    if (invoiceData) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('activity_log').insert({
        action_type: 'invoice_paid',
        document_type: 'invoice',
        document_id: id,
        document_number: invoiceData.invoice_number,
        user_id: user?.id || null,
        user_name: user?.email || 'System',
      })
    }
  } else if (targetStatus === 'cancelled') {
    // Revert JO to submitted_to_finance
    await supabase
      .from('job_orders')
      .update({
        status: 'submitted_to_finance',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.jo_id)
  }

  // Invalidate dashboard cache (Requirement 6.6)
  invalidateDashboardCache()

  // Log activity (v0.13.1)
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (currentUser) {
    const { data: invoiceForLog } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('id', id)
      .single()
    logActivity(currentUser.id, 'update', 'invoice', id, { 
      invoice_number: invoiceForLog?.invoice_number,
      status: targetStatus 
    })
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  revalidatePath('/job-orders')
  revalidatePath(`/job-orders/${invoice.jo_id}`)
  revalidatePath('/dashboard')

  return {}
}


/**
 * Generate a split invoice for a specific term from a Job Order
 */
export async function generateSplitInvoice(
  joId: string,
  termIndex: number
): Promise<{ data?: { id: string; invoice_number: string }; error?: string }> {
  const supabase = await createClient()

  // Fetch JO with invoice terms
  const { data: jo, error: joError } = await supabase
    .from('job_orders')
    .select('*, customers(id, name)')
    .eq('id', joId)
    .single()

  if (joError || !jo) {
    return { error: 'Job Order not found' }
  }

  // Parse invoice terms
  const terms = parseInvoiceTerms(jo.invoice_terms)

  if (terms.length === 0) {
    return { error: 'No invoice terms configured for this Job Order' }
  }

  if (termIndex < 0 || termIndex >= terms.length) {
    return { error: 'Invalid term index' }
  }

  const term = terms[termIndex]

  // Check if term is already invoiced
  if (term.invoiced) {
    return { error: 'This term has already been invoiced' }
  }

  // Calculate amounts
  const revenue = jo.final_revenue || jo.amount || 0
  const { subtotal, vatAmount, totalAmount } = calculateTermInvoiceTotals(revenue, term.percentage)

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber()

  // Get payment terms from company settings
  const { data: paymentTermsSetting } = await supabase
    .from('company_settings')
    .select('value')
    .eq('key', 'default_payment_terms')
    .single()

  const paymentTerms = paymentTermsSetting?.value
    ? parseInt(paymentTermsSetting.value, 10)
    : DEFAULT_SETTINGS.default_payment_terms

  const dueDate = getDefaultDueDate(paymentTerms)

  // Determine entity_type from user role
  const profile = await getUserProfile()
  const entityType = profile?.role === 'agency' ? 'gama_agency' : 'gama_main'

  // Create invoice with term metadata
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      jo_id: joId,
      customer_id: jo.customer_id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      subtotal,
      tax_amount: vatAmount,
      total_amount: totalAmount,
      status: 'draft',
      invoice_term: term.term,
      term_percentage: term.percentage,
      term_description: term.description,
      entity_type: entityType,
    })
    .select('id, invoice_number')
    .single()

  if (invoiceError || !invoice) {
    console.error('Error creating split invoice:', invoiceError)
    return { error: invoiceError?.message || 'Failed to create invoice' }
  }

  // Create a single line item for the term
  const { error: lineItemError } = await supabase
    .from('invoice_line_items')
    .insert({
      invoice_id: invoice.id,
      line_number: 1,
      description: `${term.description} (${term.percentage}% of ${jo.description || 'Services'})`,
      quantity: 1,
      unit: 'LOT',
      unit_price: subtotal,
    })

  if (lineItemError) {
    console.error('Error creating line item:', lineItemError)
    // Rollback invoice
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { error: 'Failed to create invoice line item' }
  }

  // Update term as invoiced
  terms[termIndex] = {
    ...term,
    invoiced: true,
    invoice_id: invoice.id,
  }

  // Calculate new total invoiced
  const newTotalInvoiced = (jo.total_invoiced || 0) + totalAmount

  // Update JO with new terms and total_invoiced
  const { error: joUpdateError } = await supabase
    .from('job_orders')
    .update({
      invoice_terms: JSON.parse(JSON.stringify(terms)),
      total_invoiced: newTotalInvoiced,
      updated_at: new Date().toISOString(),
    })
    .eq('id', joId)

  if (joUpdateError) {
    console.error('Error updating JO:', joUpdateError)
    // Don't rollback - invoice is created
  }

  // Check if all terms are invoiced - if so, update JO status
  const allTermsInvoiced = terms.every(t => t.invoiced)
  if (allTermsInvoiced) {
    await supabase
      .from('job_orders')
      .update({
        status: 'invoiced',
        updated_at: new Date().toISOString(),
      })
      .eq('id', joId)
  }

  revalidatePath('/invoices')
  revalidatePath('/job-orders')
  revalidatePath(`/job-orders/${joId}`)

  return { data: { id: invoice.id, invoice_number: invoice.invoice_number } }
}