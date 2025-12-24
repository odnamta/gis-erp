/**
 * Document Generation Types
 * Types for the n8n Document Generation module (v0.68)
 * Supports automated PDF document creation for invoices, quotations, delivery notes, etc.
 */

import { Tables } from './database'

// Document type enum - supported document types for generation
export type DocumentType = 
  | 'invoice' 
  | 'quotation' 
  | 'contract' 
  | 'certificate' 
  | 'report' 
  | 'packing_list' 
  | 'delivery_note'

// Valid document types array for validation
export const VALID_DOCUMENT_TYPES: DocumentType[] = [
  'invoice',
  'quotation',
  'contract',
  'certificate',
  'report',
  'packing_list',
  'delivery_note'
]

// Page size options for PDF generation
export type PageSize = 'A4' | 'Letter' | 'Legal'

// Valid page sizes array for validation
export const VALID_PAGE_SIZES: PageSize[] = ['A4', 'Letter', 'Legal']

// Page orientation options
export type PageOrientation = 'portrait' | 'landscape'

// Valid orientations array for validation
export const VALID_ORIENTATIONS: PageOrientation[] = ['portrait', 'landscape']

// Margin settings for PDF pages (in mm)
export interface MarginSettings {
  top: number
  right: number
  bottom: number
  left: number
}

// Default margin settings
export const DEFAULT_MARGINS: MarginSettings = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20
}

// Document template interface
export interface DocumentTemplate {
  id: string
  template_code: string
  template_name: string
  document_type: DocumentType
  html_template: string
  css_styles: string | null
  page_size: PageSize
  orientation: PageOrientation
  margins: MarginSettings
  header_html: string | null
  footer_html: string | null
  include_letterhead: boolean
  available_variables: string[]
  is_active: boolean
  created_at: string
}

// Template creation input (without auto-generated fields)
export interface CreateTemplateInput {
  template_code: string
  template_name: string
  document_type: DocumentType
  html_template: string
  css_styles?: string | null
  page_size?: PageSize
  orientation?: PageOrientation
  margins?: MarginSettings
  header_html?: string | null
  footer_html?: string | null
  include_letterhead?: boolean
  available_variables?: string[]
  is_active?: boolean
}

// Template update input (all fields optional except id)
export interface UpdateTemplateInput {
  template_code?: string
  template_name?: string
  document_type?: DocumentType
  html_template?: string
  css_styles?: string | null
  page_size?: PageSize
  orientation?: PageOrientation
  margins?: MarginSettings
  header_html?: string | null
  footer_html?: string | null
  include_letterhead?: boolean
  available_variables?: string[]
  is_active?: boolean
}

// Template filter options for listing
export interface TemplateFilters {
  document_type?: DocumentType
  is_active?: boolean
}

// Template validation result
export interface TemplateValidationResult {
  valid: boolean
  errors: string[]
}

// Variable context for template processing
export interface VariableContext {
  [key: string]: string | number | boolean | null | VariableContext | VariableContext[]
}

// Processed template result
export interface ProcessedTemplate {
  html: string
  variables_used: string[]
}

// PDF conversion options
export interface PDFOptions {
  page_size: PageSize
  orientation: PageOrientation
  margins: MarginSettings
  header_html?: string
  footer_html?: string
}

// PDF options validation result
export interface PDFOptionsValidationResult {
  valid: boolean
  errors: string[]
}

// PDF conversion result
export interface PDFResult {
  success: boolean
  pdf_buffer?: Buffer
  error?: string
}

// HTML2PDF API request format
export interface HTML2PDFRequest {
  html: string
  options: {
    format: string
    landscape: boolean
    margin: {
      top: string
      right: string
      bottom: string
      left: string
    }
    displayHeaderFooter: boolean
    headerTemplate?: string
    footerTemplate?: string
  }
}

// HTML2PDF API response format
export interface HTML2PDFResponse {
  success: boolean
  pdf?: string // Base64 encoded PDF
  error?: string
}

// Storage upload result
export interface UploadResult {
  success: boolean
  file_url?: string
  file_name?: string
  file_size_kb?: number
  error?: string
}

// Storage path components
export interface StoragePath {
  bucket: string
  path: string
  filename: string
}

// Generated document record
export interface GeneratedDocument {
  id: string
  template_id: string
  document_type: DocumentType
  document_number: string | null
  entity_type: string
  entity_id: string
  file_url: string
  file_name: string
  file_size_kb: number
  generated_at: string
  generated_by: string
  variables_data: VariableContext
  sent_to_email: string | null
  sent_at: string | null
  created_at: string
}

// Document generation request
export interface GenerationRequest {
  template_code: string
  entity_type: string
  entity_id: string
  user_id: string
}

// Document generation result
export interface GenerationResult {
  success: boolean
  document?: GeneratedDocument
  file_url?: string
  error?: string
}

// Email request for document delivery
export interface EmailRequest {
  to: string[]
  subject: string
  body: string
  attachment_url: string
  attachment_name: string
}

// Email send result
export interface EmailResult {
  success: boolean
  sent_at?: string
  error?: string
}

// Document history filters
export interface DocumentHistoryFilters {
  entity_type?: string
  entity_id?: string
  document_type?: DocumentType
  from_date?: string
  to_date?: string
}

// Generated document with relations (for history display)
export interface GeneratedDocumentWithRelations extends GeneratedDocument {
  document_templates?: Pick<DocumentTemplate, 'id' | 'template_name' | 'template_code'> | null
  user_profiles?: {
    id: string
    full_name: string
  } | null
}

// Invoice variables for template processing
export interface InvoiceVariables {
  invoice_number: string
  invoice_date: string
  due_date: string
  customer_name: string
  customer_address: string
  customer_email?: string
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    amount: number
  }>
  subtotal: number
  tax_amount: number
  total_amount: number
  notes?: string
}

// Quotation variables for template processing
export interface QuotationVariables {
  quotation_number: string
  quotation_date: string
  valid_until: string
  customer_name: string
  customer_address: string
  project_name?: string
  scope: string
  items: Array<{
    description: string
    amount: number
  }>
  total_amount: number
  terms: string
}

// Delivery note variables for template processing
export interface DeliveryNoteVariables {
  dn_number: string
  jo_number: string
  delivery_date: string
  origin: string
  destination: string
  items: Array<{
    description: string
    quantity: number
    condition: string
  }>
  receiver_name?: string
  notes?: string
}
