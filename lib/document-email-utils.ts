'use server'

/**
 * Document Email Utilities
 * Email sending functions for the n8n Document Generation module (v0.68)
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { createClient } from '@/lib/supabase/server'
import type { EmailRequest, EmailResult } from '@/types/document-generation'

// Type for Supabase client with any table access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = any

// ============================================================================
// Email Validation
// ============================================================================

/**
 * Validates an email address format
 * 
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  // Basic email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validates an array of email addresses
 * 
 * @param emails - Array of email addresses to validate
 * @returns Object with valid emails and invalid emails
 */
export function validateEmailAddresses(
  emails: string[]
): { valid: string[]; invalid: string[] } {
  const valid: string[] = []
  const invalid: string[] = []

  for (const email of emails) {
    if (isValidEmail(email)) {
      valid.push(email.trim())
    } else {
      invalid.push(email)
    }
  }

  return { valid, invalid }
}

// ============================================================================
// Email Request Validation
// ============================================================================

/**
 * Validates an email request before sending
 * 
 * Requirements: 8.1, 8.4
 * 
 * @param request - Email request to validate
 * @returns Validation result with errors if any
 */
export function validateEmailRequest(
  request: EmailRequest
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate recipients
  if (!request.to || !Array.isArray(request.to) || request.to.length === 0) {
    errors.push('At least one recipient email address is required')
  } else {
    const { invalid } = validateEmailAddresses(request.to)
    if (invalid.length > 0) {
      errors.push(`Invalid email addresses: ${invalid.join(', ')}`)
    }
  }

  // Validate subject
  if (!request.subject || request.subject.trim().length === 0) {
    errors.push('Email subject is required')
  }

  // Validate body
  if (!request.body || request.body.trim().length === 0) {
    errors.push('Email body is required')
  }

  // Validate attachment URL
  if (!request.attachment_url || request.attachment_url.trim().length === 0) {
    errors.push('Attachment URL is required')
  }

  // Validate attachment name
  if (!request.attachment_name || request.attachment_name.trim().length === 0) {
    errors.push('Attachment name is required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ============================================================================
// Email Sending
// ============================================================================

/**
 * Sends a document via email with PDF attachment
 * 
 * Requirements: 8.1, 8.3, 8.4
 * 
 * This function integrates with an email service (e.g., SendGrid, AWS SES, Resend)
 * to send the document as an attachment. In production, this would call the
 * actual email service API.
 * 
 * @param documentId - The generated document ID
 * @param emailRequest - Email request with recipients, subject, body, and attachment
 * @returns EmailResult with success status and sent timestamp or error
 */
export async function sendDocumentEmail(
  documentId: string,
  emailRequest: EmailRequest
): Promise<EmailResult> {
  try {
    // Validate the email request
    const validation = validateEmailRequest(emailRequest)
    if (!validation.valid) {
      return {
        success: false,
        error: `Email validation failed: ${validation.errors.join(', ')}`,
      }
    }

    // Get valid email addresses
    const { valid: validEmails } = validateEmailAddresses(emailRequest.to)
    
    if (validEmails.length === 0) {
      return {
        success: false,
        error: 'No valid email addresses provided',
      }
    }

    // In production, this would call the actual email service
    // For now, we simulate the email sending process
    const emailSendResult = await sendEmailViaService({
      to: validEmails,
      subject: emailRequest.subject,
      body: emailRequest.body,
      attachment_url: emailRequest.attachment_url,
      attachment_name: emailRequest.attachment_name,
    })

    if (!emailSendResult.success) {
      // Log the error for debugging
      console.error('Email send failed:', emailSendResult.error)
      return {
        success: false,
        error: emailSendResult.error || 'Failed to send email',
      }
    }

    // Update the document record with email status
    const sentAt = new Date().toISOString()
    const updateResult = await updateDocumentEmailStatus(
      documentId,
      validEmails.join(', '),
      sentAt
    )

    if (!updateResult.success) {
      // Email was sent but status update failed - still return success
      // but log the error
      console.error('Failed to update document email status:', updateResult.error)
    }

    return {
      success: true,
      sent_at: sentAt,
    }
  } catch (error) {
    console.error('Error in sendDocumentEmail:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending email',
    }
  }
}

/**
 * Internal function to send email via email service
 * 
 * In production, this would integrate with:
 * - SendGrid
 * - AWS SES
 * - Resend
 * - Or other email service providers
 * 
 * @param params - Email parameters
 * @returns Result of email send operation
 */
async function sendEmailViaService(params: {
  to: string[]
  subject: string
  body: string
  attachment_url: string
  attachment_name: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if email service is configured
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL
    const emailApiKey = process.env.EMAIL_API_KEY

    if (!emailServiceUrl || !emailApiKey) {
      // In development/testing, simulate successful send
      // In production, this should fail if not configured
      if (process.env.NODE_ENV === 'production') {
        return {
          success: false,
          error: 'Email service not configured',
        }
      }
      
      // Simulate successful send in non-production
      console.log('Email service not configured - simulating send:', {
        to: params.to,
        subject: params.subject,
        attachment: params.attachment_name,
      })
      return { success: true }
    }

    // Make API call to email service
    const response = await fetch(emailServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${emailApiKey}`,
      },
      body: JSON.stringify({
        to: params.to,
        subject: params.subject,
        html: params.body,
        attachments: [
          {
            filename: params.attachment_name,
            url: params.attachment_url,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Email service error: ${response.status} - ${errorText}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Email service error',
    }
  }
}

// ============================================================================
// Document Email Status Update
// ============================================================================

/**
 * Updates the generated document record with email send status
 * 
 * Requirements: 8.2
 * 
 * @param documentId - The generated document ID
 * @param email - The recipient email address(es)
 * @param sentAt - The timestamp when email was sent
 * @returns Result of the update operation
 */
export async function updateDocumentEmailStatus(
  documentId: string,
  email: string,
  sentAt: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    const { error } = await supabase
      .from('generated_documents')
      .update({
        sent_to_email: email,
        sent_at: sentAt,
      })
      .eq('id', documentId)

    if (error) {
      console.error('Error updating document email status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateDocumentEmailStatus:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update email status',
    }
  }
}

// ============================================================================
// Multi-Recipient Support
// ============================================================================

/**
 * Sends a document to multiple recipients
 * 
 * Requirements: 8.4
 * 
 * @param documentId - The generated document ID
 * @param recipients - Array of email addresses
 * @param subject - Email subject
 * @param body - Email body (HTML)
 * @param attachmentUrl - URL of the PDF attachment
 * @param attachmentName - Name of the attachment file
 * @returns EmailResult with success status
 */
export async function sendDocumentToMultipleRecipients(
  documentId: string,
  recipients: string[],
  subject: string,
  body: string,
  attachmentUrl: string,
  attachmentName: string
): Promise<EmailResult> {
  // Validate and filter recipients
  const { valid, invalid } = validateEmailAddresses(recipients)

  if (valid.length === 0) {
    return {
      success: false,
      error: invalid.length > 0 
        ? `All email addresses are invalid: ${invalid.join(', ')}`
        : 'No email addresses provided',
    }
  }

  // Log warning for invalid addresses
  if (invalid.length > 0) {
    console.warn('Some email addresses were invalid and skipped:', invalid)
  }

  // Send to all valid recipients
  return sendDocumentEmail(documentId, {
    to: valid,
    subject,
    body,
    attachment_url: attachmentUrl,
    attachment_name: attachmentName,
  })
}

// ============================================================================
// Email Template Helpers
// ============================================================================

/**
 * Builds a default email subject for a document type
 * 
 * @param documentType - Type of document (invoice, quotation, delivery_note)
 * @param documentNumber - The document number
 * @returns Formatted email subject
 */
export function buildEmailSubject(
  documentType: string,
  documentNumber: string
): string {
  const typeLabels: Record<string, string> = {
    invoice: 'Invoice',
    quotation: 'Quotation',
    delivery_note: 'Delivery Note',
    contract: 'Contract',
    certificate: 'Certificate',
    report: 'Report',
    packing_list: 'Packing List',
  }

  const label = typeLabels[documentType] || 'Document'
  return `${label} ${documentNumber} - PT. Gama Intisamudera`
}

/**
 * Builds a default email body for a document
 * 
 * @param documentType - Type of document
 * @param documentNumber - The document number
 * @param customerName - Customer name (optional)
 * @returns HTML email body
 */
export function buildEmailBody(
  documentType: string,
  documentNumber: string,
  customerName?: string
): string {
  const typeLabels: Record<string, string> = {
    invoice: 'invoice',
    quotation: 'quotation',
    delivery_note: 'delivery note',
    contract: 'contract',
    certificate: 'certificate',
    report: 'report',
    packing_list: 'packing list',
  }

  const label = typeLabels[documentType] || 'document'
  const greeting = customerName ? `Dear ${customerName},` : 'Dear Customer,'

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Please find attached the ${label} <strong>${documentNumber}</strong> for your reference.</p>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <br/>
      <p>Best regards,</p>
      <p><strong>PT. Gama Intisamudera</strong></p>
      <p style="font-size: 12px; color: #666;">
        Heavy-Haul Logistics Solutions<br/>
        Email: info@gama-group.co<br/>
        Tel: +62 21 1234567
      </p>
    </div>
  `
}

// ============================================================================
// Get Document for Email
// ============================================================================

/**
 * Fetches a generated document by ID for email sending
 * 
 * @param documentId - The generated document ID
 * @returns Document data or error
 */
export async function getDocumentForEmail(
  documentId: string
): Promise<{
  success: boolean
  data?: {
    id: string
    document_type: string
    document_number: string | null
    file_url: string
    file_name: string
    entity_type: string
    entity_id: string
  }
  error?: string
}> {
  try {
    const supabase = await createClient() as SupabaseClientAny

    const { data: document, error } = await supabase
      .from('generated_documents')
      .select('id, document_type, document_number, file_url, file_name, entity_type, entity_id')
      .eq('id', documentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Document not found' }
      }
      return { success: false, error: error.message }
    }

    return { success: true, data: document }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch document',
    }
  }
}
