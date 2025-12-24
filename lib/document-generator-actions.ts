'use server'

/**
 * Document Generator Server Actions
 * Core orchestration for document generation in the n8n Document Generation module (v0.68)
 * Requirements: 4.3, 4.4, 4.5, 5.5, 6.5
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  DocumentType,
  GeneratedDocument,
  GenerationRequest,
  GenerationResult,
  VariableContext,
  DocumentHistoryFilters,
  GeneratedDocumentWithRelations,
  DocumentTemplate,
} from '@/types/document-generation'
import { getTemplateByCode } from '@/lib/document-template-actions'
import { processTemplate, injectLetterhead } from '@/lib/variable-processor-utils'
import { convertToPDF, createPDFOptions } from '@/lib/pdf-converter-utils'
import { uploadDocument } from '@/lib/document-storage-actions'

// Result types for actions
interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

// Type for Supabase client with any table access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = any

// Company letterhead HTML (can be customized per company)
const DEFAULT_LETTERHEAD_HTML = `
<div class="letterhead" style="text-align: center; margin-bottom: 20px;">
  <h2 style="margin: 0;">PT. Gama Intisamudera</h2>
  <p style="margin: 5px 0; font-size: 12px;">Heavy-Haul Logistics Solutions</p>
  <p style="margin: 5px 0; font-size: 11px;">Jl. Example Address No. 123, Jakarta, Indonesia</p>
  <p style="margin: 5px 0; font-size: 11px;">Tel: +62 21 1234567 | Email: info@gama-group.co</p>
</div>
`

/**
 * Core document generation orchestration
 * Fetches template, processes variables, converts to PDF, uploads, and creates record
 * 
 * Requirements: 4.3, 4.4, 4.5
 * 
 * @param request - Generation request with template_code, entity_type, entity_id, user_id
 * @returns GenerationResult with document details or error
 */
export async function generateDocument(
  request: GenerationRequest
): Promise<GenerationResult> {
  try {
    // 1. Fetch the template by code
    const templateResult = await getTemplateByCode(request.template_code)
    if (!templateResult.success || !templateResult.data) {
      return {
        success: false,
        error: templateResult.error || 'Template not found',
      }
    }

    const template = templateResult.data

    // Check if template is active
    if (!template.is_active) {
      return {
        success: false,
        error: 'Template is inactive',
      }
    }

    // 2. Fetch entity data based on entity_type
    const variablesResult = await fetchEntityVariables(
      request.entity_type,
      request.entity_id,
      template.document_type
    )

    if (!variablesResult.success || !variablesResult.data) {
      return {
        success: false,
        error: variablesResult.error || 'Failed to fetch entity data',
      }
    }

    const variables = variablesResult.data

    // 3. Process the template with variables
    let processedHtml = template.html_template

    // Inject CSS styles if present
    if (template.css_styles) {
      processedHtml = processedHtml.replace('{{styles}}', template.css_styles)
    }

    // Inject letterhead if enabled
    if (template.include_letterhead) {
      processedHtml = injectLetterhead(processedHtml, DEFAULT_LETTERHEAD_HTML, true)
    } else {
      processedHtml = injectLetterhead(processedHtml, '', false)
    }

    // Process all variables
    const processed = processTemplate(processedHtml, variables)

    // 4. Convert to PDF
    const pdfOptions = createPDFOptions(
      template.page_size,
      template.orientation,
      template.margins,
      template.header_html || undefined,
      template.footer_html || undefined
    )

    const pdfResult = await convertToPDF(processed.html, pdfOptions)

    if (!pdfResult.success || !pdfResult.pdf_buffer) {
      return {
        success: false,
        error: pdfResult.error || 'PDF conversion failed',
      }
    }

    // 5. Upload to storage
    const documentNumber = getDocumentNumber(variables, template.document_type)
    const uploadResult = await uploadDocument(
      pdfResult.pdf_buffer,
      template.document_type,
      documentNumber
    )

    if (!uploadResult.success || !uploadResult.file_url) {
      return {
        success: false,
        error: uploadResult.error || 'Failed to upload document',
      }
    }

    // 6. Create generated document record
    const recordResult = await createGeneratedDocumentRecord({
      template_id: template.id,
      document_type: template.document_type,
      document_number: documentNumber,
      entity_type: request.entity_type,
      entity_id: request.entity_id,
      file_url: uploadResult.file_url,
      file_name: uploadResult.file_name || `${documentNumber}.pdf`,
      file_size_kb: uploadResult.file_size_kb || 0,
      generated_by: request.user_id,
      variables_data: variables,
    })

    if (!recordResult.success || !recordResult.data) {
      return {
        success: false,
        error: recordResult.error || 'Failed to create document record',
      }
    }

    // 7. Update source entity with pdf_url (for invoices and quotations)
    if (request.entity_type === 'invoice' || request.entity_type === 'quotation') {
      await updateSourceEntityPdfUrl(
        request.entity_type,
        request.entity_id,
        uploadResult.file_url
      )
    }

    revalidatePath('/documents')
    revalidatePath(`/${request.entity_type}s/${request.entity_id}`)

    return {
      success: true,
      document: recordResult.data,
      file_url: uploadResult.file_url,
    }
  } catch (error) {
    console.error('Error in generateDocument:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during document generation',
    }
  }
}


/**
 * Creates a generated document record in the database
 * 
 * Requirements: 4.3, 4.4, 4.5
 * 
 * @param data - Document record data
 * @returns ActionResult with created document or error
 */
export async function createGeneratedDocumentRecord(data: {
  template_id: string
  document_type: DocumentType
  document_number: string | null
  entity_type: string
  entity_id: string
  file_url: string
  file_name: string
  file_size_kb: number
  generated_by: string
  variables_data: VariableContext
}): Promise<ActionResult<GeneratedDocument>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    const { data: record, error } = await supabase
      .from('generated_documents')
      .insert({
        template_id: data.template_id,
        document_type: data.document_type,
        document_number: data.document_number,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        file_url: data.file_url,
        file_name: data.file_name,
        file_size_kb: data.file_size_kb,
        generated_at: new Date().toISOString(),
        generated_by: data.generated_by,
        variables_data: data.variables_data,
        sent_to_email: null,
        sent_at: null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating generated document record:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: mapDbRecordToGeneratedDocument(record),
    }
  } catch (error) {
    console.error('Error in createGeneratedDocumentRecord:', error)
    return { success: false, error: 'Failed to create document record' }
  }
}

/**
 * Updates the source entity (invoice/quotation) with the generated PDF URL
 * 
 * Requirements: 5.5, 6.5
 * 
 * @param entityType - The type of entity ('invoice' or 'quotation')
 * @param entityId - The entity ID
 * @param pdfUrl - The URL of the generated PDF
 * @returns ActionResult with success status
 */
export async function updateSourceEntityPdfUrl(
  entityType: string,
  entityId: string,
  pdfUrl: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    let tableName: string
    switch (entityType) {
      case 'invoice':
        tableName = 'invoices'
        break
      case 'quotation':
        tableName = 'quotations'
        break
      default:
        // Other entity types don't need pdf_url update
        return { success: true }
    }

    const { error } = await supabase
      .from(tableName)
      .update({ pdf_url: pdfUrl })
      .eq('id', entityId)

    if (error) {
      console.error(`Error updating ${tableName} pdf_url:`, error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateSourceEntityPdfUrl:', error)
    return { success: false, error: 'Failed to update source entity' }
  }
}

/**
 * Fetches entity data and builds variable context for template processing
 * 
 * @param entityType - The type of entity
 * @param entityId - The entity ID
 * @param _documentType - The document type being generated (reserved for future use)
 * @returns ActionResult with variable context
 */
async function fetchEntityVariables(
  entityType: string,
  entityId: string,
  _documentType: DocumentType
): Promise<ActionResult<VariableContext>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    switch (entityType) {
      case 'invoice':
        return await fetchInvoiceVariables(supabase, entityId)
      case 'quotation':
        return await fetchQuotationVariables(supabase, entityId)
      case 'job_order':
        return await fetchJobOrderVariables(supabase, entityId)
      default:
        return {
          success: false,
          error: `Unsupported entity type: ${entityType}`,
        }
    }
  } catch (error) {
    console.error('Error fetching entity variables:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch entity data',
    }
  }
}

/**
 * Invoice line item structure from database
 */
interface InvoiceLineItem {
  id: string
  invoice_id: string
  line_number: number
  description: string
  quantity: number
  unit: string | null
  unit_price: number
  subtotal: number | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Quotation revenue item structure from database
 */
interface QuotationRevenueItemData {
  id: string
  quotation_id: string
  category: string
  description: string
  quantity: number | null
  unit: string | null
  unit_price: number
  subtotal: number | null
  display_order: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Quotation data structure from database with relations
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
interface QuotationData {
  id: string
  quotation_number: string
  customer_id: string
  project_id: string | null
  title: string
  commodity: string | null
  origin: string
  destination: string
  total_revenue: number | null
  total_cost: number | null
  gross_profit: number | null
  profit_margin: number | null
  status: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  // Scope and terms fields
  scope_of_work?: string | null
  description?: string | null
  terms_conditions?: string | null
  // Validity dates
  quotation_date?: string | null
  valid_until?: string | null
  // Relations
  customers: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
  } | null
  projects: {
    id: string
    name: string
  } | null
}

/**
 * Quotation variables for template processing
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export interface QuotationTemplateVariables {
  quotation_number: string
  quotation_date: string
  valid_until: string
  customer_name: string
  customer_address: string
  customer_email: string
  project_name: string
  title: string
  commodity: string
  origin: string
  destination: string
  scope: string
  items: Array<{
    description: string
    category: string
    quantity: number
    unit: string
    unit_price: number
    amount: number
  }>
  total_amount: number
  terms: string
  notes: string
}

/**
 * Invoice data structure from database with relations
 */
interface InvoiceData {
  id: string
  invoice_number: string
  jo_id: string
  customer_id: string
  subtotal: number
  tax_amount: number
  total_amount: number
  status: string
  due_date: string
  invoice_date: string | null
  notes: string | null
  invoice_term: string | null
  term_percentage: number | null
  term_description: string | null
  customers: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
  } | null
  job_orders: {
    id: string
    jo_number: string
  } | null
}

/**
 * Invoice variables for template processing
 * Requirements: 5.1, 5.2, 5.3
 */
export interface InvoiceTemplateVariables {
  invoice_number: string
  invoice_date: string
  due_date: string
  customer_name: string
  customer_address: string
  customer_email: string
  jo_number: string
  items: Array<{
    description: string
    quantity: number
    unit: string
    unit_price: number
    amount: number
  }>
  subtotal: number
  tax_amount: number
  total_amount: number
  notes: string
  invoice_term: string
  term_description: string
}

/**
 * Fetches invoice data from database with customer and job order relations
 * 
 * Requirements: 5.1, 5.2, 5.3
 * 
 * @param invoiceId - The invoice ID to fetch
 * @returns ActionResult with invoice data or error
 */
export async function fetchInvoiceData(
  invoiceId: string
): Promise<ActionResult<{ invoice: InvoiceData; lineItems: InvoiceLineItem[] }>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    // Fetch invoice with customer and job order relations
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone,
          address
        ),
        job_orders (
          id,
          jo_number
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        return { success: false, error: 'Invoice not found' }
      }
      console.error('Error fetching invoice:', invoiceError)
      return { success: false, error: invoiceError.message }
    }

    if (!invoice) {
      return { success: false, error: 'Invoice not found' }
    }

    // Fetch invoice line items
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('line_number', { ascending: true })

    if (lineItemsError) {
      console.error('Error fetching invoice line items:', lineItemsError)
      // Continue without line items - they may not exist
    }

    return {
      success: true,
      data: {
        invoice: invoice as InvoiceData,
        lineItems: (lineItems || []) as InvoiceLineItem[],
      },
    }
  } catch (error) {
    console.error('Error in fetchInvoiceData:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice data',
    }
  }
}

/**
 * Calculates invoice totals from line items
 * 
 * Requirements: 5.4
 * 
 * @param lineItems - Array of invoice line items
 * @returns Object with subtotal, tax_amount (11%), and total_amount
 */
export function calculateInvoiceTotals(
  lineItems: Array<{ quantity: number; unit_price: number }>
): { subtotal: number; tax_amount: number; total_amount: number } {
  // Calculate subtotal as sum of all item amounts (quantity * unit_price)
  const subtotal = lineItems.reduce((sum, item) => {
    const amount = item.quantity * item.unit_price
    return sum + amount
  }, 0)

  // Calculate tax at 11% (Indonesian PPN rate)
  const tax_amount = subtotal * 0.11

  // Calculate total
  const total_amount = subtotal + tax_amount

  return {
    subtotal,
    tax_amount,
    total_amount,
  }
}

/**
 * Builds variable context for invoice template processing
 * 
 * Requirements: 5.1, 5.2, 5.3
 * 
 * @param invoice - Invoice data with relations
 * @param lineItems - Invoice line items
 * @returns InvoiceTemplateVariables for template substitution
 */
export function buildInvoiceVariables(
  invoice: InvoiceData,
  lineItems: InvoiceLineItem[]
): InvoiceTemplateVariables {
  // Build items array with calculated amounts
  const items = lineItems.map((item) => ({
    description: item.description || '',
    quantity: Number(item.quantity) || 1,
    unit: item.unit || 'unit',
    unit_price: Number(item.unit_price) || 0,
    amount: item.subtotal !== null 
      ? Number(item.subtotal) 
      : (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
  }))

  // Use stored totals from invoice if available, otherwise calculate
  let subtotal: number
  let tax_amount: number
  let total_amount: number

  if (invoice.subtotal !== undefined && invoice.subtotal !== null) {
    // Use stored values from invoice
    subtotal = Number(invoice.subtotal)
    tax_amount = Number(invoice.tax_amount) || subtotal * 0.11
    total_amount = Number(invoice.total_amount) || subtotal + tax_amount
  } else {
    // Calculate from line items
    const calculated = calculateInvoiceTotals(items)
    subtotal = calculated.subtotal
    tax_amount = calculated.tax_amount
    total_amount = calculated.total_amount
  }

  return {
    invoice_number: invoice.invoice_number || '',
    invoice_date: formatDateForTemplate(invoice.invoice_date),
    due_date: formatDateForTemplate(invoice.due_date),
    customer_name: invoice.customers?.name || '',
    customer_address: invoice.customers?.address || '',
    customer_email: invoice.customers?.email || '',
    jo_number: invoice.job_orders?.jo_number || '',
    items,
    subtotal,
    tax_amount,
    total_amount,
    notes: invoice.notes || '',
    invoice_term: invoice.invoice_term || '',
    term_description: invoice.term_description || '',
  }
}

/**
 * Validates invoice data for document generation
 * 
 * Requirements: 5.6
 * 
 * @param invoice - Invoice data to validate
 * @param _lineItems - Invoice line items (optional, for future validation)
 * @returns Validation result with errors if any
 */
export function validateInvoiceData(
  invoice: InvoiceData | null,
  _lineItems?: InvoiceLineItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!invoice) {
    errors.push('Invoice data is required')
    return { valid: false, errors }
  }

  // Required invoice fields
  if (!invoice.invoice_number) {
    errors.push('invoice_number is required')
  }

  if (!invoice.customer_id) {
    errors.push('customer_id is required')
  }

  // Customer data validation
  if (!invoice.customers) {
    errors.push('Customer data is required')
  } else {
    if (!invoice.customers.name) {
      errors.push('customer_name is required')
    }
  }

  // Line items validation - at least one item should exist for a complete invoice
  // Note: This is a soft validation - invoices can be generated without line items
  // but a warning could be logged

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Generates an invoice PDF document
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.5
 * 
 * @param invoiceId - The invoice ID to generate PDF for
 * @param userId - The user ID generating the document
 * @param templateCode - Optional template code (defaults to 'INV_STANDARD')
 * @returns GenerationResult with document details or error
 */
export async function generateInvoice(
  invoiceId: string,
  userId: string,
  templateCode: string = 'INV_STANDARD'
): Promise<GenerationResult> {
  try {
    // 1. Fetch invoice data
    const invoiceResult = await fetchInvoiceData(invoiceId)
    if (!invoiceResult.success || !invoiceResult.data) {
      return {
        success: false,
        error: invoiceResult.error || 'Failed to fetch invoice data',
      }
    }

    const { invoice, lineItems } = invoiceResult.data

    // 2. Validate invoice data
    const validation = validateInvoiceData(invoice, lineItems)
    if (!validation.valid) {
      return {
        success: false,
        error: `Invoice validation failed: ${validation.errors.join(', ')}`,
      }
    }

    // 3. Use the generic generateDocument function with invoice entity
    return await generateDocument({
      template_code: templateCode,
      entity_type: 'invoice',
      entity_id: invoiceId,
      user_id: userId,
    })
  } catch (error) {
    console.error('Error in generateInvoice:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during invoice generation',
    }
  }
}


/**
 * Fetches quotation data from database with customer, project, and revenue items
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * @param quotationId - The quotation ID to fetch
 * @returns ActionResult with quotation data or error
 */
export async function fetchQuotationData(
  quotationId: string
): Promise<ActionResult<{ quotation: QuotationData; revenueItems: QuotationRevenueItemData[] }>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    // Fetch quotation with customer and project relations
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone,
          address
        ),
        projects (
          id,
          name
        )
      `)
      .eq('id', quotationId)
      .single()

    if (quotationError) {
      if (quotationError.code === 'PGRST116') {
        return { success: false, error: 'Quotation not found' }
      }
      console.error('Error fetching quotation:', quotationError)
      return { success: false, error: quotationError.message }
    }

    if (!quotation) {
      return { success: false, error: 'Quotation not found' }
    }

    // Fetch quotation revenue items
    const { data: revenueItems, error: revenueItemsError } = await supabase
      .from('quotation_revenue_items')
      .select('*')
      .eq('quotation_id', quotationId)
      .order('display_order', { ascending: true })

    if (revenueItemsError) {
      console.error('Error fetching quotation revenue items:', revenueItemsError)
      // Continue without revenue items - they may not exist
    }

    return {
      success: true,
      data: {
        quotation: quotation as QuotationData,
        revenueItems: (revenueItems || []) as QuotationRevenueItemData[],
      },
    }
  } catch (error) {
    console.error('Error in fetchQuotationData:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch quotation data',
    }
  }
}

/**
 * Builds variable context for quotation template processing
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * @param quotation - Quotation data with relations
 * @param revenueItems - Quotation revenue items
 * @returns QuotationTemplateVariables for template substitution
 */
export function buildQuotationVariables(
  quotation: QuotationData,
  revenueItems: QuotationRevenueItemData[]
): QuotationTemplateVariables {
  // Build items array with calculated amounts
  const items = revenueItems.map((item) => ({
    description: item.description || '',
    category: item.category || '',
    quantity: Number(item.quantity) || 1,
    unit: item.unit || 'unit',
    unit_price: Number(item.unit_price) || 0,
    amount: item.subtotal !== null 
      ? Number(item.subtotal) 
      : (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
  }))

  // Calculate total from items or use stored total_revenue
  const totalAmount = quotation.total_revenue !== null && quotation.total_revenue !== undefined
    ? Number(quotation.total_revenue)
    : items.reduce((sum, item) => sum + item.amount, 0)

  // Build scope from available fields
  const scope = quotation.scope_of_work || quotation.description || quotation.title || ''

  // Build terms from available fields
  const terms = quotation.terms_conditions || 'Standard terms and conditions apply.'

  return {
    quotation_number: quotation.quotation_number || '',
    quotation_date: formatDateForTemplate(quotation.quotation_date || quotation.created_at),
    valid_until: formatDateForTemplate(quotation.valid_until),
    customer_name: quotation.customers?.name || '',
    customer_address: quotation.customers?.address || '',
    customer_email: quotation.customers?.email || '',
    project_name: quotation.projects?.name || '',
    title: quotation.title || '',
    commodity: quotation.commodity || '',
    origin: quotation.origin || '',
    destination: quotation.destination || '',
    scope,
    items,
    total_amount: totalAmount,
    terms,
    notes: quotation.notes || '',
  }
}

/**
 * Validates quotation data for document generation
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * 
 * @param quotation - Quotation data to validate
 * @param _revenueItems - Quotation revenue items (optional, for future validation)
 * @returns Validation result with errors if any
 */
export function validateQuotationData(
  quotation: QuotationData | null,
  _revenueItems?: QuotationRevenueItemData[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!quotation) {
    errors.push('Quotation data is required')
    return { valid: false, errors }
  }

  // Required quotation fields
  if (!quotation.quotation_number) {
    errors.push('quotation_number is required')
  }

  if (!quotation.customer_id) {
    errors.push('customer_id is required')
  }

  // Customer data validation
  if (!quotation.customers) {
    errors.push('Customer data is required')
  } else {
    if (!quotation.customers.name) {
      errors.push('customer_name is required')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Generates a quotation PDF document
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * @param quotationId - The quotation ID to generate PDF for
 * @param userId - The user ID generating the document
 * @param templateCode - Optional template code (defaults to 'QUOTE_STANDARD')
 * @returns GenerationResult with document details or error
 */
export async function generateQuotation(
  quotationId: string,
  userId: string,
  templateCode: string = 'QUOTE_STANDARD'
): Promise<GenerationResult> {
  try {
    // 1. Fetch quotation data
    const quotationResult = await fetchQuotationData(quotationId)
    if (!quotationResult.success || !quotationResult.data) {
      return {
        success: false,
        error: quotationResult.error || 'Failed to fetch quotation data',
      }
    }

    const { quotation, revenueItems } = quotationResult.data

    // 2. Validate quotation data
    const validation = validateQuotationData(quotation, revenueItems)
    if (!validation.valid) {
      return {
        success: false,
        error: `Quotation validation failed: ${validation.errors.join(', ')}`,
      }
    }

    // 3. Use the generic generateDocument function with quotation entity
    return await generateDocument({
      template_code: templateCode,
      entity_type: 'quotation',
      entity_id: quotationId,
      user_id: userId,
    })
  } catch (error) {
    console.error('Error in generateQuotation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during quotation generation',
    }
  }
}

/**
 * Fetches invoice data and builds variable context
 * Internal function used by fetchEntityVariables
 */
async function fetchInvoiceVariables(
  supabase: SupabaseClientAny,
  invoiceId: string
): Promise<ActionResult<VariableContext>> {
  // Fetch invoice with customer
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone,
        address
      ),
      job_orders (
        id,
        jo_number
      )
    `)
    .eq('id', invoiceId)
    .single()

  if (invoiceError || !invoice) {
    return {
      success: false,
      error: invoiceError?.message || 'Invoice not found',
    }
  }

  // Fetch invoice line items if they exist
  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('line_number', { ascending: true })

  // Build items array with proper amount calculation
  const items = (lineItems || []).map((item: InvoiceLineItem) => ({
    description: item.description || '',
    quantity: Number(item.quantity) || 1,
    unit: item.unit || 'unit',
    unit_price: Number(item.unit_price) || 0,
    amount: item.subtotal !== null 
      ? Number(item.subtotal) 
      : (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
  }))

  // Use stored totals from invoice if available
  const subtotal = Number(invoice.subtotal) || items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)
  const taxAmount = Number(invoice.tax_amount) || subtotal * 0.11
  const totalAmount = Number(invoice.total_amount) || subtotal + taxAmount

  const variables: VariableContext = {
    invoice_number: invoice.invoice_number || '',
    invoice_date: formatDateForTemplate(invoice.invoice_date),
    due_date: formatDateForTemplate(invoice.due_date),
    customer_name: invoice.customers?.name || '',
    customer_address: invoice.customers?.address || '',
    customer_email: invoice.customers?.email || '',
    jo_number: invoice.job_orders?.jo_number || '',
    items,
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    notes: invoice.notes || '',
    invoice_term: invoice.invoice_term || '',
    term_description: invoice.term_description || '',
  }

  return { success: true, data: variables }
}


/**
 * Fetches quotation data and builds variable context
 * Internal function used by fetchEntityVariables
 */
async function fetchQuotationVariables(
  supabase: SupabaseClientAny,
  quotationId: string
): Promise<ActionResult<VariableContext>> {
  // Fetch quotation with customer and project
  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone,
        address
      ),
      projects (
        id,
        name
      )
    `)
    .eq('id', quotationId)
    .single()

  if (quotationError || !quotation) {
    return {
      success: false,
      error: quotationError?.message || 'Quotation not found',
    }
  }

  // Fetch quotation revenue items
  const { data: revenueItems } = await supabase
    .from('quotation_revenue_items')
    .select('*')
    .eq('quotation_id', quotationId)
    .order('display_order', { ascending: true })

  // Use the exported buildQuotationVariables function for consistency
  const variables = buildQuotationVariables(
    quotation as QuotationData,
    (revenueItems || []) as QuotationRevenueItemData[]
  )

  return { success: true, data: variables as unknown as VariableContext }
}

/**
 * Fetches job order data and builds variable context for delivery notes
 * Internal function used by fetchEntityVariables
 */
async function fetchJobOrderVariables(
  supabase: SupabaseClientAny,
  joId: string
): Promise<ActionResult<VariableContext>> {
  // Fetch job order with related data
  const { data: jobOrder, error: joError } = await supabase
    .from('job_orders')
    .select(`
      *,
      proforma_job_orders (
        id,
        pjo_number,
        origin,
        destination,
        commodity
      ),
      customers (
        id,
        name,
        email,
        phone,
        address
      )
    `)
    .eq('id', joId)
    .single()

  if (joError || !jobOrder) {
    return {
      success: false,
      error: joError?.message || 'Job order not found',
    }
  }

  // Build items array from job order cargo details
  const items: DeliveryNoteItem[] = []
  
  // Add main cargo item if cargo description exists
  if (jobOrder.cargo_description) {
    items.push({
      description: jobOrder.cargo_description,
      quantity: Number(jobOrder.cargo_quantity) || 1,
      condition: 'Good',
      unit: 'unit',
      weight_tons: jobOrder.cargo_weight_tons ? Number(jobOrder.cargo_weight_tons) : undefined,
    })
  }

  // If no cargo description but PJO has commodity, use that
  if (items.length === 0 && jobOrder.proforma_job_orders?.commodity) {
    items.push({
      description: jobOrder.proforma_job_orders.commodity,
      quantity: 1,
      condition: 'Good',
      unit: 'unit',
    })
  }

  // Use the exported buildDeliveryNoteVariables function for consistency
  const variables = buildDeliveryNoteVariables(
    jobOrder as JobOrderData,
    items
  )

  return { success: true, data: variables as unknown as VariableContext }
}

/**
 * Gets the document number from variables based on document type
 */
function getDocumentNumber(variables: VariableContext, documentType: DocumentType): string {
  switch (documentType) {
    case 'invoice':
      return (variables.invoice_number as string) || 'UNKNOWN'
    case 'quotation':
      return (variables.quotation_number as string) || 'UNKNOWN'
    case 'delivery_note':
      return (variables.dn_number as string) || (variables.jo_number as string) || 'UNKNOWN'
    default:
      return `DOC-${Date.now()}`
  }
}

/**
 * Formats a date string for template display
 */
function formatDateForTemplate(dateString: string | null | undefined): string {
  if (!dateString) {
    return ''
  }
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return dateString
    }
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

/**
 * Maps database record to GeneratedDocument type
 */
function mapDbRecordToGeneratedDocument(record: Record<string, unknown>): GeneratedDocument {
  return {
    id: record.id as string,
    template_id: record.template_id as string,
    document_type: record.document_type as DocumentType,
    document_number: record.document_number as string | null,
    entity_type: record.entity_type as string,
    entity_id: record.entity_id as string,
    file_url: record.file_url as string,
    file_name: record.file_name as string,
    file_size_kb: record.file_size_kb as number,
    generated_at: record.generated_at as string,
    generated_by: record.generated_by as string,
    variables_data: record.variables_data as VariableContext,
    sent_to_email: record.sent_to_email as string | null,
    sent_at: record.sent_at as string | null,
    created_at: record.created_at as string,
  }
}

/**
 * Gets document generation history with optional filters
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4
 * 
 * @param filters - Optional filters for entity, type, date range
 * @returns ActionResult with array of generated documents
 */
export async function getGenerationHistory(
  filters?: DocumentHistoryFilters
): Promise<ActionResult<GeneratedDocumentWithRelations[]>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    let query = supabase
      .from('generated_documents')
      .select(`
        *,
        document_templates (
          id,
          template_name,
          template_code
        ),
        user_profiles (
          id,
          full_name
        )
      `)
      .order('generated_at', { ascending: false })

    // Apply filters
    if (filters?.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }

    if (filters?.entity_id) {
      query = query.eq('entity_id', filters.entity_id)
    }

    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type)
    }

    if (filters?.from_date) {
      query = query.gte('generated_at', filters.from_date)
    }

    if (filters?.to_date) {
      query = query.lte('generated_at', filters.to_date)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('Error fetching generation history:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: (documents || []).map(mapDbRecordToGeneratedDocumentWithRelations),
    }
  } catch (error) {
    console.error('Error in getGenerationHistory:', error)
    return { success: false, error: 'Failed to fetch generation history' }
  }
}

/**
 * Gets a single generated document by ID
 * 
 * @param id - The document ID
 * @returns ActionResult with document or error
 */
export async function getGeneratedDocument(
  id: string
): Promise<ActionResult<GeneratedDocumentWithRelations>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    const { data: document, error } = await supabase
      .from('generated_documents')
      .select(`
        *,
        document_templates (
          id,
          template_name,
          template_code
        ),
        user_profiles (
          id,
          full_name
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Document not found' }
      }
      console.error('Error fetching generated document:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      data: mapDbRecordToGeneratedDocumentWithRelations(document),
    }
  } catch (error) {
    console.error('Error in getGeneratedDocument:', error)
    return { success: false, error: 'Failed to fetch document' }
  }
}

/**
 * Maps database record to GeneratedDocumentWithRelations type
 */
function mapDbRecordToGeneratedDocumentWithRelations(
  record: Record<string, unknown>
): GeneratedDocumentWithRelations {
  return {
    ...mapDbRecordToGeneratedDocument(record),
    document_templates: record.document_templates as Pick<DocumentTemplate, 'id' | 'template_name' | 'template_code'> | null,
    user_profiles: record.user_profiles as { id: string; full_name: string } | null,
  }
}

/**
 * Validates that all required data is present for document generation
 * 
 * @param variables - The variable context to validate
 * @param documentType - The type of document being generated
 * @returns Validation result with errors if any
 */
export function validateDocumentData(
  variables: VariableContext,
  documentType: DocumentType
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  switch (documentType) {
    case 'invoice':
      if (!variables.invoice_number) errors.push('invoice_number is required')
      if (!variables.customer_name) errors.push('customer_name is required')
      break
    case 'quotation':
      if (!variables.quotation_number) errors.push('quotation_number is required')
      if (!variables.customer_name) errors.push('customer_name is required')
      break
    case 'delivery_note':
      if (!variables.jo_number && !variables.dn_number) errors.push('jo_number or dn_number is required')
      break
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}


// ============================================================================
// DELIVERY NOTE DOCUMENT GENERATION
// Requirements: 7.1, 7.2, 7.3, 7.5
// ============================================================================

/**
 * Job order data structure from database with relations for delivery notes
 * Requirements: 7.1, 7.2, 7.3
 */
interface JobOrderData {
  id: string
  jo_number: string
  pjo_id: string | null
  customer_id: string | null
  status: string | null
  delivery_date: string | null
  origin: string | null
  destination: string | null
  cargo_description: string | null
  cargo_quantity: number | null
  cargo_weight_tons: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
  // Relations
  proforma_job_orders: {
    id: string
    pjo_number: string
    origin: string | null
    destination: string | null
    commodity: string | null
  } | null
  customers: {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
  } | null
}

/**
 * Delivery note item structure
 * Requirements: 7.3
 */
export interface DeliveryNoteItem {
  description: string
  quantity: number
  condition: string
  unit?: string
  weight_tons?: number
}

/**
 * Delivery note variables for template processing
 * Requirements: 7.1, 7.2, 7.3
 */
export interface DeliveryNoteTemplateVariables {
  dn_number: string
  jo_number: string
  pjo_number: string
  delivery_date: string
  origin: string
  destination: string
  customer_name: string
  customer_address: string
  customer_phone: string
  commodity: string
  items: DeliveryNoteItem[]
  total_quantity: number
  total_weight_tons: number
  notes: string
}

/**
 * Fetches job order data from database with PJO and customer relations for delivery notes
 * 
 * Requirements: 7.1, 7.2, 7.3
 * 
 * @param joId - The job order ID to fetch
 * @returns ActionResult with job order data or error
 */
export async function fetchDeliveryNoteData(
  joId: string
): Promise<ActionResult<{ jobOrder: JobOrderData; items: DeliveryNoteItem[] }>> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    // Fetch job order with PJO and customer relations
    const { data: jobOrder, error: joError } = await supabase
      .from('job_orders')
      .select(`
        *,
        proforma_job_orders (
          id,
          pjo_number,
          origin,
          destination,
          commodity
        ),
        customers (
          id,
          name,
          email,
          phone,
          address
        )
      `)
      .eq('id', joId)
      .single()

    if (joError) {
      if (joError.code === 'PGRST116') {
        return { success: false, error: 'Job order not found' }
      }
      console.error('Error fetching job order:', joError)
      return { success: false, error: joError.message }
    }

    if (!jobOrder) {
      return { success: false, error: 'Job order not found' }
    }

    // Build items array from job order cargo details
    const items: DeliveryNoteItem[] = []
    
    // Add main cargo item if cargo description exists
    if (jobOrder.cargo_description) {
      items.push({
        description: jobOrder.cargo_description,
        quantity: Number(jobOrder.cargo_quantity) || 1,
        condition: 'Good',
        unit: 'unit',
        weight_tons: jobOrder.cargo_weight_tons ? Number(jobOrder.cargo_weight_tons) : undefined,
      })
    }

    // If no cargo description but PJO has commodity, use that
    if (items.length === 0 && jobOrder.proforma_job_orders?.commodity) {
      items.push({
        description: jobOrder.proforma_job_orders.commodity,
        quantity: 1,
        condition: 'Good',
        unit: 'unit',
      })
    }

    return {
      success: true,
      data: {
        jobOrder: jobOrder as JobOrderData,
        items,
      },
    }
  } catch (error) {
    console.error('Error in fetchDeliveryNoteData:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch job order data',
    }
  }
}

/**
 * Builds variable context for delivery note template processing
 * 
 * Requirements: 7.1, 7.2, 7.3
 * 
 * @param jobOrder - Job order data with relations
 * @param items - Delivery note items
 * @returns DeliveryNoteTemplateVariables for template substitution
 */
export function buildDeliveryNoteVariables(
  jobOrder: JobOrderData,
  items: DeliveryNoteItem[]
): DeliveryNoteTemplateVariables {
  // Calculate totals from items
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalWeightTons = items.reduce((sum, item) => sum + (item.weight_tons || 0), 0)

  // Get origin and destination from job order or PJO
  const origin = jobOrder.origin || jobOrder.proforma_job_orders?.origin || ''
  const destination = jobOrder.destination || jobOrder.proforma_job_orders?.destination || ''

  // Generate DN number from JO number
  const dnNumber = `DN-${jobOrder.jo_number}`

  return {
    dn_number: dnNumber,
    jo_number: jobOrder.jo_number || '',
    pjo_number: jobOrder.proforma_job_orders?.pjo_number || '',
    delivery_date: formatDateForTemplate(jobOrder.delivery_date),
    origin,
    destination,
    customer_name: jobOrder.customers?.name || '',
    customer_address: jobOrder.customers?.address || '',
    customer_phone: jobOrder.customers?.phone || '',
    commodity: jobOrder.proforma_job_orders?.commodity || jobOrder.cargo_description || '',
    items,
    total_quantity: totalQuantity,
    total_weight_tons: totalWeightTons,
    notes: jobOrder.notes || '',
  }
}

/**
 * Validates delivery note data for document generation
 * 
 * Requirements: 7.1, 7.2, 7.3
 * 
 * @param jobOrder - Job order data to validate
 * @param items - Delivery note items
 * @returns Validation result with errors if any
 */
export function validateDeliveryNoteData(
  jobOrder: JobOrderData | null,
  items?: DeliveryNoteItem[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!jobOrder) {
    errors.push('Job order data is required')
    return { valid: false, errors }
  }

  // Required job order fields
  if (!jobOrder.jo_number) {
    errors.push('jo_number is required')
  }

  // Origin and destination validation (can come from JO or PJO)
  const hasOrigin = jobOrder.origin || jobOrder.proforma_job_orders?.origin
  const hasDestination = jobOrder.destination || jobOrder.proforma_job_orders?.destination

  if (!hasOrigin) {
    errors.push('origin is required')
  }

  if (!hasDestination) {
    errors.push('destination is required')
  }

  // Items validation - at least one item should exist for a complete delivery note
  if (!items || items.length === 0) {
    // Check if job order has cargo description as fallback
    if (!jobOrder.cargo_description && !jobOrder.proforma_job_orders?.commodity) {
      errors.push('At least one delivery item is required')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Generates a delivery note PDF document
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.5
 * 
 * @param joId - The job order ID to generate delivery note for
 * @param userId - The user ID generating the document
 * @param templateCode - Optional template code (defaults to 'DN_STANDARD')
 * @returns GenerationResult with document details or error
 */
export async function generateDeliveryNote(
  joId: string,
  userId: string,
  templateCode: string = 'DN_STANDARD'
): Promise<GenerationResult> {
  try {
    // 1. Fetch job order data
    const joResult = await fetchDeliveryNoteData(joId)
    if (!joResult.success || !joResult.data) {
      return {
        success: false,
        error: joResult.error || 'Failed to fetch job order data',
      }
    }

    const { jobOrder, items } = joResult.data

    // 2. Validate delivery note data
    const validation = validateDeliveryNoteData(jobOrder, items)
    if (!validation.valid) {
      return {
        success: false,
        error: `Delivery note validation failed: ${validation.errors.join(', ')}`,
      }
    }

    // 3. Use the generic generateDocument function with job_order entity
    return await generateDocument({
      template_code: templateCode,
      entity_type: 'job_order',
      entity_id: joId,
      user_id: userId,
    })
  } catch (error) {
    console.error('Error in generateDeliveryNote:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during delivery note generation',
    }
  }
}


// ============================================================================
// DOCUMENT HISTORY FILTERING UTILITIES
// Requirements: 9.1, 9.2, 9.3, 9.4
// ============================================================================

/**
 * Checks if a document matches the given entity filter
 * 
 * Requirements: 9.1
 * 
 * @param document - The document to check
 * @param entityType - The entity type to filter by (optional)
 * @param entityId - The entity ID to filter by (optional)
 * @returns true if document matches the filter
 */
export function matchesEntityFilter(
  document: GeneratedDocument | GeneratedDocumentWithRelations,
  entityType?: string,
  entityId?: string
): boolean {
  // If no filter specified, match all
  if (!entityType && !entityId) {
    return true
  }

  // If entity_type filter specified, check it matches
  if (entityType && document.entity_type !== entityType) {
    return false
  }

  // If entity_id filter specified, check it matches
  if (entityId && document.entity_id !== entityId) {
    return false
  }

  return true
}

/**
 * Checks if a document matches the given document type filter
 * 
 * Requirements: 9.2
 * 
 * @param document - The document to check
 * @param documentType - The document type to filter by (optional)
 * @returns true if document matches the filter
 */
export function matchesDocumentTypeFilter(
  document: GeneratedDocument | GeneratedDocumentWithRelations,
  documentType?: DocumentType
): boolean {
  // If no filter specified, match all
  if (!documentType) {
    return true
  }

  return document.document_type === documentType
}

/**
 * Checks if a document matches the given date range filter
 * 
 * Requirements: 9.3
 * 
 * @param document - The document to check
 * @param fromDate - The start date (inclusive, optional)
 * @param toDate - The end date (inclusive, optional)
 * @returns true if document matches the filter
 */
export function matchesDateRangeFilter(
  document: GeneratedDocument | GeneratedDocumentWithRelations,
  fromDate?: string,
  toDate?: string
): boolean {
  // If no filter specified, match all
  if (!fromDate && !toDate) {
    return true
  }

  const documentDate = new Date(document.generated_at)

  // Check from_date (inclusive)
  if (fromDate) {
    const from = new Date(fromDate)
    if (documentDate < from) {
      return false
    }
  }

  // Check to_date (inclusive)
  if (toDate) {
    const to = new Date(toDate)
    if (documentDate > to) {
      return false
    }
  }

  return true
}

/**
 * Checks if a document matches all the given filters
 * 
 * Requirements: 9.1, 9.2, 9.3
 * 
 * @param document - The document to check
 * @param filters - The filters to apply
 * @returns true if document matches ALL filters
 */
export function matchesAllFilters(
  document: GeneratedDocument | GeneratedDocumentWithRelations,
  filters: DocumentHistoryFilters
): boolean {
  return (
    matchesEntityFilter(document, filters.entity_type, filters.entity_id) &&
    matchesDocumentTypeFilter(document, filters.document_type) &&
    matchesDateRangeFilter(document, filters.from_date, filters.to_date)
  )
}

/**
 * Filters an array of documents based on the given filters
 * Pure function for testing without database access
 * 
 * Requirements: 9.1, 9.2, 9.3
 * 
 * @param documents - Array of documents to filter
 * @param filters - The filters to apply
 * @returns Filtered array of documents
 */
export function filterDocumentHistory<T extends GeneratedDocument | GeneratedDocumentWithRelations>(
  documents: T[],
  filters: DocumentHistoryFilters
): T[] {
  return documents.filter(doc => matchesAllFilters(doc, filters))
}

/**
 * Validates that a document with relations has complete history data
 * 
 * Requirements: 9.4
 * 
 * @param document - The document to validate
 * @returns Object with valid flag and missing fields
 */
export function validateHistoryDataCompleteness(
  document: GeneratedDocumentWithRelations
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = []

  // Check for template_name (from joined template)
  if (!document.document_templates?.template_name) {
    missingFields.push('template_name')
  }

  // Check for generated_at timestamp
  if (!document.generated_at) {
    missingFields.push('generated_at')
  }

  // Check for generated_by user information
  if (!document.generated_by) {
    missingFields.push('generated_by')
  }

  // Check for user_profiles full_name (enriched data)
  // Note: user_profiles can be null if user was deleted, but generated_by should exist
  if (document.user_profiles === undefined) {
    missingFields.push('user_profiles')
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}
