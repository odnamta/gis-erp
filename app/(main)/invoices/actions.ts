'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserProfile } from '@/lib/permissions-server'
import { sanitizeSearchInput } from '@/lib/utils/sanitize'
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
import { ActionResult } from '@/types/actions'

const INVOICE_ALLOWED_ROLES = ['owner', 'director', 'sysadmin', 'finance_manager', 'finance', 'administration', 'marketing_manager'] as const

/**
 * Generate the next sequential invoice number for the current year
 * Format: INV-YYYY-NNNN
 */
export async function generateInvoiceNumber(): Promise<string> {
  const profile = await getUserProfile()
  if (!profile || !INVOICE_ALLOWED_ROLES.includes(profile.role as typeof INVOICE_ALLOWED_ROLES[number])) {
    throw new Error('Unauthorized')
  }

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
export async function getInvoiceDataFromJO(joId: string): Promise<ActionResult<InvoiceFormData & { invoiceNumber: string; customerName: string; joNumber: string }>> {
  const profile = await getUserProfile()
  if (!profile || !INVOICE_ALLOWED_ROLES.includes(profile.role as typeof INVOICE_ALLOWED_ROLES[number])) {
    return { success: false, error: 'Unauthorized' }
  }

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
    return { success: false, error: 'Job Order not found' }
  }

  // Validate JO status — accept completed or submitted_to_finance
  const INVOICEABLE_STATUSES = ['submitted_to_finance', 'completed', 'invoiced']
  if (!INVOICEABLE_STATUSES.includes(jo.status)) {
    return { success: false, error: 'Job Order must be completed or submitted to finance before invoicing' }
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
    success: true,
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
export async function createInvoice(data: InvoiceFormData): Promise<ActionResult<{ id: string; invoice_number: string }>> {
  const profile = await getUserProfile()
  if (!profile || !INVOICE_ALLOWED_ROLES.includes(profile.role as typeof INVOICE_ALLOWED_ROLES[number])) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Validate JO status
  const { data: jo, error: joError } = await supabase
    .from('job_orders')
    .select('status')
    .eq('id', data.jo_id)
    .single()

  if (joError || !jo) {
    return { success: false, error: 'Job Order not found' }
  }

  // Accept completed, submitted_to_finance, or already invoiced (for split invoices)
  const INVOICEABLE_STATUSES = ['submitted_to_finance', 'completed', 'invoiced']
  if (!INVOICEABLE_STATUSES.includes(jo.status)) {
    return { success: false, error: 'Job Order must be completed or submitted to finance before invoicing' }
  }

  // Calculate totals
  const { subtotal, vatAmount, grandTotal} = calculateInvoiceTotals(data.line_items)

  // Generate invoice number (profile already fetched in role check above)
  const invoiceNumber = await generateInvoiceNumber()
  const entityType = profile.role === 'agency' ? 'gama_agency' : 'gama_main'

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
    return { success: false, error: invoiceError?.message || 'Failed to create invoice' }
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
    // Rollback invoice creation
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { success: false, error: 'Failed to create invoice line items' }
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

  return { success: true, data: { id: invoice.id, invoice_number: invoice.invoice_number } }
}


export interface InvoiceFilters {
  status?: InvoiceStatus
  search?: string
}

/**
 * Get all invoices with optional filters
 */
export async function getInvoices(filters?: InvoiceFilters): Promise<InvoiceWithRelations[]> {
  const profile = await getUserProfile()
  if (!profile || !INVOICE_ALLOWED_ROLES.includes(profile.role as typeof INVOICE_ALLOWED_ROLES[number])) {
    return []
  }

  const supabase = await createClient()

  // company_name exists in DB but not in generated Supabase types — use as any cast
  const result = await (async () => {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customers (id, name, email, address, company_name),
        job_orders (id, jo_number, pjo_id)
      `)
      .order('created_at', { ascending: false })

    // Apply status filter
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    // Apply search filter (invoice number or customer name)
    if (filters?.search) {
      const searchTerm = `%${sanitizeSearchInput(filters.search)}%`
      query = query.or(`invoice_number.ilike.${searchTerm},customers.name.ilike.${searchTerm}`)
    }

    return query.limit(1000)
  })()

  if (result.error) {
    return []
  }

  const invoices = (result.data || []) as unknown as InvoiceWithRelations[]

  // Fetch which invoices have BG records
  if (invoices.length > 0) {
    const invoiceIds = invoices.map(inv => inv.id)
    const bgQuery = (supabase as any).from('bilyet_giro')
      .select('invoice_id')
      .in('invoice_id', invoiceIds)
      .eq('is_active', true)
    const { data: bgData } = await bgQuery

    if (bgData && bgData.length > 0) {
      const bgInvoiceIds = new Set((bgData as { invoice_id: string }[]).map(bg => bg.invoice_id))
      for (const inv of invoices) {
        (inv as InvoiceWithRelations & { has_bg?: boolean }).has_bg = bgInvoiceIds.has(inv.id)
      }
    }
  }

  return invoices
}

/**
 * Get a single invoice with all related data
 */
export async function getInvoice(id: string): Promise<InvoiceWithRelations | null> {
  const profile = await getUserProfile()
  if (!profile || !INVOICE_ALLOWED_ROLES.includes(profile.role as typeof INVOICE_ALLOWED_ROLES[number])) {
    return null
  }

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
    return null
  }

  // Fetch line items separately
  const { data: lineItems, error: lineItemsError } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', id)
    .order('line_number', { ascending: true })

  if (lineItemsError) {
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
): Promise<ActionResult<void>> {
  const profile = await getUserProfile()
  if (!profile || !INVOICE_ALLOWED_ROLES.includes(profile.role as typeof INVOICE_ALLOWED_ROLES[number])) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Fetch current invoice
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('status, jo_id, due_date')
    .eq('id', id)
    .single()

  if (fetchError || !invoice) {
    return { success: false, error: 'Invoice not found' }
  }

  const currentStatus = invoice.status as InvoiceStatus

  // Validate status transition
  if (!isValidStatusTransition(currentStatus, targetStatus)) {
    return { success: false, error: `Cannot transition from ${currentStatus} to ${targetStatus}` }
  }

  // Special validation for overdue - must be past due date
  if (targetStatus === 'overdue') {
    const dueDate = new Date(invoice.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    
    if (dueDate >= today) {
      return { success: false, error: 'Cannot mark as overdue - due date has not passed' }
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
  } else if (targetStatus === 'received') {
    // received_at column doesn't exist — append timestamp to notes
    const receivedTimestamp = new Date().toISOString().split('T')[0]
    const { data: currentInvoice } = await supabase
      .from('invoices')
      .select('notes')
      .eq('id', id)
      .single()
    const existingNotes = currentInvoice?.notes || ''
    const receivedNote = `[Diterima: ${receivedTimestamp}]`
    updateData.notes = existingNotes ? `${existingNotes}\n${receivedNote}` : receivedNote
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
    return { success: false, error: updateError.message }
  }

  // Send notification for status change
  if (['sent', 'received', 'paid', 'overdue'].includes(targetStatus)) {
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
          targetStatus as 'sent' | 'received' | 'paid' | 'overdue'
        )
      }
    } catch (e) {
      console.error('updateInvoiceStatus notification error:', e)
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

  return { success: true, data: undefined as void }
}


/**
 * Generate a split invoice for a specific term from a Job Order
 */
export async function generateSplitInvoice(
  joId: string,
  termIndex: number
): Promise<ActionResult<{ id: string; invoice_number: string }>> {
  const profile = await getUserProfile()
  if (!profile || !INVOICE_ALLOWED_ROLES.includes(profile.role as typeof INVOICE_ALLOWED_ROLES[number])) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Fetch JO with invoice terms
  const { data: jo, error: joError } = await supabase
    .from('job_orders')
    .select('*, customers(id, name)')
    .eq('id', joId)
    .single()

  if (joError || !jo) {
    return { success: false, error: 'Job Order not found' }
  }

  // Parse invoice terms
  const terms = parseInvoiceTerms(jo.invoice_terms)

  if (terms.length === 0) {
    return { success: false, error: 'No invoice terms configured for this Job Order' }
  }

  if (termIndex < 0 || termIndex >= terms.length) {
    return { success: false, error: 'Invalid term index' }
  }

  const term = terms[termIndex]

  // Check if term is already invoiced
  if (term.invoiced) {
    return { success: false, error: 'This term has already been invoiced' }
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

  // Determine entity_type from user role (profile already fetched in role check above)
  const entityType = profile.role === 'agency' ? 'gama_agency' : 'gama_main'

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
    return { success: false, error: invoiceError?.message || 'Failed to create invoice' }
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
    // Rollback invoice
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { success: false, error: 'Failed to create invoice line item' }
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

  return { success: true, data: { id: invoice.id, invoice_number: invoice.invoice_number } }
}


/**
 * Create a Down Payment (DP) invoice from an approved Proforma Job Order.
 * DP invoices are sent BEFORE work starts, based on confirmed PJO rates.
 */
export async function createDPInvoice(
  pjoId: string,
  dpPercentage: number,
  notes?: string
): Promise<ActionResult<{ id: string; invoice_number: string }>> {
  const profile = await getUserProfile()
  if (!profile || !INVOICE_ALLOWED_ROLES.includes(profile.role as typeof INVOICE_ALLOWED_ROLES[number])) {
    return { success: false, error: 'Unauthorized' }
  }

  if (dpPercentage <= 0 || dpPercentage > 100) {
    return { success: false, error: 'Persentase DP harus antara 1-100%' }
  }

  const supabase = await createClient()

  // Validate PJO exists and is approved
  const { data: pjo, error: pjoError } = await supabase
    .from('proforma_job_orders')
    .select(`
      *,
      projects (
        id,
        name,
        customer_id,
        customers (
          id,
          name
        )
      )
    `)
    .eq('id', pjoId)
    .single()

  if (pjoError || !pjo) {
    return { success: false, error: 'Proforma Job Order tidak ditemukan' }
  }

  if (pjo.status !== 'approved') {
    return { success: false, error: 'PJO harus berstatus approved untuk membuat invoice DP' }
  }

  // Get customer_id from project relation
  const customerId = pjo.projects?.customer_id
  if (!customerId) {
    return { success: false, error: 'Customer tidak ditemukan pada project PJO ini' }
  }

  // Fetch PJO revenue items for total calculation
  const { data: revenueItems } = await supabase
    .from('pjo_revenue_items')
    .select('*')
    .eq('pjo_id', pjoId)
    .order('created_at', { ascending: true })

  // Calculate total revenue from revenue items or fall back to PJO estimated_revenue
  const totalRevenue = revenueItems && revenueItems.length > 0
    ? revenueItems.reduce((sum, item) => sum + (item.subtotal || (item.quantity * item.unit_price)), 0)
    : (pjo.total_revenue ?? 0)

  if (totalRevenue <= 0) {
    return { success: false, error: 'Total revenue PJO harus lebih dari 0 untuk membuat invoice DP' }
  }

  // Calculate DP amount and VAT
  const dpAmount = totalRevenue * (dpPercentage / 100)
  const vatAmount = dpAmount * 0.11 // PPN 11%
  const grandTotal = dpAmount + vatAmount

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber()

  // Get payment terms
  const { data: paymentTermsSetting } = await supabase
    .from('company_settings')
    .select('value')
    .eq('key', 'default_payment_terms')
    .single()

  const paymentTerms = paymentTermsSetting?.value
    ? parseInt(paymentTermsSetting.value, 10)
    : DEFAULT_SETTINGS.default_payment_terms

  const dueDate = getDefaultDueDate(paymentTerms)
  const entityType = profile.role === 'agency' ? 'gama_agency' : 'gama_main'

  // Create invoice with invoice_type = 'dp' and pjo_id (new columns not in generated types)
  const { data: invoice, error: invoiceError } = await (supabase.from('invoices') as any)
    .insert({
      invoice_number: invoiceNumber,
      jo_id: null,
      customer_id: customerId,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      subtotal: dpAmount,
      tax_amount: vatAmount,
      total_amount: grandTotal,
      status: 'draft',
      notes: notes || null,
      entity_type: entityType,
      invoice_type: 'dp',
      pjo_id: pjoId,
    })
    .select('id, invoice_number')
    .single()

  if (invoiceError || !invoice) {
    return { success: false, error: invoiceError?.message || 'Gagal membuat invoice DP' }
  }

  // Create a single line item for the DP
  const { error: lineItemError } = await supabase
    .from('invoice_line_items')
    .insert({
      invoice_id: invoice.id,
      line_number: 1,
      description: `Down Payment (${dpPercentage}%) - ${pjo.pjo_number}`,
      quantity: 1,
      unit: 'LOT',
      unit_price: dpAmount,
    })

  if (lineItemError) {
    // Rollback invoice creation
    await supabase.from('invoices').delete().eq('id', invoice.id)
    return { success: false, error: 'Gagal membuat line item invoice DP' }
  }

  // Invalidate dashboard cache
  invalidateDashboardCache()

  // Log activity
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    logActivity(user.id, 'create', 'invoice', invoice.id, {
      invoice_number: invoice.invoice_number,
      invoice_type: 'dp',
      pjo_id: pjoId,
      dp_percentage: dpPercentage,
    })
  }

  revalidatePath('/invoices')
  revalidatePath('/proforma-jo')
  revalidatePath(`/proforma-jo/${pjoId}`)

  return { success: true, data: { id: invoice.id, invoice_number: invoice.invoice_number } }
}


/**
 * Get all DP invoices linked to a specific Proforma Job Order.
 */
export async function getDPInvoicesForPJO(
  pjoId: string
): Promise<ActionResult<InvoiceWithRelations[]>> {
  const profile = await getUserProfile()
  if (!profile || !INVOICE_ALLOWED_ROLES.includes(profile.role as typeof INVOICE_ALLOWED_ROLES[number])) {
    return { success: false, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Query invoices with pjo_id and invoice_type = 'dp' (new columns, use as any)
  const { data, error } = await (supabase.from('invoices') as any)
    .select(`
      *,
      customers (id, name, email, address)
    `)
    .eq('pjo_id', pjoId)
    .eq('invoice_type', 'dp')
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: (data || []) as InvoiceWithRelations[] }
}